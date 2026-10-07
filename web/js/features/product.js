import { openRunning } from "./running.js";
// TRAZVA — features / product
import { products } from "../data/catalog.js";
import { openDialog, closeDialog } from "../ui/dialog.js";
import { modelMedia, initProductViewer } from "./viewer.js";
import { money, icon, esc, $$, $ } from "../core/dom.js";
import { getFavorites, getCart, write, keys } from "../state/store.js";
import { updateCount } from "../ui/chrome.js";
import { renderCart } from "./cart.js";
import { animateBag } from "../core/motion.js";
import { toast } from "../ui/feedback.js";
import { syncFavorites } from "./catalog.js";

export function openProduct(id) {
  const p = products.find((p) => p.id === id);
  if (!p) return;
  if (p.running) return openRunning(p);
  let size = null;
  const d = openDialog(
    `<div class="product-dialog-layout">${modelMedia(p)}<div class="detail-copy">
    <p class="eyebrow">${p.brand.toUpperCase()} / ${p.category.toUpperCase()}</p><h2 id="dialogTitle">${p.name}</h2>
    <p class="detail-price">${money(p.price)} <small>USD · demo</small></p><p class="detail-desc">${p.desc}</p><div class="product-provenance"><span>${p.representation}</span>${p.officialUrl ? `<a href="${p.officialUrl}" target="_blank" rel="noopener noreferrer">${p.officialName} · ficha de la marca</a>` : ""}<p>Representación de referencia: el color y acabado pueden diferir de la edición comercial.</p></div>
    <div class="detail-line"><span>Color · ${p.color}</span><span class="color-dot" style="background:${p.hex}"></span></div>
    <div class="detail-line"><span>Talla · US hombre</span><button id="guideToggle" aria-expanded="false" aria-controls="sizeGuide">Guía de tallas ↗</button></div>
    <div class="sizes" role="group" aria-label="Elige tu talla">${p.sizes.map((s) => `<button data-size="${s}" aria-pressed="false" ${p.unavailable.includes(s) ? "disabled" : ""} aria-label="Talla ${s}${p.unavailable.includes(s) ? ", no disponible" : ""}">${s}</button>`).join("")}</div>
    <p class="size-status" id="sizeStatus" aria-live="polite">Selecciona tu talla para continuar.</p>
    <div id="sizeGuide" class="size-guide" hidden><p>Referencia orientativa US de hombre. Confirma la tabla de la marca antes de comprar; las equivalencias pueden variar.</p><table><caption class="sr-only">Equivalencias orientativas de talla US</caption><thead><tr><th>US</th><th>EU aprox.</th></tr></thead><tbody><tr><td>7 / 8 / 8.5</td><td>40 / 41 / 42</td></tr><tr><td>9 / 9.5 / 10</td><td>42.5 / 43 / 44</td></tr><tr><td>11</td><td>45</td></tr></tbody></table></div>
    <div class="detail-actions"><button id="addToCart" class="button dark">Añadir a mi bolsa <span>↗</span></button><button class="icon-button" data-favorite="${p.id}" aria-label="Añadir a favoritos" aria-pressed="${getFavorites().includes(p.id)}">${icon("heart")}</button></div>
    <button class="product-share" id="shareProduct" type="button">Compartir este par</button><p class="detail-disclaimer">Representación digital de referencia. Precios y disponibilidad de demostración; no se procesan compras reales.</p>
    <details class="model-credits"><summary>Créditos y origen</summary><p>“${esc(p.credit.title)}” · ${esc(p.credit.author)}. <a href="${p.credit.source}" target="_blank" rel="noopener noreferrer">Ver original ↗</a><br><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> · Geometría y texturas optimizadas para esta web.</p></details>
    </div></div>`,
    "product-dialog",
  );
  $$("[data-size]", d).forEach((b) =>
    b.addEventListener("click", () => {
      size = b.dataset.size;
      $$("[data-size]", d).forEach((el) =>
        el.setAttribute("aria-pressed", String(el === b)),
      );
      $("#sizeStatus", d).textContent = `Talla US ${size} seleccionada.`;
    }),
  );
  $("#guideToggle", d).addEventListener("click", () => {
    const g = $("#sizeGuide", d);
    g.hidden = !g.hidden;
    $("#guideToggle", d).setAttribute("aria-expanded", String(!g.hidden));
  });
  $("#addToCart", d).addEventListener("click", () => {
    if (!size) {
      $("#sizeStatus", d).textContent = "Primero elige una talla disponible.";
      $("[data-size]:not(:disabled)", d).focus();
      return;
    }
    const list = getCart(),
      row = list.find((r) => r.id === id && r.size === size);
    if (row && row.qty >= 10) {
      $("#sizeStatus", d).textContent = "Máximo 10 unidades por talla.";
      return;
    }
    if (row) row.qty++;
    else list.push({ id, size, qty: 1 });
    write(keys.cart, list);
    updateCount();
    closeDialog(d);
    renderCart();
    animateBag();
    toast(`${p.name}, talla ${size}, añadido a tu bolsa.`);
  });
  $("#shareProduct", d).addEventListener("click", async () => {
    const url = new URL("showroom.html", location.href);
    url.searchParams.set("product", p.id);
    try {
      await navigator.clipboard.writeText(url.href);
      toast("Enlace del par copiado.");
    } catch {
      const field = document.createElement("input");
      field.readOnly = true;
      field.value = url.href;
      field.setAttribute("aria-label", "Enlace para compartir");
      $("#shareProduct", d).after(field);
      field.focus();
      field.select();
    }
  });
  syncFavorites();
  initProductViewer(p, d);
}
