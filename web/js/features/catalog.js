import { selectProducts } from "./catalog-query.js";
import { modelPreview } from "./model-preview.js";
import { runningCard } from "./running.js";
// TRAZVA — features / catalog
import { esc, money, icon, $, $$ } from "../core/dom.js";
import { getFavorites, write, keys } from "../state/store.js";
import { animateFavorite } from "../core/motion.js";
import { toast } from "../ui/feedback.js";
import { products } from "../data/catalog.js";

export function card(p, index = 0) {
  if (p.running) return runningCard(p);
  const on = getFavorites().includes(p.id);
  return `<article class="product-card" style="--card-order:${index % 6}"><div class="product-image" style="background:${p.bg}"><button class="product-open" data-product="${p.id}" aria-label="Ver ${esc(p.name)}, ${money(p.price)}">${modelPreview(p)}<span class="product-tag">${p.tag}</span><span class="quick-view">Ver detalles <span aria-hidden="true">↗</span></span></button><button class="favorite-button" data-favorite="${p.id}" aria-label="${on ? "Quitar de" : "Añadir a"} favoritos: ${esc(p.name)}" aria-pressed="${on}">${icon("heart")}</button></div><div class="product-info"><div class="product-meta"><span>${p.brand.toUpperCase()}</span><span>${p.category.toUpperCase()}</span></div><div class="product-title-row"><h3><button data-product="${p.id}">${p.name}</button></h3><span class="product-price">${money(p.price)}<small>USD · demo</small></span></div><p class="product-color"><span class="color-dot" style="background:${p.hex}"></span>${p.color}</p></div></article>`;
}

export function toggleFavorite(id) {
  let list = getFavorites();
  const on = !list.includes(id);
  list = on ? [...list, id] : list.filter((x) => x !== id);
  write(keys.favorites, list);
  syncFavorites();
  if ($("#favToggle")?.checked) {
    const hadFocus = document.activeElement?.matches("[data-favorite]");
    renderCatalog();
    if (hadFocus)
      (
        $("#catalogGrid [data-favorite]") ||
        $("#resetFilters") ||
        $("#favToggle")
      ).focus();
  }
  animateFavorite(id);
  toast(on ? "Guardado en tus favoritos." : "Eliminado de tus favoritos.");
}

export function syncFavorites() {
  const f = getFavorites();
  $$("[data-favorite]").forEach((b) => {
    const p = products.find((p) => p.id === +b.dataset.favorite);
    if (!p) return;
    const on = f.includes(p.id);
    b.setAttribute("aria-pressed", String(on));
    b.setAttribute(
      "aria-label",
      `${on ? "Quitar de" : "Añadir a"} favoritos: ${p.name}`,
    );
  });
}

export const filters = { category: "all" };

export function saveCatalogURL() {
  const u = new URL(location.href);
  const values = {
    q: $("#searchInput").value.trim(),
    category: filters.category === "all" ? "" : filters.category,
    sort: $("#sortSelect").value === "default" ? "" : $("#sortSelect").value,
    fav: $("#favToggle").checked ? "1" : "",
    brand: $("#catalogBrand").value,
    use:
      filters.category === "Running" && $("#catalogUse").value !== "all"
        ? $("#catalogUse").value
        : "",
  };
  for (const [key, value] of Object.entries(values)) {
    if (value) u.searchParams.set(key, value);
    else u.searchParams.delete(key);
  }
  u.searchParams.delete("search");
  u.searchParams.delete("order");
  u.searchParams.delete("view");
  history.replaceState(null, "", u.pathname + u.search + u.hash);
}

export function renderCatalog() {
  const grid = $("#catalogGrid");
  if (!grid) return;
  saveCatalogURL();
  const isRunning = filters.category === "Running";
  $("#catalogUseField").hidden = !isRunning;
  $$("[data-running-sort]").forEach((option) => {
    option.hidden = !isRunning;
    option.disabled = !isRunning;
  });
  $("#collectionHint").textContent = isRunning
    ? "Compara hasta 3 pares. Pesos publicados con tallas de referencia distintas."
    : "Una colección. Distintas formas de moverte.";
  const list = selectProducts(products, {
    category: filters.category,
    query: $("#searchInput").value,
    brand: $("#catalogBrand").value,
    use: $("#catalogUse").value,
    favorites: $("#favToggle").checked ? getFavorites() : null,
    sort: $("#sortSelect").value,
  });
  $("#clearCatalog").hidden =
    filters.category === "all" &&
    !$("#searchInput").value.trim() &&
    !$("#catalogBrand").value &&
    !$("#favToggle").checked &&
    $("#sortSelect").value === "default";
  $("#resultCount").textContent =
    `${String(list.length).padStart(2, "0")} ${list.length === 1 ? "par seleccionado" : "pares seleccionados"}`;
  grid.innerHTML = list.length
    ? list.map(card).join("")
    : `<div class="empty-state">${icon("search")}<h2>${$("#favToggle").checked ? "Tu selección está por empezar." : "No encontramos ese par."}</h2><p>Prueba otra búsqueda o descubre la colección completa.</p><button class="button dark" id="resetFilters">Ver todos los pares <span>↗</span></button></div>`;
  $("#resetFilters")?.addEventListener("click", resetCatalog);
}

export function setCategory(category) {
  filters.category = category;
  if (
    category !== "Running" &&
    ["weight", "drop"].includes($("#sortSelect").value)
  )
    $("#sortSelect").value = "default";
  $$("[data-category]").forEach((b) => {
    const on = b.dataset.category === category;
    b.classList.toggle("selected", on);
    b.setAttribute("aria-pressed", String(on));
  });
  renderCatalog();
}

function resetCatalog() {
  $("#searchInput").value = "";
  $("#favToggle").checked = false;
  $("#sortSelect").value = "default";
  $("#catalogBrand").value = "";
  $("#catalogUse").value = "all";
  setCategory("all");
  $("#searchInput").focus();
}

export function initCatalog() {
  if (!$("#catalogGrid")) return;
  const params = new URLSearchParams(location.search);
  $("#favToggle").checked = params.get("fav") === "1";
  $("#searchInput").value = params.get("q") || "";
  $("#catalogBrand").innerHTML =
    '<option value="">Todas las marcas</option>' +
    [...new Set(products.map((p) => p.brand))]
      .sort()
      .map((brand) => `<option>${esc(brand)}</option>`)
      .join("");
  $("#catalogBrand").value = products.some(
    (p) => p.brand === params.get("brand"),
  )
    ? params.get("brand")
    : "";
  $("#catalogUse").value = ["daily", "long", "speed", "race"].includes(
    params.get("use"),
  )
    ? params.get("use")
    : "all";
  const sort = params.get("sort") || params.get("order");
  $("#sortSelect").value = ["asc", "desc", "name", "weight", "drop"].includes(
    sort,
  )
    ? sort
    : "default";
  const category = params.get("category");
  setCategory(
    ["Lifestyle", "Sport", "Skate", "Running"].includes(category)
      ? category
      : "all",
  );
  $("#searchInput").addEventListener("input", renderCatalog);
  $("#catalogBrand").addEventListener("change", renderCatalog);
  $("#catalogUse").addEventListener("change", renderCatalog);
  $("#clearCatalog").addEventListener("click", resetCatalog);
  $("#sortSelect").addEventListener("change", renderCatalog);
  $("#favToggle").addEventListener("change", renderCatalog);
  $$("[data-category]").forEach((b) =>
    b.addEventListener("click", () => setCategory(b.dataset.category)),
  );
  if (params.get("search") === "1") $("#searchInput").focus();
}
