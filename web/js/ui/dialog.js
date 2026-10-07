// TRAZVA — ui / dialog
import { $, icon } from "../core/dom.js";
import { motionEnabled } from "../core/motion.js";

export let lastFocus = null;

export function openDialog(html, cls = "") {
  const old = $("#activeDialog");
  const returnFocus = old ? lastFocus : document.activeElement;
  if (old) {
    old.close();
    old.remove();
  }
  lastFocus = returnFocus;
  const d = document.createElement("dialog");
  d.id = "activeDialog";
  d.className = cls;
  d.innerHTML = `<button class="dialog-close" aria-label="Cerrar ventana">${icon("close")}</button>${html}`;
  d.setAttribute("aria-labelledby", "dialogTitle");
  document.body.append(d);
  document.body.classList.add("locked");
  $(".dialog-close", d).addEventListener("click", () => closeDialog(d));
  d.addEventListener("cancel", (e) => {
    e.preventDefault();
    closeDialog(d);
  });
  d.addEventListener("click", (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        closeDialog(d);
    }
  });
  d.addEventListener(
    "close",
    () => {
      d.remove();
      const anotherDialog = document.querySelector("dialog[open]");
      document.body.classList.toggle("locked", Boolean(anotherDialog));
      if (!anotherDialog && returnFocus?.isConnected) returnFocus.focus();
    },
    { once: true },
  );
  d.showModal();
  return d;
}

export function closeDialog(dialog) {
  if (!dialog?.open || dialog.classList.contains("closing")) return;
  if (!motionEnabled()) {
    dialog.close();
    return;
  }
  dialog.classList.add("closing");
  setTimeout(() => {
    if (dialog.open) dialog.close();
  }, 160);
}
