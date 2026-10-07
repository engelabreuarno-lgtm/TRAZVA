import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { products } from "../web/js/data/catalog.js";
import { selectProducts } from "../web/js/features/catalog-query.js";

test("One collection includes only pairs with an integrated model", () => {
  assert.equal(selectProducts(products).length, 12);
  assert.equal(selectProducts(products, { category: "Running" }).length, 4);
  assert(!products.some((p) => p.id >= 201 && p.id <= 206));
  for (const p of products.filter((p) => p.model)) {
    const glb = fs.readFileSync(new URL("../web/" + p.model, import.meta.url));
    assert.equal(glb.toString("ascii", 0, 4), "glTF");
    assert.equal(glb.readUInt32LE(8), glb.length);
  }
});
test("Running use, brand, search and favorites combine in the shared collection", () => {
  const result = selectProducts(products, {
    category: "Running",
    brand: "adidas",
    query: "bóston",
    use: "speed",
    favorites: [207],
  });
  assert.deepEqual(
    result.map((p) => p.id),
    [207],
  );
  assert.equal(
    selectProducts(products, { category: "Running", brand: "Nike" }).length,
    0,
  );
  assert.equal(selectProducts(products, { favorites: [] }).length, 0);
  assert.equal(selectProducts(products, { query: "FF BLAST" })[0].id, 210);
});
test("Unknown prices sort last in both directions; technical sorts keep numeric order", () => {
  for (const sort of ["asc", "desc"]) {
    const sorted = selectProducts(products, { sort });
    assert(sorted.slice(-4).every((p) => p.price === null));
    const values = sorted.slice(0, 8).map((p) => p.price);
    assert.deepEqual(
      values,
      [...values].sort((a, b) => (sort === "asc" ? a - b : b - a)),
    );
  }
  for (const sort of ["weight", "drop"]) {
    const values = selectProducts(products, { category: "Running", sort }).map(
      (p) => p[sort],
    );
    assert.deepEqual(
      values,
      [...values].sort((a, b) => a - b),
    );
  }
});
