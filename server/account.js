import { json, fail, readBody } from "./http.js";
import { LEGAL_VERSION } from "../web/js/data/legal.js";

const identityFields = [
  "legalName",
  "contactEmail",
  "address",
  "country",
  "taxId",
];
const bankFields = [
  "bankName",
  "accountHolder",
  "accountType",
  "accountNumber",
  "currency",
  "instructions",
];
const limits = {
  legalName: 150,
  contactEmail: 254,
  address: 250,
  country: 80,
  taxId: 40,
  bankName: 100,
  accountHolder: 150,
  accountType: 20,
  accountNumber: 40,
  currency: 3,
  instructions: 600,
};
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const defaults = () =>
  Object.fromEntries(
    [...identityFields, ...bankFields].map((key) => [key, ""]),
  );

async function storeSettings(db) {
  const row = await db
    .prepare("SELECT config, updated_at FROM store_settings WHERE id = 'store'")
    .first();
  return {
    ...defaults(),
    ...(row ? JSON.parse(row.config) : {}),
    updatedAt: row?.updated_at || null,
  };
}
export async function publicStore(db) {
  const settings = await storeSettings(db);
  // Bank data stays private during prelaunch; no customer payment endpoint.
  return {
    identity: Object.fromEntries(
      identityFields.map((key) => [key, settings[key]]),
    ),
    paymentsActive: false,
  };
}
function isAdmin(request, env) {
  const email = request.headers
    .get("oai-authenticated-user-email")
    ?.trim()
    .toLowerCase();
  return Boolean(
    env.TRAZVA_ADMIN_EMAIL &&
      email &&
      email === env.TRAZVA_ADMIN_EMAIL.trim().toLowerCase(),
  );
}
export async function accountRoute(request, env, db, user) {
  const path = new URL(request.url).pathname;
  if (
    !["/api/account", "/api/account/export", "/api/admin/store"].includes(path)
  )
    return null;
  const method = request.method;
  const email = request.headers.get("oai-authenticated-user-email") || "";
  const admin = isAdmin(request, env);
  const profile = () =>
    db
      .prepare(
        "SELECT display_name, email, terms_version, privacy_version, accepted_at, created_at, updated_at FROM profiles WHERE user_id = ?",
      )
      .bind(user)
      .first();
  if (path === "/api/admin/store") {
    if (!admin)
      return fail("Solo la administración puede configurar la tienda.", 403);
    if (method === "GET") return json(await storeSettings(db));
    if (method !== "PUT") return fail("Método no permitido.", 405);
    const input = await readBody(request);
    if (!input || typeof input !== "object" || Array.isArray(input))
      return fail("Datos inválidos.", 400);
    const config = defaults();
    for (const key of Object.keys(config)) {
      if (
        typeof input[key] !== "string" ||
        input[key].trim().length > limits[key]
      )
        return fail("Revisa los datos de la tienda.", 400);
      config[key] = input[key].trim();
      if (/[\u0000-\u001f\u007f<>]/.test(config[key]))
        return fail("No se admite código ni caracteres de control.", 400);
    }
    if (config.contactEmail && !emailPattern.test(config.contactEmail))
      return fail("Revisa el correo de contacto.", 400);
    if (
      config.accountNumber &&
      !/^[A-Za-z0-9 -]{4,40}$/.test(config.accountNumber)
    )
      return fail("Revisa el número de cuenta.", 400);
    if (
      config.accountType &&
      !["Ahorros", "Corriente"].includes(config.accountType)
    )
      return fail("Selecciona el tipo de cuenta.", 400);
    if (config.currency && !["DOP", "USD", "EUR"].includes(config.currency))
      return fail("Selecciona la moneda.", 400);
    if (
      bankFields.some((key) => config[key]) &&
      bankFields.slice(0, 5).some((key) => !config[key])
    )
      return fail(
        "Completa banco, titular, tipo, número y moneda, o deja todos los datos bancarios vacíos.",
        400,
      );
    await db
      .prepare(
        "INSERT INTO store_settings (id, config, updated_at) VALUES ('store', ?, ?) ON CONFLICT(id) DO UPDATE SET config = excluded.config, updated_at = excluded.updated_at",
      )
      .bind(JSON.stringify(config), new Date().toISOString())
      .run();
    return json({ saved: true });
  }
  if (path === "/api/account/export") {
    if (method !== "GET") return fail("Método no permitido.", 405);
    const rows = await db.batch([
      db
        .prepare(
          "SELECT product_id, created_at FROM selections WHERE user_id = ?",
        )
        .bind(user),
      db
        .prepare(
          "SELECT id, name, email, subject, message, created_at FROM requests WHERE user_id = ?",
        )
        .bind(user),
    ]);
    return json({
      exportedAt: new Date().toISOString(),
      profile: await profile(),
      selections: rows[0].results,
      requests: rows[1].results,
    });
  }
  if (method === "GET")
    return json({
      identity: { email },
      profile: await profile(),
      admin,
      legalVersion: LEGAL_VERSION,
    });
  if (method === "PUT") {
    const input = await readBody(request);
    if (
      !input ||
      typeof input.name !== "string" ||
      input.name.trim().length < 2 ||
      input.name.trim().length > 100 ||
      /[<>\u0000-\u001f]/.test(input.name)
    )
      return fail("Escribe un nombre de 2 a 100 caracteres.", 400);
    if (!email || !emailPattern.test(email))
      return fail("Vuelve a iniciar sesión para verificar tu correo.", 401);
    const existing = await profile();
    if (
      (!existing ||
        existing.terms_version !== LEGAL_VERSION ||
        existing.privacy_version !== LEGAL_VERSION) &&
      (input.acceptTerms !== true ||
        input.privacyRead !== true ||
        input.legalVersion !== LEGAL_VERSION)
    )
      return fail(
        "Lee los términos y la privacidad y confirma la versión actual.",
        400,
      );
    const now = new Date().toISOString();
    const acceptedAt =
      existing?.terms_version === LEGAL_VERSION &&
      existing?.privacy_version === LEGAL_VERSION
        ? existing.accepted_at
        : now;
    await db
      .prepare(
        "INSERT INTO profiles (user_id, display_name, email, terms_version, privacy_version, accepted_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET display_name = excluded.display_name, email = excluded.email, terms_version = excluded.terms_version, privacy_version = excluded.privacy_version, accepted_at = excluded.accepted_at, updated_at = excluded.updated_at",
      )
      .bind(
        user,
        input.name.trim(),
        email,
        LEGAL_VERSION,
        LEGAL_VERSION,
        acceptedAt,
        now,
        now,
      )
      .run();
    return json(
      { saved: true, profile: await profile() },
      existing ? 200 : 201,
    );
  }
  if (method === "DELETE") {
    const input = await readBody(request);
    if (input?.confirmation !== "ELIMINAR")
      return fail("Escribe ELIMINAR para confirmar.", 400);
    await db.batch([
      db.prepare("DELETE FROM selections WHERE user_id = ?").bind(user),
      db.prepare("DELETE FROM requests WHERE user_id = ?").bind(user),
      db.prepare("DELETE FROM profiles WHERE user_id = ?").bind(user),
    ]);
    return json({ deleted: true });
  }
  return fail("Método no permitido.", 405);
}
