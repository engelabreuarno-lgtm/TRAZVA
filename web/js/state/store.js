// TRAZVA — state / store
import { toast } from "../ui/feedback.js";
import { products } from "../data/catalog.js";

export const keys = {
  cart: "solevault_v3_cart",
  favorites: "solevault_v3_favorites",
  coupon: "solevault_v3_coupon",
};

export const memory = {};

export let storageWarning = false;

export function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? memory[key] ?? fallback;
  } catch {
    return memory[key] ?? fallback;
  }
}

export function write(key, value) {
  memory[key] = value;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    if (!storageWarning) {
      toast(
        "El navegador no permite guardar datos. Tu selección durará esta sesión.",
      );
      storageWarning = true;
    }
  }
}

export function getFavorites() {
  const a = read(keys.favorites, []);
  return Array.isArray(a)
    ? [...new Set(a.filter((id) => products.some((p) => p.id === id)))]
    : [];
}

export function getCart() {
  const a = read(keys.cart, []);
  if (!Array.isArray(a)) return [];
  return a
    .filter((r) => {
      const p = products.find((p) => p.id === r?.id);
      return (
        p &&
        p.sizes.includes(r.size) &&
        !p.unavailable.includes(r.size) &&
        Number.isInteger(r.qty) &&
        r.qty > 0 &&
        r.qty <= 10
      );
    })
    .map((r) => ({ id: r.id, size: r.size, qty: r.qty }));
}

export function coupon() {
  const code = read(keys.coupon, "");
  return ["TRAZVA10", "VAULT10", "SOLE15"].includes(code) ? code : "";
}

export function totals() {
  const subtotal = getCart().reduce(
    (n, r) => n + products.find((p) => p.id === r.id).price * r.qty,
    0,
  );
  const discount =
    subtotal *
    (["TRAZVA10", "VAULT10"].includes(coupon())
      ? 0.1
      : coupon() === "SOLE15"
        ? 0.15
        : 0);
  const discounted = Math.round((subtotal - discount) * 100) / 100;
  const shipping = discounted === 0 || discounted >= 200 ? 0 : 12;
  return {
    subtotal,
    discount,
    shipping,
    total: discounted + shipping,
    discounted,
  };
}
