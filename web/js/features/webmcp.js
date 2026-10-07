import { products } from "../data/catalog.js";
import { normalize } from "../core/dom.js";
import { openProduct } from "./product.js";
export function initWebMCP() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  const tools = [
    {
      name: "search_trazva_catalog",
      title: "Explorar catálogo TRAZVA",
      description:
        "Consulta modelos de referencia. No comprueba inventario ni crea pedidos.",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        if (
          !input ||
          typeof input !== "object" ||
          (input.query !== undefined && typeof input.query !== "string")
        )
          throw Error("query debe ser texto");
        const query = normalize(input.query || "");
        return products
          .filter((p) => normalize(p.name + " " + p.brand).includes(query))
          .map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            currency: "USD",
            stockVerified: false,
          }));
      },
    },
    {
      name: "open_trazva_product",
      title: "Abrir una ficha de producto",
      description:
        "Abre la ficha de un modelo; no añade a la bolsa ni realiza compras.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "integer" } },
        required: ["id"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (
          !input ||
          !Number.isInteger(input.id) ||
          !products.some((p) => p.id === input.id)
        )
          throw Error("Modelo no válido");
        openProduct(input.id);
        return { id: input.id, opened: true };
      },
    },
  ];
  for (const tool of tools) {
    try {
      Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {}
  }
  addEventListener("pagehide", () => lifecycle.abort(), { once: true });
}
