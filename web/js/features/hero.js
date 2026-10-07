// TRAZVA — features / hero
import { $, $$ } from "../core/dom.js";
import { products } from "../data/catalog.js";
import { loadViewer } from "./viewer.js";
import { motionEnabled } from "../core/motion.js";

export async function initHeroModel() {
  const stage = $("#heroModelStage");
  if (!stage) return;
  const button = $("#heroRotate"),
    hint = $("#heroModelHint"),
    visual = $(".hero-studio");
  let model,
    selected = products[0],
    visible = true,
    turn = 0;
  function stop() {
    if (model) model.autoRotate = false;
    button.setAttribute("aria-pressed", "false");
    button.textContent = "↻ Girar";
  }
  function rotation(on) {
    if (!model) return;
    model.autoRotate = on;
    button.setAttribute("aria-pressed", String(on));
    button.textContent = on ? "Ⅱ Pausar" : "↻ Girar";
  }
  async function select(id) {
    selected = products.find((p) => p.id === id);
    const p = selected,
      attempt = ++turn;
    stop();
    model?.remove();
    model = null;
    stage.classList.remove("loaded");
    button.hidden = true;
    visual.style.setProperty("--hero-accent", p.bg);
    $$(".hero-model-picker button").forEach((b) =>
      b.setAttribute("aria-pressed", String(+b.dataset.hero === id)),
    );
    const link = $(".hero-product");
    link.dataset.product = id;
    $("strong", link).textContent = p.name;
    hint.textContent = "PREPARANDO TU PAR…";
    try {
      await loadViewer();
      if (attempt !== turn) return;
      model = document.createElement("model-viewer");
      const attrs = {
        alt: `${p.name} en 3D. Arrastra para explorar.`,
        "camera-controls": "",
        "disable-zoom": "",
        "disable-pan": "",
        "touch-action": "pan-y",
        "camera-orbit": p.angle,
        "shadow-intensity": "1",
        "shadow-softness": "1",
        exposure: String(p.exposure),
        "environment-image": "neutral",
        "interaction-prompt": "none",
        "rotation-per-second": "10deg",
        "auto-rotate-delay": "0",
        loading: "eager",
      };
      Object.entries(attrs).forEach(([k, v]) => model.setAttribute(k, v));
      model.addEventListener("load", () => {
        if (attempt !== turn) return;
        stage.classList.add("loaded");
        button.hidden = false;
        hint.textContent = "ARRASTRA PARA GIRAR";
        rotation(
          motionEnabled() &&
            visible &&
            !document.hidden &&
            !document.body.classList.contains("locked"),
        );
      });
      model.addEventListener("error", () => {
        if (attempt !== turn) return;
        stage.classList.remove("loaded");
        button.hidden = true;
        stop();
        hint.textContent = "VISTA NO DISPONIBLE · ABRE LA FICHA";
      });
      model.addEventListener("pointerdown", stop);
      model.addEventListener("keydown", (e) => {
        if (e.key.startsWith("Arrow")) stop();
      });
      stage.append(model);
      model.src = p.model;
    } catch {
      if (attempt === turn)
        hint.textContent = "VISTA NO DISPONIBLE · ABRE LA FICHA";
    }
  }
  $$(".hero-model-picker button").forEach((b) =>
    b.addEventListener("click", () => {
      if (+b.dataset.hero !== selected.id) select(+b.dataset.hero);
    }),
  );
  button.addEventListener("click", () => rotation(!model?.autoRotate));
  document.addEventListener("solevault:motion", () => {
    if (!motionEnabled()) stop();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
  });
  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) stop();
    },
    { threshold: 0.1 },
  ).observe(stage);
  new MutationObserver(() => {
    if (document.body.classList.contains("locked")) stop();
  }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  select(selected.id);
}
