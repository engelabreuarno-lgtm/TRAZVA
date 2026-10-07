// TRAZVA — ui / feedback
import { $ } from "../core/dom.js";

export let toastTimer;

export function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3800);
}
