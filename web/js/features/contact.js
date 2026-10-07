import { $ } from "../core/dom.js";
import { studioAPI } from "./studio-api.js";
export function initContact() {
  const form = $("#contactForm");
  if (!form) return;
  let id = crypto.randomUUID(),
    lastPayload = "";
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const button = $('button[type="submit"]', form),
      status = $("#contactStatus");
    if (button.disabled) return;
    const input = Object.fromEntries(new FormData(form));
    const serialized = JSON.stringify(input);
    if (lastPayload && lastPayload !== serialized) id = crypto.randomUUID();
    lastPayload = serialized;
    button.disabled = true;
    button.textContent = "Guardando consulta…";
    status.textContent = "";
    try {
      const response = await studioAPI("/requests", {
        method: "POST",
        body: JSON.stringify({ ...input, id }),
      });
      status.replaceChildren(
        document.createTextNode(
          `Consulta guardada. Referencia ${response.id.slice(0, 8).toUpperCase()}. `,
        ),
      );
      const link = document.createElement("a");
      link.href = "studio.html#consultas";
      link.textContent = "Ver en mi estudio ↗";
      status.append(link);
      form.reset();
      id = crypto.randomUUID();
      lastPayload = "";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
      button.innerHTML = "Guardar consulta <span>↗</span>";
    }
  });
}
