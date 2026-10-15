import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare } from "miniflare";
let runtime;
const origin = "https://trazva.test";
before(async () => {
  runtime = new Miniflare({
    modules: true,
    scriptPath: "dist/server/index.js",
    compatibilityDate: "2026-01-01",
    d1Databases: ["DB"],
    bindings: { TRAZVA_ADMIN_EMAIL: "test-owner@example.invalid" },
  });
  const db = await runtime.getD1Database("DB");
  const journal = JSON.parse(
    await readFile("drizzle/meta/_journal.json", "utf8"),
  );
  for (const entry of journal.entries) {
    const migration = await readFile(`drizzle/${entry.tag}.sql`, "utf8");
    for (const statement of migration
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean))
      await db.prepare(statement).run();
  }
});
after(async () => {
  await runtime?.dispose();
});
function call(path, method = "GET", body, user = "test-owner", headers = {}) {
  return runtime.dispatchFetch(origin + "/api" + path, {
    method,
    headers: {
      "oai-authenticated-user-id": user,
      "oai-authenticated-user-email": user ? `${user}@example.invalid` : "",
      origin,
      "content-type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
test("Authentication, origin and input validation protect writes", async () => {
  assert.equal((await call("/studio", "GET", undefined, "")).status, 401);
  assert.equal(
    (
      await call("/selections/207", "PUT", undefined, "test-owner", {
        origin: "https://unrelated.test",
      })
    ).status,
    403,
  );
  assert.equal((await call("/selections/999", "PUT")).status, 404);
  assert.equal((await call("/selections/201", "PUT")).status, 404);
  assert.equal((await call("/requests", "POST", { name: "x" })).status, 400);
  assert.equal(
    (
      await call("/requests", "POST", {
        id: crypto.randomUUID(),
        name: "Test",
        email: "invalid",
        subject: "Modelos",
        message: "Un mensaje suficientemente largo",
      })
    ).status,
    400,
  );
});
test("Selections persist, deduplicate and stay isolated per user", async () => {
  await call("/selections/207", "PUT");
  await call("/selections/207", "PUT");
  let data = await (await call("/studio")).json();
  assert.equal(
    data.selections.filter((row) => row.product_id === 207).length,
    1,
  );
  await call("/selections/207", "DELETE", undefined, "test-other");
  assert.equal(
    (await (await call("/studio", "GET", undefined, "test-other")).json())
      .selections.length,
    0,
  );
  assert.equal((await (await call("/studio")).json()).selections.length, 1);
  await call("/selections/207", "DELETE");
  assert.equal((await (await call("/studio")).json()).selections.length, 0);
});
test("Request retries do not duplicate records; users cannot delete another request", async () => {
  const body = {
    id: crypto.randomUUID(),
    name: "Test user",
    email: "qa@example.invalid",
    subject: "Tallas y modelos",
    message: "Consulta de prueba sobre mi siguiente par.",
  };
  assert.equal((await call("/requests", "POST", body)).status, 201);
  assert.equal((await call("/requests", "POST", body)).status, 200);
  let rows = (await (await call("/studio")).json()).requests;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].message, body.message);
  await call("/requests/" + body.id, "DELETE", undefined, "test-other");
  rows = (await (await call("/studio")).json()).requests;
  assert.equal(rows.length, 1);
  await call("/requests/" + body.id, "DELETE");
  assert.equal((await (await call("/studio")).json()).requests.length, 0);
});

test("Registration requires current terms; identity comes only from the signed-in account", async () => {
  assert.equal((await call("/account", "GET", undefined, "")).status, 401);
  assert.equal((await call("/account", "PUT", { name: "Engel" })).status, 400);
  const input = {
    name: "Cuenta de prueba",
    acceptTerms: true,
    privacyRead: true,
    legalVersion: "2026-10-15",
    email: "spoofed@example.invalid",
    user_id: "test-other",
  };
  assert.equal(
    (await call("/account", "PUT", { ...input, legalVersion: "old" })).status,
    400,
  );
  assert.equal((await call("/account", "PUT", input)).status, 201);
  const own = await (await call("/account")).json();
  assert.equal(own.profile.email, "test-owner@example.invalid");
  assert.equal(own.profile.display_name, input.name);
  assert.equal(own.profile.terms_version, "2026-10-15");
  assert.equal(
    (await (await call("/account", "GET", undefined, "test-other")).json())
      .profile,
    null,
  );
  assert.equal(
    (await call("/account", "PUT", { name: "<script>bad</script>" })).status,
    400,
  );
  assert.equal(
    (await call("/account", "PUT", { name: "Nombre actualizado" })).status,
    200,
  );
  assert.equal(
    (await (await call("/account")).json()).profile.accepted_at,
    own.profile.accepted_at,
  );
  assert.equal(
    (
      await call("/account", "PUT", { name: "Nombre" }, "test-owner", {
        origin: "https://other.test",
      })
    ).status,
    403,
  );
});

test("Bank settings are admin-only, validate input and never leak into public store or account export", async () => {
  const input = {
    legalName: "Empresa de prueba",
    contactEmail: "shop@example.invalid",
    address: "Dirección de prueba",
    country: "País de prueba",
    taxId: "",
    bankName: "BANCO DE PRUEBA",
    accountHolder: "TITULAR DE PRUEBA",
    accountType: "Ahorros",
    accountNumber: "TEST-12345678",
    currency: "DOP",
    instructions: "Datos ficticios exclusivamente para pruebas",
  };
  assert.equal((await call("/admin/store", "GET", undefined, "")).status, 401);
  assert.equal(
    (await call("/admin/store", "GET", undefined, "test-other")).status,
    403,
  );
  assert.equal(
    (await call("/admin/store", "PUT", input, "test-other")).status,
    403,
  );
  assert.equal(
    (await call("/admin/store", "PUT", { ...input, accountNumber: "" })).status,
    400,
  );
  assert.equal(
    (await call("/admin/store", "PUT", { ...input, currency: "BTC" })).status,
    400,
  );
  assert.equal(
    (await call("/admin/store", "PUT", { ...input, legalName: "<script>" }))
      .status,
    400,
  );
  assert.equal(
    (
      await call("/admin/store", "PUT", input, "test-owner", {
        origin: "https://other.test",
      })
    ).status,
    403,
  );
  assert.equal((await call("/admin/store", "PUT", input)).status, 200);
  const saved = await (await call("/admin/store")).json();
  assert.equal(saved.accountNumber, input.accountNumber);
  const publicData = await (await call("/store", "GET", undefined, "")).json();
  assert.equal(publicData.identity.legalName, input.legalName);
  assert.equal(publicData.paymentsActive, false);
  assert(!JSON.stringify(publicData).includes(input.accountNumber));
  assert(
    !JSON.stringify(await (await call("/account/export")).json()).includes(
      input.accountNumber,
    ),
  );
});

test("Export and confirmed deletion only affect the requesting user's profile, selections and requests", async () => {
  const input = {
    name: "Otra cuenta",
    acceptTerms: true,
    privacyRead: true,
    legalVersion: "2026-10-15",
  };
  await call("/account", "PUT", input, "test-other");
  await call("/selections/208", "PUT", undefined, "test-other");
  await call("/selections/207", "PUT");
  await call("/requests", "POST", {
    id: crypto.randomUUID(),
    name: "Prueba",
    email: "qa@example.invalid",
    subject: "Privacidad",
    message: "Consulta de prueba para exportar.",
  });
  const exported = await (await call("/account/export")).json();
  assert.equal(exported.profile.display_name, "Nombre actualizado");
  assert.equal(exported.selections.length, 1);
  assert.equal(exported.requests.length, 1);
  assert.equal((await call("/account", "DELETE", {})).status, 400);
  assert.equal(
    (await call("/account", "DELETE", { confirmation: "ELIMINAR" })).status,
    200,
  );
  const deleted = await (await call("/account/export")).json();
  assert.equal(deleted.profile, null);
  assert.equal(deleted.selections.length, 0);
  assert.equal(deleted.requests.length, 0);
  const other = await (
    await call("/account/export", "GET", undefined, "test-other")
  ).json();
  assert.equal(other.profile.display_name, input.name);
  assert.equal(other.selections.length, 1);
  assert.equal(
    (await (await call("/admin/store")).json()).accountNumber,
    "TEST-12345678",
  );
});
