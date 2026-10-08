let sdkPromise;
export function loadSketchfabSDK() {
  if (window.Sketchfab) return Promise.resolve(window.Sketchfab);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js";
    script.async = true;
    const timeout = setTimeout(() => {
      script.remove();
      reject(new Error("timeout"));
    }, 12000);
    script.onload = () => {
      clearTimeout(timeout);
      window.Sketchfab
        ? resolve(window.Sketchfab)
        : reject(new Error("SDK unavailable"));
    };
    script.onerror = () => {
      clearTimeout(timeout);
      script.remove();
      reject(new Error("network"));
    };
    document.head.append(script);
  }).catch((error) => {
    sdkPromise = null;
    throw error;
  });
  return sdkPromise;
}
export function attachExternalViewer(product, dialog) {
  const button = dialog.querySelector("#loadRun3D");
  if (!button) return;
  const mount = dialog.querySelector("#runMedia"),
    waiting = mount.querySelector(".external-wait");
  const status = document.createElement("p");
  status.className = "external-status";
  status.setAttribute("role", "status");
  mount.append(status);
  let iframe,
    timer,
    closed = false,
    generation = 0;
  button.addEventListener("click", async () => {
    const attempt = ++generation;
    waiting.hidden = false;
    mount.closest(".run-visual").classList.remove("is-unavailable");
    button.disabled = true;
    button.textContent = "Preparando tu par…";
    status.textContent =
      "Puedes consultar los detalles mientras carga la vista.";
    function fail() {
      if (closed || attempt !== generation) return;
      ++generation;
      clearTimeout(timer);
      iframe?.remove();
      waiting.hidden = true;
      mount.closest(".run-visual").classList.add("is-unavailable");
      mount.classList.remove("external-ready");
      button.hidden = false;
      button.disabled = false;
      button.textContent = "Reintentar vista ↻";
      status.textContent =
        "Esta vista no está disponible ahora. Reintenta o consulta el original.";
    }
    timer = setTimeout(fail, 45000);
    try {
      const Sketchfab = await loadSketchfabSDK();
      if (closed || attempt !== generation) return;
      iframe = document.createElement("iframe");
      iframe.title = `Modelo 3D de ${product.brand} ${product.name}, por ${product.credit.author}`;
      iframe.allow = "fullscreen; xr-spatial-tracking";
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.className = "external-pending";
      mount.append(iframe);
      const client = new Sketchfab("1.12.1", iframe);
      client.init(product.embed, {
        autostart: 1,
        autospin: 0,
        preload: 1,
        success(api) {
          if (closed || attempt !== generation) return;
          api.addEventListener("viewerready", () => {
            if (closed || attempt !== generation) return;
            clearTimeout(timer);
            waiting.hidden = true;
            mount.classList.add("external-ready");
            iframe.classList.remove("external-pending");
            button.hidden = true;
            status.textContent =
              "Arrastra para girar. Usa los controles del visor para ampliar.";
          });
          api.start();
        },
        error: fail,
      });
    } catch {
      fail();
    }
  });
  button.click();
  dialog.addEventListener(
    "close",
    () => {
      closed = true;
      ++generation;
      clearTimeout(timer);
      iframe?.remove();
    },
    { once: true },
  );
}
