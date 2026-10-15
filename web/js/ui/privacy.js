import {
  externalAllowed,
  privacyChoice,
  savePrivacyChoice,
} from "../state/consent.js";

export function openPrivacySettings() {
  if (document.querySelector("#privacyDialog")) return;
  const previous = document.activeElement;
  const d = document.createElement("dialog");
  d.id = "privacyDialog";
  d.className = "privacy-dialog";
  d.setAttribute("aria-labelledby", "privacyTitle");
  d.innerHTML = `<button class="dialog-close" aria-label="Cerrar preferencias">×</button><p class="eyebrow">TÚ DECIDES</p><h2 id="privacyTitle">Tu privacidad,<br>tu elección.</h2><p>Las funciones básicas siguen disponibles aunque no actives contenido externo.</p><div class="privacy-option"><div><strong>Funciones necesarias</strong><p>Acceso seguro, bolsa, favoritos y tus preferencias.</p></div><span>Siempre activas</span></div><label class="privacy-option"><div><strong>Modelos de Sketchfab</strong><p>Permite conectar con Sketchfab para cargar algunos pares. El proveedor recibe datos técnicos, como tu IP y navegador, y puede utilizar su propio almacenamiento.</p></div><input id="externalConsent" type="checkbox" ${externalAllowed() ? "checked" : ""}></label><p class="account-note">No hemos añadido herramientas de publicidad ni analítica. <a href="cookies.html">Leer la política de cookies</a>.</p><div class="account-actions"><button class="button outline" data-essential>Solo necesarias</button><button class="button dark" data-save-privacy>Guardar elección</button></div>`;
  document.body.append(d);
  document.body.classList.add("locked");
  const finish = (external) => {
    const persisted = savePrivacyChoice(external);
    d.close();
    const toast = document.querySelector("#toast");
    if (toast) {
      toast.textContent = persisted
        ? "Preferencias guardadas."
        : "Preferencias aplicadas solo en esta sesión: el navegador impide guardarlas.";
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 4000);
    }
  };
  d.querySelector(".dialog-close").addEventListener("click", () => d.close());
  d.querySelector("[data-essential]").addEventListener("click", () =>
    finish(false),
  );
  d.querySelector("[data-save-privacy]").addEventListener("click", () =>
    finish(d.querySelector("input").checked),
  );
  d.addEventListener(
    "close",
    () => {
      d.remove();
      document.body.classList.toggle(
        "locked",
        Boolean(document.querySelector("dialog[open]")),
      );
      if (previous?.isConnected) previous.focus();
    },
    { once: true },
  );
  d.showModal();
}
export function initPrivacy() {
  const banner = document.createElement("section");
  banner.className = "cookie-banner";
  banner.setAttribute("aria-label", "Preferencias de privacidad");
  banner.innerHTML = `<div><strong>Tu privacidad también importa.</strong><p>Usamos almacenamiento necesario para tu selección y acceso. Los modelos externos de Sketchfab solo se cargan si los permites. <a href="cookies.html">Más información</a></p></div><div class="cookie-actions"><button class="button outline" data-reject-cookies>Solo necesarias</button><button class="button outline" data-privacy-settings>Configurar</button><button class="button dark" data-accept-cookies>Permitir externos</button></div>`;
  document.body.append(banner);
  const sync = () => {
    banner.hidden = Boolean(privacyChoice());
  };
  banner
    .querySelector("[data-reject-cookies]")
    .addEventListener("click", () => savePrivacyChoice(false));
  banner
    .querySelector("[data-accept-cookies]")
    .addEventListener("click", () => savePrivacyChoice(true));
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-privacy-settings]")) openPrivacySettings();
  });
  document.addEventListener("trazva:privacy", sync);
  window.addEventListener("storage", () =>
    document.dispatchEvent(new window.Event("trazva:privacy")),
  );
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden)
      document.dispatchEvent(new window.Event("trazva:privacy"));
  });
  sync();
}
