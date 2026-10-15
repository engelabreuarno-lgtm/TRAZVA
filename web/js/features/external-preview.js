import { loadSketchfabSDK } from "./external-viewer.js";
import { externalAllowed } from "../state/consent.js";

// Keep heavy external viewers from starting together when a grid enters view.
const pending = new Set();
let loading = 0;
function drain() {
  while (loading < 2 && pending.size) {
    const task = pending.values().next().value;
    pending.delete(task);
    loading++;
    let released = false;
    task.start(() => {
      if (released) return;
      released = true;
      loading--;
      queueMicrotask(drain);
    });
  }
}

export function createExternalPreview(product, host) {
  const status = host.querySelector(".preview-status");
  let active = false,
    disposed = false,
    phase = "idle",
    generation = 0,
    iframe,
    api,
    timer,
    release,
    rendering = false;

  function render(on) {
    if (!api || rendering === on) return;
    rendering = on;
    if (on) api.start();
    else api.stop();
  }
  function reset() {
    ++generation;
    clearTimeout(timer);
    pending.delete(task);
    render(false);
    api = null;
    iframe?.remove();
    iframe = null;
    release?.();
    release = null;
    phase = "idle";
  }
  const task = {
    async start(releaseSlot) {
      release = releaseSlot;
      if (disposed || !active || !host.isConnected || !externalAllowed()) {
        reset();
        return;
      }
      phase = "loading";
      const attempt = ++generation;
      const current = () =>
        !disposed && attempt === generation && host.isConnected;
      function fail() {
        if (!current()) return;
        reset();
        phase = "failed";
        host.classList.remove("preview-ready");
        host.classList.add("preview-failed");
        if (status) status.textContent = "Vista no disponible. Abre la ficha.";
      }
      timer = setTimeout(fail, 45000);
      try {
        const Sketchfab = await loadSketchfabSDK();
        if (!current()) return;
        iframe = document.createElement("iframe");
        iframe.title = `${product.brand} ${product.name}, modelo de ${product.credit.author}`;
        iframe.allow = "fullscreen; xr-spatial-tracking";
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        iframe.tabIndex = -1;
        host.append(iframe);
        new Sketchfab("1.12.1", iframe).init(product.embed, {
          autostart: 1,
          autospin: 0,
          camera: 0,
          animation_autoplay: 0,
          preload: 0,
          max_texture_size: 1024,
          scrollwheel: 0,
          dnt: 1,
          success(viewer) {
            if (!current()) return;
            api = viewer;
            api.addEventListener("viewerready", () => {
              if (!current()) return;
              clearTimeout(timer);
              phase = "ready";
              host.classList.add("preview-ready");
              iframe.removeAttribute("tabindex");
              release?.();
              release = null;
              render(active);
            });
            render(true);
          },
          error: fail,
        });
      } catch {
        fail();
      }
    },
  };
  return {
    setActive(on) {
      if (disposed) return;
      active = Boolean(on);
      if (!externalAllowed()) {
        reset();
        host.classList.remove("preview-ready", "preview-failed");
        host.classList.add("preview-private");
        if (status)
          status.innerHTML =
            '<span>Vista externa desactivada</span><button type="button" data-privacy-settings>Configurar privacidad ↗</button>';
        return;
      }
      if (host.classList.contains("preview-private")) {
        host.classList.remove("preview-private");
        if (status) status.textContent = "Preparando tu par…";
      }
      if (phase === "ready") render(active);
      else if (!active && phase !== "failed") reset();
      else if (phase === "idle") {
        pending.add(task);
        queueMicrotask(drain);
      }
    },
    dispose() {
      disposed = true;
      active = false;
      reset();
    },
  };
}
