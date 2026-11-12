import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { initAccount, initStoreSettings } from "../web/js/features/account.js";
import { initPrivacy } from "../web/js/ui/privacy.js";
import { privacyChoice, externalAllowed } from "../web/js/state/consent.js";
import {
  CONSENT_KEY,
  CONSENT_TTL,
  LEGAL_VERSION,
} from "../web/js/data/legal.js";
import { renderChrome } from "../web/js/ui/chrome.js";
import { savePrivacyChoice } from "../web/js/state/consent.js";
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
async function page(t, file) {
  const dom = new JSDOM(await readFile("web/" + file, "utf8"), {
    url: "https://trazva.test/" + file,
    pretendToBeVisual: true,
  });
  const w = dom.window;
  for (const key of [
    "window",
    "document",
    "location",
    "localStorage",
    "sessionStorage",
    "FormData",
  ])
    globalThis[key] = key === "window" ? w : w[key];
  w.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new w.Event("close"));
  };
  t.after(() => w.close());
  return w;
}
const json = (value, status = 200) => Response.json(value, { status });

test("Account menu exposes registration, supports Escape and replays welcome without deleting selections", async (t) => {
  const w = await page(t, "index.html");
  globalThis.fetch = async () => json({ error: "Inicia sesión." }, 401);
  renderChrome();
  initPrivacy();
  localStorage.setItem("solevault_v3_favorites", "[101]");
  savePrivacyChoice(true);
  const trigger = document.querySelector("#accountMenuButton");
  trigger.click();
  assert.equal(trigger.getAttribute("aria-expanded"), "true");
  assert(document.querySelector('#accountMenuPanel a[href="registro.html"]'));
  assert(document.querySelector('#accountMenuPanel a[href="iniciar-sesion.html"]'));
  document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert(document.querySelector("#accountMenuPanel").hidden);
  assert.equal(document.activeElement, trigger);
  trigger.click();
  document.querySelector("#accountMenuPanel [data-replay-welcome]").click();
  assert(document.querySelector("#welcomeDialog").open);
  assert(!document.querySelector(".cookie-banner").hidden);
  assert.equal(externalAllowed(), false);
  assert.equal(localStorage.getItem("solevault_v3_favorites"), "[101]");
  document.querySelector("#welcomeDialog [data-close-welcome]").click();
  assert.equal(document.activeElement, trigger);
});

test("Cookie consent lasts in the current tab but does not authorize a new visit", async (t) => {
  await page(t, "cookies.html");
  localStorage.setItem("trazva_privacy_v1", JSON.stringify({version:1, external:true, savedAt:Date.now()}));
  renderChrome();
  initPrivacy();
  assert.equal(externalAllowed(), false);
  savePrivacyChoice(true);
  assert(sessionStorage.getItem(CONSENT_KEY));
  assert.equal(localStorage.getItem(CONSENT_KEY), null);
  assert.equal(localStorage.getItem("trazva_privacy_v1"), null);
  assert.equal(externalAllowed(), true);
  await page(t, "cookies.html");
  assert.equal(privacyChoice(), null);
  renderChrome();
  initPrivacy();
  assert(!document.querySelector(".cookie-banner").hidden);
});

