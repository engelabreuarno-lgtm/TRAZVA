import { modelPreview } from "./model-preview.js";
import { $, esc, money } from "../core/dom.js";
import { products } from "../data/catalog.js";
import { motionEnabled } from "../core/motion.js";

export function initFinder() {
  const form = $("#finderForm");
  if (!form) return;
  const range = $("#finderBudget"),
    result = $("#finderResult");
  function clear() {
    const running = new FormData(form).get("style") === "Running";
    result.replaceChildren();
    range.hidden = running;
    range.disabled = running;
    $(".finder-budget").hidden = running;
    $("#finderGoalField").hidden = !running;
    $("#budgetLabel").textContent = `Hasta $${range.value}`;
  }
  form.addEventListener("input", clear);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form),
      style = data.get("style");
    const running = style === "Running";
    const matches = products.filter(
      (p) =>
        p.category === style &&
        (running ? p.uses.includes(data.get("goal")) : p.price <= +range.value),
    );
    result.innerHTML = matches.length
      ? `<p class="finder-caption">${matches.length === 1 ? "Una opción para empezar" : `${matches.length} opciones para explorar`}. Revisa los detalles y el ajuste antes de decidir.</p>${matches
          .slice(0, running ? 3 : 1)
          .map(
            (p) =>
              `<button class="finder-match" data-product="${p.id}" type="button">${modelPreview(p)}<span><small>${esc(p.brand)} / ${p.category}</small><strong>${esc(p.name)}</strong><b>${running ? `${p.weight} g · ${p.drop} mm drop` : `${money(p.price)} USD ilustrativos`} · Ver detalles ↗</b></span></button>`,
          )
          .join(
            "",
          )}<a class="text-link finder-more" href="showroom.html?category=${style}">Ver más opciones ↗</a>`
      : `<p class="finder-caption">${running ? "Todavía no tenemos un par para ese entrenamiento. Prueba otro uso o explora la colección." : "No hay pares de este estilo dentro del presupuesto. Prueba otro estilo o amplía el importe."}</p>`;
    result.focus();
    if (motionEnabled())
      result.animate(
        [
          { opacity: 0, transform: "translateY(10px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 350, easing: "ease-out" },
      );
  });
  clear();
}
