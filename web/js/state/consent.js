import { CONSENT_KEY, CONSENT_TTL } from "../data/legal.js";
const sessionChoices = new WeakMap();
export function privacyChoice() {
  let value;
  try {
    value =
      JSON.parse(sessionStorage.getItem(CONSENT_KEY)) ??
      sessionChoices.get(document);
  } catch {
    value = sessionChoices.get(document);
  }
  if (
    !value ||
    value.version !== 2 ||
    typeof value.external !== "boolean" ||
    !Number.isFinite(value.savedAt) ||
    value.savedAt > Date.now() ||
    Date.now() - value.savedAt >= CONSENT_TTL
  )
    return null;
  return value;
}
export const externalAllowed = () => privacyChoice()?.external === true;
export function savePrivacyChoice(external) {
  const value = {
    version: 2,
    external: external === true,
    savedAt: Date.now(),
  };
  let persisted = true;
  try {
    sessionStorage.setItem(CONSENT_KEY, JSON.stringify(value));
    sessionChoices.delete(document);
  } catch {
    persisted = false;
    sessionChoices.set(document, value);
  }
  document.dispatchEvent(new window.Event("trazva:privacy"));
  return persisted;
}

export function resetPrivacyChoice() {
  try { sessionStorage.removeItem(CONSENT_KEY); } catch {}
  sessionChoices.delete(document);
  document.dispatchEvent(new window.Event("trazva:privacy"));
}

export function beginPrivacyVisit() {
  // An old persistent choice must not silently authorize this new visit.
  try { localStorage.removeItem("trazva_privacy_v1"); } catch {}
  const navigation = window.performance.getEntriesByType?.("navigation")?.[0];
  const internal = document.referrer && new URL(document.referrer).origin === location.origin;
  if (navigation?.type === "navigate" && !internal) resetPrivacyChoice();
}
