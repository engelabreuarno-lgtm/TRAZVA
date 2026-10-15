import { CONSENT_KEY, CONSENT_TTL } from "../data/legal.js";
const sessionChoices = new WeakMap();
export function privacyChoice() {
  let value;
  try {
    value =
      JSON.parse(localStorage.getItem(CONSENT_KEY)) ??
      sessionChoices.get(document);
  } catch {
    value = sessionChoices.get(document);
  }
  if (
    !value ||
    value.version !== 1 ||
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
    version: 1,
    external: external === true,
    savedAt: Date.now(),
  };
  let persisted = true;
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
    sessionChoices.delete(document);
  } catch {
    persisted = false;
    sessionChoices.set(document, value);
  }
  document.dispatchEvent(new window.Event("trazva:privacy"));
  return persisted;
}
