import { initModelPreviews } from "./js/features/model-preview.js";
import { initRunning } from "./js/features/running.js";
import { initStudio } from "./js/features/studio.js";
import { initBrand } from "./js/ui/brand.js";
import { initWebMCP } from "./js/features/webmcp.js";
// TRAZVA — arranque de la aplicación y eventos compartidos
import { renderChrome, updateCount } from "./js/ui/chrome.js";
import { $$, $ } from "./js/core/dom.js";
import { products } from "./js/data/catalog.js";
import {
  card,
  toggleFavorite,
  initCatalog,
  syncFavorites,
  renderCatalog,
} from "./js/features/catalog.js";
import { openProduct } from "./js/features/product.js";
import { initCart, renderCart } from "./js/features/cart.js";
import { initContact } from "./js/features/contact.js";
import { initMotion, motionEnabled } from "./js/core/motion.js";
import { initHeroModel } from "./js/features/hero.js";
import { initFinder } from "./js/features/finder.js";
import { memory } from "./js/state/store.js";

function init() {
  renderChrome();
  initBrand();
  const featured = $("#featuredGrid");
  if (featured)
    featured.innerHTML = [products[0], products[1], products[2]]
      .map(card)
      .join("");
  document.addEventListener("click", (e) => {
    const favorite = e.target.closest("[data-favorite]");
    if (favorite) {
      toggleFavorite(+favorite.dataset.favorite);
      return;
    }
    const product = e.target.closest("[data-product]");
    if (product) openProduct(+product.dataset.product);
  });
  initCatalog();
  initCart();
  initContact();
  initMotion();
  initHeroModel();
  initFinder();
  initRunning();
  initStudio();
  initWebMCP();
  initModelPreviews();
  const requestedProduct = Number(
    new URLSearchParams(location.search).get("product"),
  );
  if (products.some((p) => p.id === requestedProduct))
    openProduct(requestedProduct);
  if (motionEnabled() && "IntersectionObserver" in window) {
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            obs.unobserve(entry.target);
          }
        }),
      { threshold: 0.07 },
    );
    $$(
      ".section-top,.editorial,.philosophy,.collection-banner,.discovery-heading,.style-path,.fit-finder",
    ).forEach((el) => {
      if (el.getBoundingClientRect().top > innerHeight) {
        el.classList.add("reveal-ready");
        obs.observe(el);
      }
    });
  }
}

window.addEventListener("storage", (e) => {
  if (e.key) delete memory[e.key];
  else Object.keys(memory).forEach((key) => delete memory[key]);
  updateCount();
  syncFavorites();
  renderCart();
  renderCatalog();
});

document.addEventListener("DOMContentLoaded", init);
