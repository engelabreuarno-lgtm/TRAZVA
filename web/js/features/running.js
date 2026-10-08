import { getFavorites } from "../state/store.js";
import { attachExternalViewer } from "./external-viewer.js";
import { modelPreview } from "./model-preview.js";
import { runningProducts, runUses } from "../data/running.js";
import { $, $$, esc, icon } from "../core/dom.js";
import { openDialog } from "../ui/dialog.js";
import { toast } from "../ui/feedback.js";
import { studioAPI } from "./studio-api.js";

const find = (id) => runningProducts.find((p) => p.id === Number(id));
let selected = new Set(),
  loaded = false;
const params = new URLSearchParams(location.search);
let comparing = [
  ...new Set((params.get("compare") || "").split(",").map(Number).filter(find)),
].slice(0, 3);

function saveLabel(id) {
  return selected.has(id) ? "✓ En mi estudio" : "+ Mi estudio";
}
function syncSaved() {
  $$("[data-save-run]").forEach((b) => {
    const id = Number(b.dataset.saveRun);
    b.textContent = saveLabel(id);
    b.setAttribute("aria-pressed", String(selected.has(id)));
  });
}
export async function loadSelections() {
  const data = await studioAPI();
  selected = new Set(data.selections.map((p) => p.product_id));
  loaded = true;
  syncSaved();
  return data;
}
export function runningCard(p, index = 0) {
  if (!p.embed && !p.model) return "";
  const favorite = getFavorites().includes(p.id);
  return `<article class="product-card running-product-card" style="--card-order:${index % 6}">
    <div class="product-image" style="background:${p.bg}">${modelPreview(p, { external: true })}</div>
    <div class="product-info">
      <div class="product-meta"><span>${esc(p.brand.toUpperCase())}</span><span>RUNNING</span></div>
      <div class="product-title-row"><h3><button data-product="${p.id}">${esc(p.name)}</button></h3></div>
      <p class="product-color"><span class="color-dot" style="background:${p.hex}"></span>${esc(p.color)}</p>
      <p class="run-use">${p.uses.map((u) => runUses[u]).join(" · ")}</p>
      <div class="running-card-open"><button class="text-link" data-product="${p.id}">Ver detalles <span aria-hidden="true">↗</span></button><button class="favorite-button" data-favorite="${p.id}" aria-pressed="${favorite}" aria-label="${favorite ? "Quitar de" : "Añadir a"} favoritos: ${esc(p.name)}">${icon("heart")}</button></div>
      <div class="run-card-actions"><button data-compare="${p.id}" aria-pressed="${comparing.includes(p.id)}">${comparing.includes(p.id) ? "✓ Comparando" : "+ Comparar"}</button><button data-save-run="${p.id}" aria-pressed="${selected.has(p.id)}">${saveLabel(p.id)}</button></div>
    </div>
  </article>`;
}

