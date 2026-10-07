import { database } from "./db.js";
import { runningProducts } from "../web/js/data/running.js";
const ids = new Set(runningProducts.map((p) => p.id));
const json = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
const fail = (message, status) => json({ error: message }, status);
async function readBody(request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new Error("JSON_REQUIRED");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_BODY");
  let bytes = 0,
    chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 12000) {
      await reader.cancel();
      throw new Error("BODY_TOO_LARGE");
    }
    chunks.push(value);
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(body));
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    // These headers are supplied by the private Sites authentication boundary.
    const user = request.headers.get("oai-authenticated-user-id");
    if (!user) return fail("Inicia sesión para abrir tu estudio.", 401);
    const mutation = !["GET", "HEAD"].includes(request.method);
    if (mutation && request.headers.get("origin") !== url.origin)
      return fail("Origen no permitido.", 403);
    try {
      const db = database(env);
      if (url.pathname === "/api/studio" && request.method === "GET") {
        const results = await db.batch([
          db
            .prepare(
              "SELECT product_id, created_at FROM selections WHERE user_id = ? ORDER BY created_at DESC",
            )
            .bind(user),
          db
            .prepare(
              "SELECT id, name, email, subject, message, created_at FROM requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
            )
            .bind(user),
        ]);
        return json({ selections: results[0].results, requests: results[1].results });
      }
      const selection = url.pathname.match(/^\/api\/selections\/(\d+)$/);
      if (selection && ["PUT", "DELETE"].includes(request.method)) {
        const id = Number(selection[1]);
        if (!ids.has(id)) return fail("Ese par no existe.", 404);
        if (request.method === "PUT")
          await db
            .prepare(
              "INSERT INTO selections (user_id, product_id, created_at) VALUES (?, ?, ?) ON CONFLICT (user_id, product_id) DO NOTHING",
            )
            .bind(user, id, new Date().toISOString())
            .run();
        else
          await db
            .prepare("DELETE FROM selections WHERE user_id = ? AND product_id = ?")
            .bind(user, id)
            .run();
        return json({ saved: request.method === "PUT", productId: id });
      }
      if (url.pathname === "/api/requests" && request.method === "POST") {
        const input = await readBody(request);
        if (!input || Array.isArray(input) || typeof input !== "object")
          return fail("Revisa los campos.", 400);
        const fields = ["name", "email", "subject", "message"];
        if (!fields.every((key) => typeof input[key] === "string"))
          return fail("Completa todos los campos.", 400);
        const [name, email, subject, message] = fields.map((key) => input[key].trim());
        if (
          name.length < 2 ||
          name.length > 100 ||
          email.length > 254 ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
          subject.length < 2 ||
          subject.length > 120 ||
          message.length < 10 ||
          message.length > 2000
        )
          return fail("Revisa el nombre, correo y mensaje (10–2000 caracteres).", 400);
        if (typeof input.id !== "string" || !/^[0-9a-f-]{36}$/i.test(input.id))
          return fail("Referencia inválida.", 400);
        const existing = await db
          .prepare("SELECT id FROM requests WHERE id = ? AND user_id = ?")
          .bind(input.id, user)
          .first();
        if (existing) return json({ id: existing.id, saved: true });
        const count = await db
          .prepare(
            "SELECT COUNT(*) AS total FROM requests WHERE user_id = ? AND created_at >= ?",
          )
          .bind(user, new Date(Date.now() - 86400000).toISOString())
          .first();
        if (count.total >= 10)
          return fail(
            "Puedes guardar hasta 10 consultas al día. Tus datos siguen en el formulario.",
            429,
          );
        await db
          .prepare(
            "INSERT INTO requests (id,user_id,name,email,subject,message,created_at) VALUES (?,?,?,?,?,?,?)",
          )
          .bind(input.id, user, name, email, subject, message, new Date().toISOString())
          .run();
        return json({ id: input.id, saved: true }, 201);
      }
      const record = url.pathname.match(/^\/api\/requests\/([0-9a-f-]{36})$/i);
      if (record && request.method === "DELETE") {
        await db
          .prepare("DELETE FROM requests WHERE id = ? AND user_id = ?")
          .bind(record[1], user)
          .run();
        return json({ deleted: true });
      }
      return fail("Ruta no disponible.", 404);
    } catch (error) {
      if (
        error instanceof SyntaxError ||
        ["JSON_REQUIRED", "INVALID_BODY", "BODY_TOO_LARGE"].includes(error.message)
      )
        return fail("El formulario no tiene un formato válido.", 400);
      console.error("TRAZVA API unavailable", error.message);
      return fail(
        "No pudimos guardar los cambios. Conservamos tu selección; inténtalo de nuevo.",
        503,
      );
    }
  },
};
