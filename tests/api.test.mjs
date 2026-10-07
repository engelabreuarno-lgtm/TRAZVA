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
  });
  const db = await runtime.getD1Database("DB");
  const migration = await readFile("drizzle/0000_nervous_aqueduct.sql", "utf8");
  for (const statement of migration
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean))
    await db.prepare(statement).run();
});
after(async () => {
  await runtime?.dispose();
});
function call(path, method = "GET", body, user = "test-owner", headers = {}) {
  return runtime.dispatchFetch(origin + "/api" + path, {
    method,
    headers: {
      "oai-authenticated-user-id": user,
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