function renderCompareBar() {
  let bar = $("#compareBar");
  if (!bar) {
    bar = document.createElement("aside");
    bar.id = "compareBar";
    bar.setAttribute("aria-label", "Pares para comparar");
    document.body.append(bar);
  }
  bar.hidden = !comparing.length;
  bar.innerHTML = `<div class="compare-picks">${comparing
    .map((id) => {
      const p = find(id);
      return `<button data-compare="${id}" aria-label="Quitar ${p.name} de la comparación"><small>${p.brand}</small><span>${p.name}</span><b>×</b></button>`;
    })
    .join(
      "",
    )}</div><button class="button dark" id="openCompare" ${comparing.length < 2 ? "disabled" : ""}>Comparar ${comparing.length}/3 <span>↗</span></button>`;
  $("#openCompare")?.addEventListener("click", showComparison);
  $$("[data-compare]").forEach((b) => {
    const on = comparing.includes(Number(b.dataset.compare));
    b.setAttribute("aria-pressed", String(on));
    if (!b.closest("#compareBar"))
      b.textContent = on ? "✓ Comparando" : "+ Comparar";
  });
  document.body.classList.toggle("has-compare", comparing.length > 0);
}
function updateURL() {
  const url = new URL(location.href);
  if (comparing.length) url.searchParams.set("compare", comparing.join(","));
  else url.searchParams.delete("compare");
  history.replaceState(null, "", url.pathname + url.search + url.hash);
}
export function showComparison() {
  if (comparing.length < 2) return;
  const list = comparing.map(find);
  const rows = [
    ["Peso de referencia", (p) => `${p.weight} g`],
    ["Talla del peso publicado", (p) => p.weightBasis],
    ["Drop", (p) => `${p.drop} mm`],
    ["Amortiguación", (p) => p.foam],
    ["Estructura", (p) => p.structure],
    ["Uso editorial", (p) => p.uses.map((u) => runUses[u]).join(" · ")],
  ];
  const d = openDialog(
    `<div class="comparison-content"><p class="eyebrow">DECIDE CON CRITERIO</p><h2 id="dialogTitle">Frente a frente.</h2><p>Pesos publicados por las marcas. Las tallas de referencia varían: no son mediciones equivalentes de laboratorio.</p><div class="comparison-scroll" tabindex="0" role="region" aria-label="Tabla comparativa, desplázate horizontalmente"><table><caption class="sr-only">Comparación de tenis de running</caption><thead><tr><th scope="col">El detalle</th>${list.map((p) => `<th scope="col"><small>${p.brand}</small>${p.name}</th>`).join("")}</tr></thead><tbody>${rows.map(([label, value]) => `<tr><th scope="row">${label}</th>${list.map((p) => `<td>${esc(value(p))}</td>`).join("")}</tr>`).join("")}<tr><th scope="row">Fuente</th>${list.map((p) => `<td><a href="${p.officialUrl}" target="_blank" rel="noopener noreferrer">Ficha de ${p.brand} ↗</a></td>`).join("")}</tr></tbody></table></div><button class="button dark" id="shareComparison">Copiar comparación ↗</button><p class="comparison-note">Ficha revisada el 1 de octubre de 2026. Selección independiente, sin inventario ni precios de venta confirmados.</p></div>`,
    "comparison-dialog",
  );
  $("#shareComparison", d).addEventListener("click", () =>
    copyURL("showroom.html", {
      category: "Running",
      compare: comparing.join(","),
    }),
  );
}
async function copyURL(page, values) {
  const url = new URL(page, location.href);
  for (const [k, v] of Object.entries(values)) url.searchParams.set(k, v);
  try {
    await navigator.clipboard.writeText(url.href);
    toast("Enlace copiado.");
  } catch {
    const input = document.createElement("input");
    input.value = url.href;
    input.readOnly = true;
    input.setAttribute("aria-label", "Enlace para compartir");
    ($("#activeDialog") || $("#contenido")).append(input);
    input.focus();
    input.select();
  }
}
export function openRunning(p) {
  if (!p.embed && !p.model) return;
  const d = openDialog(
    `<div class="running-detail"><section class="run-visual" aria-label="Modelo 3D de ${p.name}"><div class="run-media-header"><span>${p.brand}</span><span>VISTA DEL PRODUCTO</span></div><div id="runMedia"><div class="external-wait" aria-hidden="true"><span class="loading-ring"></span></div></div><button class="button dark run-load" id="loadRun3D">Preparando tu par…</button><p class="run-media-note"><a href="${p.credit.source}" target="_blank" rel="noopener noreferrer">Ver original en Sketchfab ↗</a></p></section><section class="run-detail-copy"><p class="eyebrow">${p.brand} / RUNNING</p><h2 id="dialogTitle">${p.name}</h2><div class="run-tags">${p.uses.map((u) => `<span>${runUses[u]}</span>`).join("")}</div><p>${p.desc}</p><dl class="run-specs"><div><dt>Peso de referencia</dt><dd>${p.weight}<small> g</small></dd></div><div><dt>Drop</dt><dd>${p.drop}<small> mm</small></dd></div><div><dt>Amortiguación</dt><dd class="spec-text">${p.foam}</dd></div><div><dt>Estructura</dt><dd class="spec-text">${p.structure}</dd></div></dl><p class="spec-context">${p.weightBasis}. El peso cambia según talla y versión; drop es la diferencia de altura entre talón y antepié.</p><div class="run-detail-actions"><button class="button dark" data-save-run="${p.id}" aria-pressed="${selected.has(p.id)}">${saveLabel(p.id)}</button><button class="button outline" data-compare="${p.id}" aria-pressed="${comparing.includes(p.id)}">${comparing.includes(p.id) ? "✓ Comparando" : "+ Comparar"}</button></div><a class="text-link" href="${p.officialUrl}" target="_blank" rel="noopener noreferrer">Ficha oficial de ${p.brand} ↗</a>${p.externalScanUrl ? `<a class="external-scan-link" href="${p.externalScanUrl}" target="_blank" rel="noopener noreferrer">Consultar escaneo 3D en RTINGS ↗<small>Servicio externo; puede requerir suscripción.</small></a>` : ""}<button class="product-share" id="shareRun">Compartir este par</button><p class="run-disclaimer">Selección editorial independiente. No representa stock disponible ni una oferta de venta. Consulta tallas y disponibilidad en la marca.</p>${p.credit ? `<details class="model-credits"><summary>Créditos y origen</summary><p>${esc(p.credit.title)} · ${esc(p.credit.author)}. Visor incorporado sin modificar. <a href="${p.credit.source}" target="_blank" rel="noopener noreferrer">Original ↗</a> · <a href="${p.credit.licenseUrl}" target="_blank" rel="noopener noreferrer">${esc(p.credit.license)}</a></p></details>` : ""}</section></div>`,
    "product-dialog running-dialog",
  );
  $("#shareRun", d).addEventListener("click", () =>
    copyURL("showroom.html", { category: "Running", product: p.id }),
  );
  attachExternalViewer(p, d);
  if (!loaded) loadSelections().catch(() => {});
}
export function initRunning() {
  renderCompareBar();
  document.addEventListener("click", async (e) => {
    const compare = e.target.closest("[data-compare]");
    if (compare) {
      const id = Number(compare.dataset.compare);
      if (!find(id)) return;
      if (comparing.includes(id)) comparing = comparing.filter((x) => x !== id);
      else if (comparing.length < 3) comparing.push(id);
      else {
        toast("Compara hasta tres pares. Quita uno para añadir otro.");
        return;
      }
      updateURL();
      renderCompareBar();
      return;
    }
    const save = e.target.closest("[data-save-run]");
    if (save) {
      const id = Number(save.dataset.saveRun);
      if (!find(id) || save.disabled) return;
      save.disabled = true;
      save.textContent = "Guardando…";
      try {
        if (!loaded) await loadSelections();
        const remove = selected.has(id);
        await studioAPI("/selections/" + id, {
          method: remove ? "DELETE" : "PUT",
        });
        if (remove) selected.delete(id);
        else selected.add(id);
        syncSaved();
        document.dispatchEvent(new Event("trazva:selection"));
        toast(
          remove
            ? "Par eliminado de tu estudio."
            : "Par guardado en tu estudio.",
        );
      } catch (error) {
        toast(error.message);
        save.textContent = "Reintentar guardado";
      } finally {
        save.disabled = false;
      }
    }
  });
  if (document.querySelector("[data-save-run]"))
    loadSelections().catch(() => {});
  if (
    document.querySelector("#catalogGrid") &&
    comparing.length > 1 &&
    !params.has("product")
  )
    showComparison();
}
