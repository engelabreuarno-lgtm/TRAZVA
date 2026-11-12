import { studioAPI } from "../features/studio-api.js";
import { resetPrivacyChoice } from "../state/consent.js";

export function accountMenuMarkup(icon) {
  return `<div class="account-menu"><button id="accountMenuButton" type="button" class="account-menu-trigger" aria-expanded="false" aria-controls="accountMenuPanel" aria-label="Abrir opciones de cuenta">${icon}<span>Cuenta</span><small aria-hidden="true">⌄</small></button><section id="accountMenuPanel" class="account-menu-panel" aria-label="Opciones de cuenta" hidden><p class="eyebrow">TU ESPACIO / TRAZVA</p><strong id="accountMenuGreeting">Bienvenido a TRAZVA</strong><p id="accountMenuStatus">Crea tu perfil para conservar tu selección.</p><div id="accountMenuGuest" class="account-menu-guest"><a class="button dark" href="registro.html">Crear cuenta ↗</a><a class="button outline" href="iniciar-sesion.html">Iniciar sesión</a></div><nav aria-label="Tu cuenta"><a href="cuenta.html">Mi cuenta <span>↗</span></a><a href="studio.html">Mi estudio <span>↗</span></a><a href="showroom.html?fav=1">Mis favoritos <span>↗</span></a><a href="guia.html">Guía de uso <span>↗</span></a><a id="accountMenuAdmin" href="administracion.html" hidden>Administrar tienda <span>↗</span></a></nav><a id="accountMenuSignout" class="text-link" href="/signout-with-chatgpt?return_to=%2Finiciar-sesion.html" target="_top" hidden>Cerrar sesión ↗</a><button class="welcome-replay" type="button" data-replay-welcome>Repetir bienvenida ↻</button></section></div>`;
}

export function openWelcome() {
  if (document.getElementById("welcomeDialog")) return;
  const previous = document.activeElement;
  const dialog = document.createElement("dialog");
  dialog.id = "welcomeDialog";
  dialog.className = "welcome-dialog";
  dialog.setAttribute("aria-labelledby", "welcomeTitle");
  dialog.innerHTML = `<button class="dialog-close" aria-label="Cerrar bienvenida">×</button><p class="eyebrow">TU PRIMER PASO / TRAZVA</p><h2 id="welcomeTitle">Empieza por aquí.</h2><p>Explora a tu ritmo. Puedes crear un perfil cuando quieras guardar tu selección en la cuenta.</p><ol class="welcome-steps"><li><span>01</span><div><strong>Elige tu privacidad</strong><p>Acepta, rechaza o configura el contenido externo.</p><button class="text-link" data-privacy-settings>Configurar cookies ↗</button></div></li><li><span>02</span><div><strong>Crea tu cuenta</strong><p>Identifícate con ChatGPT, completa tu nombre y revisa las condiciones.</p><a class="text-link" href="registro.html">Crear mi perfil ↗</a></div></li><li><span>03</span><div><strong>Encuentra tu próximo par</strong><p>Filtra la colección, abre una ficha y guarda tus favoritos.</p><a class="text-link" href="showroom.html">Ir a la colección ↗</a></div></li></ol><div class="account-actions"><a class="button dark" href="guia.html">Ver guía completa ↗</a><button class="button outline" data-close-welcome>Continuar explorando</button></div><p class="account-note">Repetir la bienvenida reinicia tu elección de cookies. No cierra tu sesión ni borra tu perfil, favoritos o bolsa.</p>`;
  document.body.append(dialog);
  document.body.classList.add("locked");
  dialog.querySelectorAll(".dialog-close, [data-close-welcome]").forEach((b) => b.addEventListener("click", () => dialog.close()));
  dialog.addEventListener("close", () => {
    dialog.remove();
    document.body.classList.toggle("locked", Boolean(document.querySelector("dialog[open]")));
    if (previous?.isConnected) previous.focus();
  }, { once: true });
  dialog.showModal();
}

export function initAccountMenu() {
  const button = document.getElementById("accountMenuButton");
  const panel = document.getElementById("accountMenuPanel");
  if (!button || !panel) return;
  let checked = false;
  function close(focus = false) {
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
    if (focus) button.focus();
  }
  async function identify() {
    if (checked) return;
    checked = true;
    try {
      const data = await studioAPI("/account");
      document.getElementById("accountMenuGreeting").textContent = data.profile ? `Hola, ${data.profile.display_name}` : "Tu acceso está verificado";
      document.getElementById("accountMenuStatus").textContent = data.profile ? "Tu perfil y tus pares, en un mismo lugar." : "Completa tu registro para crear tu perfil de TRAZVA.";
      document.getElementById("accountMenuGuest").hidden = Boolean(data.profile);
      document.getElementById("accountMenuSignout").hidden = false;
      document.getElementById("accountMenuAdmin").hidden = !data.admin;
    } catch (error) {
      if (error.status !== 401) {
        checked = false;
        document.getElementById("accountMenuStatus").textContent = "No pudimos comprobar la sesión. Puedes abrir Mi cuenta para reintentar.";
      }
    }
  }
  button.addEventListener("click", () => {
    const open = panel.hidden;
    if (open) document.querySelector(".mobile-toggle[aria-expanded=true]")?.click();
    panel.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    if (open) identify();
  });
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-replay-welcome]")) {
      close();
      button.focus();
      resetPrivacyChoice();
      openWelcome();
      return;
    }
    if (!e.composedPath().includes(button.parentElement)) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) { e.preventDefault(); close(true); }
  });
  button.parentElement.addEventListener("focusout", (e) => {
    if (e.relatedTarget && !button.parentElement.contains(e.relatedTarget)) close();
  });
  document.addEventListener("trazva:account", () => { checked = false; if (!panel.hidden) identify(); });
}
