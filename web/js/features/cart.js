// TRAZVA — features / cart
import { $, esc, money, icon, $$ } from "../core/dom.js";
import { getCart, totals, coupon, write, keys } from "../state/store.js";
import { products } from "../data/catalog.js";
import { modelPreview } from "./model-preview.js";
import { updateCount } from "../ui/chrome.js";
import { toast } from "../ui/feedback.js";
import { openDialog } from "../ui/dialog.js";

export function renderCart() {
  const el = $("#cartItemsList");
  if (!el) return;
  const rows = getCart();
  el.innerHTML = rows.length
    ? rows
        .map((r, i) => {
          const p = products.find((p) => p.id === r.id);
          return `<article class="cart-item"><button data-product="${p.id}" aria-label="Ver ${esc(p.name)}" class="cart-model">${modelPreview(p)}</button><div><p class="eyebrow">${p.brand}</p><h3>${p.name}</h3><p>${p.color} · US ${r.size}</p><button class="remove-item" data-remove="${i}" aria-label="Eliminar ${p.name}, talla ${r.size}">Eliminar</button></div><div class="cart-item-end"><strong>${money(p.price * r.qty)}</strong><div class="quantity"><button data-qty="${i}" data-delta="-1" aria-label="Quitar una unidad de ${p.name}">−</button><span aria-label="Cantidad">${r.qty}</span><button data-qty="${i}" data-delta="1" ${r.qty >= 10 ? "disabled" : ""} aria-label="Añadir una unidad de ${p.name}">+</button></div></div></article>`;
        })
        .join("")
    : `<div class="empty-state">${icon("bag")}<h2>Espacio para algo bueno.</h2><p>Tu bolsa está vacía. Encuentra el par que va contigo.</p><a class="button dark" href="showroom.html">Explorar la colección <span>↗</span></a></div>`;
  const t = totals();
  $("#subtotalVal").textContent = money(t.subtotal);
  $("#discountRow").hidden = !t.discount;
  $("#discountLabel").textContent = `Descuento (${coupon()})`;
  $("#discountVal").textContent = "−" + money(t.discount);
  $("#shippingVal").textContent = !rows.length
    ? "—"
    : t.shipping
      ? money(t.shipping)
      : "Gratis";
  $("#totalVal").textContent = money(t.total);
  $("#shippingHint").textContent = !rows.length
    ? "Envío estimado gratis desde USD 200."
    : t.shipping
      ? `Faltan ${money(200 - t.discounted)} para envío estimado gratis.`
      : "Tu selección alcanza el envío estimado gratis.";
  $("#shippingProgress").style.width = Math.min(100, t.discounted / 2) + "%";
  $("#couponInput").value = coupon();
  $("#checkoutBtn").disabled = !rows.length;
}

export function initCart() {
  if (!$("#cartItemsList")) return;
  $("#cartItemsList").addEventListener("click", (e) => {
    const b = e.target.closest("[data-qty],[data-remove]");
    if (!b) return;
    const rows = getCart();
    const index = +(b.dataset.qty ?? b.dataset.remove);
    const r = rows[index];
    if (!r) return;
    const focusLabel = b.getAttribute("aria-label");
    if (b.hasAttribute("data-remove")) rows.splice(index, 1);
    else {
      r.qty += +b.dataset.delta;
      if (r.qty <= 0) rows.splice(index, 1);
      else r.qty = Math.min(10, r.qty);
    }
    write(keys.cart, rows);
    renderCart();
    updateCount();
    const target =
      $$("button", $("#cartItemsList")).find(
        (x) => x.getAttribute("aria-label") === focusLabel,
      ) || $("button,a", $("#cartItemsList"));
    target?.focus();
  });
  $("#couponForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const code = $("#couponInput").value.trim().toUpperCase();
    if (code && !["TRAZVA10", "VAULT10", "SOLE15"].includes(code)) {
      toast("Ese código no es válido. Puedes probar TRAZVA10.");
      return;
    }
    write(keys.coupon, code);
    renderCart();
    toast(code ? "Descuento aplicado." : "Descuento eliminado.");
  });
  $("#checkoutBtn").addEventListener("click", () => {
    const rows = getCart();
    if (!rows.length) return;
    const t = totals();
    openDialog(
      `<p class="eyebrow">TU SELECCIÓN / DEMOSTRACIÓN</p><h2 id="dialogTitle">Buen gusto.<br>Gran elección.</h2><p>Este es el resumen de tu selección. El pago todavía no está habilitado: no se ha creado un pedido ni realizado ningún cobro.</p>${rows
        .map((r) => {
          const p = products.find((p) => p.id === r.id);
          return `<div class="review-line"><span>${p.name}<small>US ${r.size} · ${r.qty} unidad${r.qty > 1 ? "es" : ""}</small></span><span>${money(p.price * r.qty)}</span></div>`;
        })
        .join(
          "",
        )}<div class="review-line"><span>Descuento</span><span>−${money(t.discount)}</span></div><div class="review-line"><span>Envío estimado</span><span>${money(t.shipping)}</span></div><div class="review-line"><strong>Total estimado · USD</strong><strong>${money(t.total)}</strong></div><p class="demo-note">Impuestos no calculados. Tu bolsa permanece guardada en este navegador.</p><a class="button dark full" href="showroom.html">Seguir explorando <span>↗</span></a>`,
      "review-dialog",
    );
  });
  renderCart();
}