test("Registration uses verified identity and explicit unchecked legal acceptance; failed saves preserve the form", async (t) => {
  const w = await page(t, "registro.html");
  let body,
    fail = true;
  globalThis.fetch = async (url, options) => {
    if (options.method === "PUT") {
      body = JSON.parse(options.body);
      return fail
        ? json({ error: "Inténtalo otra vez." }, 503)
        : json({ saved: true });
    }
    return json({
      identity: { email: "verified@example.invalid" },
      profile: null,
      admin: false,
    });
  };
  await initAccount();
  const form = document.querySelector("#profileForm");
  assert(!form.hidden);
  assert.equal(form.elements.email.value, "verified@example.invalid");
  assert(form.elements.email.readOnly);
  assert(!form.elements.acceptTerms.checked);
  assert(!form.elements.privacyRead.checked);
  assert.equal(document.querySelectorAll('input[type="password"]').length, 0);
  form.elements.name.value = "Nombre de prueba";
  form.elements.acceptTerms.checked = true;
  form.elements.privacyRead.checked = true;
  form.dispatchEvent(
    new w.Event("submit", { bubbles: true, cancelable: true }),
  );
  await flush();
  assert.equal(form.elements.name.value, "Nombre de prueba");
  assert.match(
    document.querySelector("#profileStatus").textContent,
    /otra vez/,
  );
  assert(!form.querySelector("button").disabled);
  fail = false;
  form.dispatchEvent(
    new w.Event("submit", { bubbles: true, cancelable: true }),
  );
  await flush();
  assert.equal(body.legalVersion, LEGAL_VERSION);
  assert.equal(body.acceptTerms, true);
  assert(!Object.hasOwn(body, "email"));
  assert(!document.querySelector("#accountContinue").hidden);
});

test("Anonymous accounts show platform sign-in and unauthorized visitors cannot see the administration form", async (t) => {
  await page(t, "cuenta.html");
  globalThis.fetch = async () => json({ error: "Inicia sesión." }, 401);
  await initAccount();
  const link = document.querySelector("#signInLink");
  assert(!link.hidden);
  assert.equal(link.target, "_top");
  assert.equal(new URL(link.href).pathname, "/signin-with-chatgpt");
  assert(document.querySelector("#accountContent").hidden);
  globalThis.fetch = async () =>
    new Response("<html>Sign in</html>", {
      headers: { "content-type": "text/html" },
    });
  await initAccount();
  assert.match(
    document.querySelector("#accountStatus").textContent,
    /caducado/,
  );
  assert(!link.hidden);
  await page(t, "registro.html");
  globalThis.fetch = async () => json({ error: "Inicia sesión." }, 401);
  await initAccount();
  assert(document.querySelector("#profileForm").hidden);
  assert(!document.querySelector("#signInLink").hidden);
  assert.match(document.querySelector("#accountStatus").textContent, /primero debes iniciar sesión/);
});

test("Administration keeps sensitive fields hidden after a permission rejection", async (t) => {
  await page(t, "administracion.html");
  globalThis.fetch = async () =>
    json({ error: "Solo la administración." }, 403);
  await initStoreSettings();
  assert(document.querySelector("#storeForm").hidden);
  assert.match(
    document.querySelector("#adminStatus").textContent,
    /Solo la administración/,
  );
});

test("Cookie preferences can be refused, reopened and changed; expired or invalid choices do not allow external content", async (t) => {
  await page(t, "cookies.html");
  renderChrome();
  initPrivacy();
  const banner = document.querySelector(".cookie-banner");
  assert(!banner.hidden);
  assert.equal(externalAllowed(), false);
  banner.querySelector("[data-reject-cookies]").click();
  assert(banner.hidden);
  assert.equal(privacyChoice().external, false);
  document.querySelector("#footer [data-privacy-settings]").click();
  const d = document.querySelector("#privacyDialog");
  assert(d.open);
  assert(!d.querySelector("input").checked);
  d.querySelector("input").checked = true;
  d.querySelector("[data-save-privacy]").click();
  assert.equal(externalAllowed(), true);
  assert(!document.querySelector("#privacyDialog"));
  sessionStorage.setItem(
    CONSENT_KEY,
    JSON.stringify({
      version: 2,
      external: true,
      savedAt: Date.now() - CONSENT_TTL - 1,
    }),
  );
  assert.equal(externalAllowed(), false);
  sessionStorage.setItem(CONSENT_KEY, "{broken");
  assert.equal(externalAllowed(), false);
  for (const href of [
    "privacidad.html",
    "terminos.html",
    "cookies.html",
    "envios-cambios.html",
    "registro.html",
    "iniciar-sesion.html",
  ])
    assert(document.querySelector(`#footer a[href="${href}"]`));
});
