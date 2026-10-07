// TRAZVA — features / viewer
import { esc, $, $$ } from "../core/dom.js";
import { motionEnabled } from "../core/motion.js";
import { toast } from "../ui/feedback.js";

export let viewerModule;

export function loadViewer() {
  if (!viewerModule) {
    window.ModelViewerElement = {
      dracoDecoderLocation: new URL("vendor/draco/", document.baseURI).href,
    };
    viewerModule = import("../../vendor/model-viewer.min.js").catch((error) => {
      viewerModule = null;
      throw error;
    });
  }
  return viewerModule;
}

export function modelMedia(p) {
  return `<section class="detail-visual" style="--model-bg:${p.bg}" aria-label="Vista del producto">
    <div class="media-tabs"><span>VISTA DEL PRODUCTO</span></div>
    <div class="model-stage"><div class="model-mount" id="modelMount"></div>
      <div class="model-loading" role="status"><span class="loading-ring" aria-hidden="true"></span><span id="modelStatus">Preparando tu par…</span><button id="retryModel" hidden>Reintentar</button></div>
    </div>
    <div class="model-toolbar" role="group" aria-label="Controles del modelo 3D"><button id="rotateModel" aria-pressed="false" disabled title="Activar giro automático">↻ <span>Girar</span></button><div><button id="zoomOut" disabled aria-label="Alejar modelo">−</button><button id="zoomIn" disabled aria-label="Acercar modelo">+</button></div><button id="resetModel" disabled title="Restablecer vista">⤾ <span>Vista inicial</span></button><button id="fullscreenModel" aria-label="Pantalla completa" title="Pantalla completa" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5"/></svg></button></div>
    <p class="model-hint">Arrastra para girar · Rueda o pellizco para acercar</p>
  </section>`;
}

export function initProductViewer(p, dialog) {
  const media = $(".detail-visual", dialog),
    mount = $("#modelMount", dialog),
    status = $("#modelStatus", dialog);
  const loading = $(".model-loading", dialog),
    retry = $("#retryModel", dialog);
  const controls = $$(".model-toolbar button", dialog);
  let viewer,
    timeout,
    disposed = false,
    generation = 0;
  const rotation = $("#rotateModel", dialog);
  function setRotation(on) {
    if (!viewer) return;
    viewer.autoRotate = on;
    rotation.setAttribute("aria-pressed", String(on));
    rotation.innerHTML = on ? "Ⅱ <span>Pausar</span>" : "↻ <span>Girar</span>";
  }
  function fail() {
    ++generation;
    clearTimeout(timeout);
    media.classList.remove("model-ready");
    media.classList.add("model-failed");
    loading.hidden = false;
    retry.hidden = false;
    status.textContent =
      location.protocol === "file:"
        ? "Abre la página con XAMPP o un servidor local para activar el 3D."
        : "No se pudo cargar esta vista. Puedes reintentar.";
    controls.forEach((b) => (b.disabled = true));
    setRotation(false);
    viewer?.remove();
    viewer = null;
  }
  async function start() {
    const attempt = ++generation;
    clearTimeout(timeout);
    viewer?.remove();
    viewer = null;
    media.classList.remove("model-ready", "model-failed");
    loading.hidden = false;
    retry.hidden = true;
    status.textContent = "Preparando tu par…";
    controls.forEach((b) => (b.disabled = true));
    timeout = setTimeout(() => {
      if (!disposed && attempt === generation) fail();
    }, 30000);
    try {
      await loadViewer();
      if (disposed || attempt !== generation) return;
      viewer = document.createElement("model-viewer");
      const attributes = {
        alt: `Modelo 3D interactivo de ${p.name}. Arrastra o usa las flechas para girar.`,
        "camera-controls": "",
        "touch-action": "pan-y",
        "disable-pan": "",
        "camera-orbit": p.angle,
        "min-camera-orbit": "auto 10deg 60%",
        "max-camera-orbit": "auto 150deg 180%",
        "shadow-intensity": "1",
        "shadow-softness": "1",
        exposure: String(p.exposure),
        "environment-image": "neutral",
        "interaction-prompt": "none",
        "rotation-per-second": "18deg",
        "auto-rotate-delay": "0",
        loading: "eager",
        "aria-label": `Explorar ${p.name} en tres dimensiones`,
      };
      for (const [key, value] of Object.entries(attributes))
        viewer.setAttribute(key, value);
      viewer.addEventListener(
        "load",
        () => {
          if (disposed || attempt !== generation) return;
          clearTimeout(timeout);
          loading.hidden = true;
          media.classList.remove("model-failed");
          media.classList.add("model-ready");
          controls.forEach((b) => (b.disabled = false));
          rotation.setAttribute("aria-pressed", "false");
          if (!document.fullscreenEnabled)
            $("#fullscreenModel", dialog).hidden = true;
          viewer.cameraOrbit = p.angle;
          viewer.jumpCameraToGoal();
        },
        { once: true },
      );
      viewer.addEventListener("error", () => {
        if (!disposed && attempt === generation) fail();
      });
      viewer.addEventListener("progress", (event) => {
        if (!media.classList.contains("model-failed"))
          status.textContent = `Cargando · ${Math.round((event.detail.totalProgress || 0) * 100)}%`;
      });
      mount.append(viewer);
      viewer.src =
        attempt === 1 ? p.model : `${p.model}?retry=${Date.now()}-${attempt}`;
    } catch {
      if (!disposed && attempt === generation) fail();
    }
  }
  retry.addEventListener("click", () => {
    start();
  });
  rotation.addEventListener("click", () => setRotation(!viewer.autoRotate));
  async function zoom(factor) {
    if (!viewer?.loaded) return;
    const orbit = viewer.getCameraOrbit();
    viewer.cameraOrbit = `${orbit.theta}rad ${orbit.phi}rad ${orbit.radius * factor}m`;
    await viewer.updateComplete;
    if (!motionEnabled()) viewer.jumpCameraToGoal();
  }
  $("#zoomIn", dialog).addEventListener("click", () => zoom(0.85));
  $("#zoomOut", dialog).addEventListener("click", () => zoom(1.18));
  $("#resetModel", dialog).addEventListener("click", async () => {
    if (!viewer?.loaded) return;
    setRotation(false);
    viewer.resetTurntableRotation();
    viewer.cameraOrbit = "auto auto auto";
    await viewer.updateComplete;
    viewer.cameraOrbit = p.angle;
    await viewer.updateComplete;
    if (!motionEnabled()) viewer.jumpCameraToGoal();
  });
  $("#fullscreenModel", dialog).addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await media.requestFullscreen();
    } catch {
      toast("La pantalla completa no está disponible en este navegador.");
    }
  });
  const stopOnHide = () => {
    if (document.hidden) setRotation(false);
  };
  document.addEventListener("visibilitychange", stopOnHide);
  const stopMotion = () => {
    if (!motionEnabled()) setRotation(false);
  };
  document.addEventListener("solevault:motion", stopMotion);
  dialog.addEventListener(
    "close",
    () => {
      disposed = true;
      ++generation;
      clearTimeout(timeout);
      setRotation(false);
      viewer?.remove();
      document.removeEventListener("visibilitychange", stopOnHide);
      document.removeEventListener("solevault:motion", stopMotion);
      if (document.fullscreenElement === media)
        document.exitFullscreen().catch(() => {});
    },
    { once: true },
  );
  start();
}
