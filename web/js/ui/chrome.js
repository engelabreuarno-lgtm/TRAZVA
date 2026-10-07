// TRAZVA — ui / chrome
import { $, icon, $$ } from "../core/dom.js";
import { getCart } from "../state/store.js";

export function logo() {
  return '<span class="logo-mark" aria-hidden="true">≋</span>trazva';
}

export function renderChrome() {
  const page = document.body.dataset.page;
  $("#header").innerHTML =
    `<div class="announcement">UNA SELECCIÓN CON INTENCIÓN <span>✳</span> SNEAKERS CON CARÁCTER</div><nav class="navbar wrap" aria-label="Navegación principal"><a class="logo" href="index.html" aria-label="TRAZVA, inicio">${logo()}</a><div class="nav-links" id="navLinks"><a href="index.html" ${page === "index" ? 'aria-current="page"' : ""}>Inicio</a><a href="showroom.html" ${page === "showroom" ? 'aria-current="page"' : ""}>La colección</a><a href="studio.html" ${page === "studio" ? 'aria-current="page"' : ""}>Mi estudio</a><a href="contact.html" ${page === "contact" ? 'aria-current="page"' : ""}>Contacto</a></div><div class="nav-actions"><a class="icon-button" href="showroom.html?search=1" aria-label="Buscar un par">${icon("search")}</a><a class="icon-button" href="showroom.html?fav=1" aria-label="Ver favoritos">${icon("heart")}</a><a class="bag-link" href="cart.html" ${page === "cart" ? 'aria-current="page"' : ""}>${icon("bag")}<span class="bag-label">Tu bolsa</span><span class="cart-count">0</span></a><button class="icon-button mobile-toggle" aria-expanded="false" aria-controls="navLinks" aria-label="Abrir menú">${icon("menu")}</button></div></nav>`;
  $("#footer").innerHTML =
    `<div class="wrap"><div class="footer-top"><div class="footer-brand"><a class="logo" href="index.html" aria-label="TRAZVA, inicio">${logo()}</a><p>Buenos pares. Cero reglas.<br>Camina a tu manera.</p></div><div class="footer-links"><div><p>EXPLORA</p><a href="showroom.html">La colección</a><a href="index.html#encuentra-tu-par">Encuentra tu par</a><a href="studio.html">Mi estudio</a><a href="showroom.html?fav=1">Tus favoritos</a><a href="cart.html">Tu selección</a></div><div><p>TRAZVA</p><a href="informacion.html">Información del estudio</a><a href="contact.html">Contacto y preguntas</a><a href="#contenido">Volver arriba ↑</a><button id="motionToggle" type="button" aria-pressed="false">Reducir movimiento</button></div></div></div><div class="footer-bottom"><span>© 2026 TRAZVA · HECHO PARA DEJAR HUELLA.</span><p class="footer-demo">TRAZVA está en prelanzamiento. Precios ilustrativos; sin pagos ni envíos. <a href="informacion.html">Información</a> · <a href="Models/CREDITOS.html">Créditos y licencias</a>. Marcas de sus respectivos titulares.</p></div></div>`;
  $$("[data-icon]").forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
  const toggle = $(".mobile-toggle");
  const nav = $("#navLinks");
  function closeNav() {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menú");
    toggle.innerHTML = icon("menu");
  }
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    toggle.innerHTML = icon(open ? "close" : "menu");
  });
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) closeNav();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("open")) {
      closeNav();
      toggle.focus();
    }
  });
  document.addEventListener("click", (e) => {
    if (!e.composedPath().includes($("#header"))) closeNav();
  });
  updateCount();
}

export function updateCount() {
  const count = getCart().reduce((n, r) => n + r.qty, 0);
  $$(".cart-count").forEach((el) => {
    el.textContent = count;
    el.setAttribute("aria-label", `${count} artículos en la bolsa`);
  });
}
