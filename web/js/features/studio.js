import { $, esc } from "../core/dom.js";
import { runningProducts } from "../data/running.js";
import { runningCard, loadSelections } from "./running.js";
import { studioAPI } from "./studio-api.js";
import { toast } from "../ui/feedback.js";
export function initStudio() {
  const container = $("#studioContent");
  if (!container) return;
  let data;
  async function render() {
    try {
      data = await loadSelections();
      const list = data.selections
        .map((row) => runningProducts.find((p) => p.id === row.product_id))
        .filter(Boolean);
      $("#studioCount").textContent = String(list.length).padStart(2, "0");
      container.innerHTML = list.length
        ? `<div class="run-grid">${list.map(runningCard).join("")}</div>`
        : '<div class="studio-empty"><span aria-hidden="true">≋</span><h2>Tu rotación empieza con un par.</h2><p>Guarda los modelos que te interesan y vuelve a ellos desde tu cuenta.</p><a class="button dark" href="showroom.html?category=Running">Explorar la colección ↗</a></div>';
      $("#requestList").innerHTML = data.requests.length
        ? data.requests
            .map(
              (r) =>
                `<article class="request-card"><div><p class="eyebrow">CONSULTA GUARDADA · ${new Date(r.created_at).toLocaleDateString("es")}</p><h3>${esc(r.subject)}</h3></div><p>${esc(r.message)}</p><small>Referencia ${esc(r.id.slice(0, 8).toUpperCase())} · ${esc(r.email)}</small><button data-delete-request="${r.id}">Eliminar consulta</button></article>`,
            )
            .join("")
        : '<p class="muted">Aquí aparecerán las consultas que guardes desde Contacto. No se envían por correo.</p>';
      $("#exportStudio").disabled = !list.length;
    } catch (error) {
      container.innerHTML = `<div class="studio-empty"><h2>No pudimos abrir tu estudio.</h2><p>${esc(error.message)}</p><button class="button dark" id="retryStudio">Reintentar</button></div>`;
      $("#retryStudio").addEventListener("click", render);
    }
  }
  document.addEventListener("trazva:selection", render);
  $("#exportStudio").addEventListener("click", () => {
    if (!data) return;
    const list = data.selections
      .map((r) => runningProducts.find((p) => p.id === r.product_id))
      .filter(Boolean);
    const text =
      "MI ROTACIÓN / TRAZVA\n\n" +
      list
        .map(
          (p) =>
            `${p.brand} ${p.name}\n${p.weight} g · drop ${p.drop} mm · ${p.foam}\n${p.officialUrl}\n`,
        )
        .join("\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "TRAZVA-mi-rotacion.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $("#requestList").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-delete-request]");
    if (!b) return;
    b.disabled = true;
    try {
      await studioAPI("/requests/" + b.dataset.deleteRequest, {
        method: "DELETE",
      });
      toast("Consulta eliminada.");
      await render();
    } catch (error) {
      toast(error.message);
      b.disabled = false;
    }
  });
  render();
}
