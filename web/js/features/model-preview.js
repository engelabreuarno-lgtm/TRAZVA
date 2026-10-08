import { products } from "../data/catalog.js";
import { motionEnabled } from "../core/motion.js";
import { loadViewer } from "./viewer.js";
import { createExternalPreview } from "./external-preview.js";

// External embeds are opt-in: an interactive iframe cannot live inside a button.
export function modelPreview(p, { external = false } = {}) {
  if (!p.model && !(external && p.embed)) return "";
  const embedded = !p.model && p.embed;
  return `<span class="model-preview${embedded ? " external-preview" : ""}" data-model-preview="${p.id}"${embedded ? "" : ' aria-hidden="true"'}><span class="preview-status">Preparando tu par…</span></span>`;
}

export function initModelPreviews() {
  const states = new Map();
  const rotation = (state) => {
    state.external?.setActive(
      state.active &&
        !document.hidden &&
        !document.body.classList.contains("locked"),
    );
    if (state.viewer)
      state.viewer.autoRotate = Boolean(
        state.active &&
        state.hover &&
        motionEnabled() &&
        !document.hidden &&
        !document.body.classList.contains("locked"),
      );
  };
  async function mount(host, state) {
    const product = products.find(
      (p) => p.id === Number(host.dataset.modelPreview),
    );
    if ((!product?.model && !product?.embed) || state.started) return;
    state.started = true;
    if (!product.model && product.embed) {
      state.external = createExternalPreview(product, host);
      rotation(state);
      return;
    }
    const status = host.querySelector(".preview-status");
    const fail = () => {
      if (!host.isConnected) return;
      clearTimeout(state.timer);
      host.classList.add("preview-failed");
      host.classList.remove("preview-ready");
      state.viewer?.remove();
      state.viewer = null;
      if (status) status.textContent = "Vista no disponible. Abre la ficha.";
    };
    state.timer = setTimeout(fail, 30000);
    try {
      await loadViewer();
      if (!host.isConnected || host.classList.contains("preview-failed"))
        return;
      const viewer = document.createElement("model-viewer");
      const interactive = host.hasAttribute("data-interactive");
      const attributes = {
        alt: `${product.name}, modelo 3D`,
        "camera-orbit": product.angle,
        exposure: String(product.exposure),
        "environment-image": "neutral",
        "shadow-intensity": "1",
        "shadow-softness": "1",
        "interaction-prompt": "none",
        "rotation-per-second": "16deg",
        "auto-rotate-delay": "0",
        "disable-zoom": "",
        loading: "eager",
        tabindex: interactive ? "0" : "-1",
      };
      if (interactive) {
        attributes["camera-controls"] = "";
        attributes["touch-action"] = "pan-y";
        attributes["disable-pan"] = "";
      }
      for (const [key, value] of Object.entries(attributes))
        viewer.setAttribute(key, value);
      state.viewer = viewer;
      viewer.addEventListener(
        "load",
        () => {
          clearTimeout(state.timer);
          host.classList.add("preview-ready");
          rotation(state);
        },
        { once: true },
      );
      viewer.addEventListener("error", fail, { once: true });
      host.append(viewer);
      viewer.src = product.model;
    } catch {
      fail();
    }
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const state = states.get(entry.target);
        if (!state) continue;
        state.active = entry.isIntersecting;
        if (state.active) mount(entry.target, state);
        rotation(state);
      }
    },
    { rootMargin: "80px", threshold: 0.05 },
  );
  function scan() {
    for (const [host, state] of states) {
      if (!host.isConnected) {
        clearTimeout(state.timer);
        observer.unobserve(host);
        state.viewer?.remove();
        state.external?.dispose();
        states.delete(host);
      }
    }
    document.querySelectorAll("[data-model-preview]").forEach((host) => {
      if (states.has(host)) return;
      const state = { active: false, hover: false };
      states.set(host, state);
      const target = host.closest("button") || host;
      for (const event of ["pointerenter", "focusin"])
        target.addEventListener(event, () => {
          state.hover = true;
          rotation(state);
        });
      for (const event of ["pointerleave", "focusout"])
        target.addEventListener(event, () => {
          state.hover = false;
          rotation(state);
        });
      observer.observe(host);
    });
  }
  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      scan();
    });
  }).observe(document.body, { childList: true, subtree: true });
  new MutationObserver(() => states.forEach(rotation)).observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });
  document.addEventListener("solevault:motion", () => states.forEach(rotation));
  document.addEventListener("visibilitychange", () => states.forEach(rotation));
  scan();
}
