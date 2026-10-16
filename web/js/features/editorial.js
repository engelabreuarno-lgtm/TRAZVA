import { $, $$ } from "../core/dom.js";
import { products } from "../data/catalog.js";
import { card } from "./catalog.js";
import { loadSelections } from "./running.js";

const edits = {
  daily: {
    categories: ["Lifestyle", "Sport"],
    title: "De la primera salida al último plan.",
    note: "Siluetas para explorar tu estilo de cada día. El ajuste lo decides tú.",
    href: "showroom.html?category=Lifestyle",
  },
  running: {
    categories: ["Running"],
    title: "Cada entrenamiento tiene su par.",
    note: "Compara uso, amortiguación y estructura. Guarda las opciones que te interesen.",
    href: "showroom.html?category=Running",
  },
  character: {
    categories: ["Skate", "Lifestyle"],
    title: "Un poco menos de lo mismo.",
    note: "Contrastes, perfiles y siluetas con personalidad. Mira los detalles de cerca.",
    href: "showroom.html?category=Skate",
  },
};

export function initEditorial() {
  const grid = $("#featuredGrid");
  if (!grid) return;
  let requestedSelections = false;
  function select(key) {
    const edit = edits[key];
    if (!edit) return;
    const list = edit.categories
      .flatMap((category) => products.filter((p) => p.category === category))
      .slice(0, 3);
    grid.innerHTML = list.map(card).join("");
    $("#editTitle").textContent = edit.title;
    $("#editNote").textContent = edit.note;
    $("#editLink").href = edit.href;
    $("#editStatus").textContent = `${list.length} pares en esta selección.`;
    $$("[data-edit]").forEach((button) =>
      button.setAttribute("aria-pressed", String(button.dataset.edit === key)),
    );
    if (key === "running" && !requestedSelections) {
      requestedSelections = true;
      loadSelections().catch(() => {
        requestedSelections = false;
      });
    }
  }
  $$("[data-edit]").forEach((button) =>
    button.addEventListener("click", () => select(button.dataset.edit)),
  );
  select("daily");
}
