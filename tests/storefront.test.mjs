import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

async function page(t, file, query = "") {
  const dom = new JSDOM(await readFile("web/" + file, "utf8"), {
    url: "https://trazva.test/" + file + query,
    pretendToBeVisual: true,
  });
  const w = dom.window;
  for (const key of [
    "window",
    "document",
    "location",
    "history",
    "localStorage",
    "FormData",
  ])
    globalThis[key] = key === "window" ? w : w[key];
  globalThis.matchMedia = () => ({ matches: true, addEventListener() {} });
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({ selections: [{ product_id: 207 }], requests: [] });
  t.after(() => {
    w.close();
    globalThis.fetch = previousFetch;
  });
  return w;
}
const ids = () =>
  [
    ...document.querySelectorAll(
      "#catalogGrid .product-info h3 [data-product]",
    ),
  ].map((e) => Number(e.dataset.product));

test("Catalog chips remove one constraint, preserve the rest and retain models for unchanged results", async (t) => {
  const w = await page(
    t,
    "showroom.html",
    "?category=Running&brand=adidas&use=speed&compare=207,208",
  );
  const { initCatalog, renderCatalog } = await import(
    "../web/js/features/catalog.js"
  );
  initCatalog();
  assert.deepEqual(ids(), [207]);
  assert.equal(document.querySelectorAll("#activeFilters button").length, 3);
  const original = document.querySelector("#catalogGrid .product-card");
  document.querySelector("#searchInput").value = "boston";
  renderCatalog();
  assert.equal(document.querySelector("#catalogGrid .product-card"), original);
  document.querySelector('[data-remove-filter="brand"]').click();
  assert.equal(new URL(location.href).searchParams.get("brand"), null);
  assert.equal(new URL(location.href).searchParams.get("use"), "speed");
  assert.equal(new URL(location.href).searchParams.get("compare"), "207,208");
  document.querySelector("#searchInput").value = "no existe ese par";
  document
    .querySelector("#searchInput")
    .dispatchEvent(
      new w.KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
  assert.equal(ids().length, 0);
  document.querySelector("#resetFilters").click();
  assert.equal(ids().length, 12);
  assert.equal(document.querySelector("#activeFilters").hidden, true);
  assert.equal(new URL(location.href).searchParams.get("compare"), "207,208");
});

test("Editorial selection switches to running models, synchronizes saved state and retains keyboard focus", async (t) => {
  await page(t, "index.html");
  const { initEditorial } = await import("../web/js/features/editorial.js");
  initEditorial();
  const control = document.querySelector('[data-edit="running"]');
  control.focus();
  control.click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(document.activeElement, control);
  assert.equal(control.getAttribute("aria-pressed"), "true");
  assert.equal(
    document.querySelectorAll("#featuredGrid [data-model-preview]").length,
    3,
  );
  assert.equal(
    document.querySelectorAll("#featuredGrid .running-product-card").length,
    3,
  );
  assert.equal(
    document
      .querySelector('#featuredGrid [data-save-run="207"]')
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    document.querySelectorAll("#featuredGrid img, #featuredGrid button iframe")
      .length,
    0,
  );
  assert.ok(
    document.querySelector("#editLink").href.includes("category=Running"),
  );
  document.querySelector('[data-edit="character"]').click();
  assert.equal(
    document.querySelectorAll("#featuredGrid .product-card").length,
    3,
  );
  assert.equal(
    document.querySelectorAll("#featuredGrid .running-product-card").length,
    0,
  );
});

test("Finder shows multiple matching pairs and carries the chosen training into collection filters", async (t) => {
  const w = await page(t, "index.html");
  const { initFinder } = await import("../web/js/features/finder.js");
  initFinder();
  const form = document.querySelector("#finderForm");
  form.dispatchEvent(
    new w.Event("submit", { bubbles: true, cancelable: true }),
  );
  assert.equal(document.querySelectorAll(".finder-match").length, 3);
  form.querySelector('[value="Running"]').checked = true;
  document.querySelector("#finderGoal").value = "speed";
  form.dispatchEvent(new w.Event("input", { bubbles: true }));
  assert.equal(document.querySelector("#finderBudget").disabled, true);
  form.dispatchEvent(
    new w.Event("submit", { bubbles: true, cancelable: true }),
  );
  const href = new URL(document.querySelector(".finder-more").href);
  assert.equal(href.searchParams.get("category"), "Running");
  assert.equal(href.searchParams.get("use"), "speed");
  assert.equal(document.activeElement.id, "finderResult");
});
