import { $, $$ } from "../core/dom.js";
import { studioAPI } from "./studio-api.js";
import { LEGAL_VERSION } from "../data/legal.js";

function download(data) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "TRAZVA-mis-datos.json";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function initAccount() {
  const page = document.body.dataset.page;
  if (!["login", "register", "account"].includes(page)) return;
  const status = $("#accountStatus");
  const form = $("#profileForm");
  let data;
  try {
    data = await studioAPI("/account");
  } catch (error) {
    status.textContent = error.message;
    if (error.status === 401) $("#signInLink")?.removeAttribute("hidden");
    else {
      const retry = document.createElement("button");
      retry.className = "text-link";
      retry.textContent = "Reintentar ↻";
      retry.addEventListener("click", () => {
        retry.remove();
        initAccount();
      });
      status.after(retry);
    }
    return;
  }
  status.textContent = data.profile
    ? "Sesión iniciada. Tu perfil está listo."
    : "Acceso verificado. Completa tu perfil para registrarte en TRAZVA.";
  if (page === "login") {
    const link = $("#accountContinue");
    link.hidden = false;
    link.href = data.profile ? "cuenta.html" : "registro.html";
    link.textContent = data.profile
      ? "Abrir mi cuenta ↗"
      : "Completar mi registro ↗";
    return;
  }
  $("#accountContent")?.removeAttribute("hidden");
  if (data.admin) $("#adminLink")?.removeAttribute("hidden");
  form.hidden = false;
  form.elements.name.value = data.profile?.display_name || "";
  form.elements.email.value = data.identity.email;
  const needsAcceptance =
    !data.profile ||
    data.profile.terms_version !== LEGAL_VERSION ||
    data.profile.privacy_version !== LEGAL_VERSION;
  $("#legalAcceptance").hidden = !needsAcceptance;
  for (const key of ["acceptTerms", "privacyRead"])
    form.elements[key].required = needsAcceptance;
  if (page === "register" && data.profile) $("#accountContinue").hidden = false;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const button = $('button[type="submit"]', form);
    if (button.disabled) return;
    button.disabled = true;
    $("#profileStatus").textContent = "Guardando…";
    try {
      await studioAPI("/account", {
        method: "PUT",
        body: JSON.stringify({
          name: form.elements.name.value,
          acceptTerms: form.elements.acceptTerms.checked,
          privacyRead: form.elements.privacyRead.checked,
          legalVersion: LEGAL_VERSION,
        }),
      });
      $("#profileStatus").textContent = "Tu perfil se ha guardado.";
      status.textContent = "Tu cuenta de TRAZVA está lista.";
      $("#accountContinue")?.removeAttribute("hidden");
    } catch (error) {
      $("#profileStatus").textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
  $("#exportAccount")?.addEventListener("click", async (e) => {
    const button = e.currentTarget;
    button.disabled = true;
    try {
      download(await studioAPI("/account/export"));
      $("#dataStatus").textContent = "Descarga preparada.";
    } catch (error) {
      $("#dataStatus").textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
  $("#deleteAccount")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const deletion = e.currentTarget;
    if (!deletion.reportValidity()) return;
    const button = $('button[type="submit"]', deletion);
    if (button.disabled) return;
    button.disabled = true;
    try {
      await studioAPI("/account", {
        method: "DELETE",
        body: JSON.stringify({
          confirmation: deletion.elements.confirmation.value,
        }),
      });
      $("#accountContent").hidden = true;
      status.textContent =
        "Tu perfil, selección y consultas de TRAZVA se han eliminado.";
      const link = document.createElement("a");
      link.href = "registro.html";
      link.className = "text-link";
      link.textContent = "Crear un perfil nuevo ↗";
      status.after(link);
    } catch (error) {
      $("#dataStatus").textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
}

export async function initStoreSettings() {
  const form = $("#storeForm");
  if (!form) return;
  try {
    const data = await studioAPI("/admin/store");
    for (const element of form.elements)
      if (element.name && Object.hasOwn(data, element.name))
        element.value = data[element.name];
    form.hidden = false;
    $("#adminStatus").textContent =
      "Configuración privada. Los cambios solo se guardan al pulsar el botón.";
  } catch (error) {
    $("#adminStatus").textContent = error.message;
    return;
  }
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const button = $('button[type="submit"]', form);
    if (button.disabled) return;
    button.disabled = true;
    $("#storeStatus").textContent = "Guardando…";
    try {
      await studioAPI("/admin/store", {
        method: "PUT",
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      $("#storeStatus").textContent =
        "Configuración guardada. La información comercial se refleja en las políticas; los datos bancarios siguen privados.";
    } catch (error) {
      $("#storeStatus").textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
}
export async function initLegalIdentity() {
  $$(".legal-nav a").forEach((a) => {
    if (a.pathname === location.pathname)
      a.setAttribute("aria-current", "page");
  });
  const targets = $$("[data-business-identity]");
  if (!targets.length) return;
  try {
    const { identity } = await studioAPI("/store");
    if (!identity.legalName) return;
    targets.forEach((node) => {
      node.textContent = [
        identity.legalName,
        identity.address,
        identity.country,
        identity.taxId ? "Identificación fiscal: " + identity.taxId : "",
        identity.contactEmail
          ? "Contacto: " + identity.contactEmail
          : "Contacto comercial pendiente de completar.",
      ]
        .filter(Boolean)
        .join(" · ");
    });
  } catch {
    targets.forEach((node) => {
      node.textContent =
        "No se pudo consultar la información comercial. Puedes reintentar recargando la página o utilizar Contacto.";
    });
  }
}
