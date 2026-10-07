import { normalize } from "../core/dom.js";

// Shared catalogue rules keep filtering and ordering independent of the interface.
export function selectProducts(
  products,
  {
    category = "all",
    query = "",
    brand = "",
    use = "all",
    favorites = null,
    sort = "default",
  } = {},
) {
  const term = normalize(query.trim());
  const list = products.filter(
    (p) =>
      (p.model || p.embed) &&
      (category === "all" || p.category === category) &&
      (!brand || p.brand === brand) &&
      (category !== "Running" || use === "all" || p.uses?.includes(use)) &&
      normalize(
        [p.name, p.brand, p.color, p.foam].filter(Boolean).join(" "),
      ).includes(term) &&
      (!favorites || favorites.includes(p.id)),
  );
  const numeric =
    (field, direction = 1) =>
    (a, b) => {
      const av = a[field],
        bv = b[field];
      if (!Number.isFinite(av)) return Number.isFinite(bv) ? 1 : 0;
      if (!Number.isFinite(bv)) return -1;
      return direction * (av - bv);
    };
  if (sort === "asc") list.sort(numeric("price"));
  if (sort === "desc") list.sort(numeric("price", -1));
  if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "es"));
  if (sort === "weight" || sort === "drop") list.sort(numeric(sort));
  return list;
}
