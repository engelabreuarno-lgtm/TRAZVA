// TRAZVA — core / motion
import { $$, $ } from "./dom.js";

export const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

export function motionEnabled() {
  return (
    !reducedMotion.matches && document.documentElement.dataset.motion !== "off"
  );
}

export function animateFavorite(id) {
  if (!motionEnabled()) return;
  $$(`[data-favorite="${id}"]`).forEach((el) =>
    el.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.25)" },
        { transform: "scale(1)" },
      ],
      { duration: 310, easing: "ease-out" },
    ),
  );
}

export function animateBag() {
  if (!motionEnabled()) return;
  $$(".cart-count").forEach((el) =>
    el.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.35)", background: "#6b8238" },
        { transform: "scale(1)" },
      ],
      { duration: 480, easing: "ease-out" },
    ),
  );
}

export function initMotion() {
  const toggle = $("#motionToggle");
  function apply() {
    let userOff = false;
    try {
      userOff = localStorage.getItem("solevault_motion") === "off";
    } catch {}
    const off = reducedMotion.matches || userOff;
    document.documentElement.dataset.motion = off ? "off" : "on";
    if (toggle) {
      toggle.setAttribute("aria-pressed", String(off));
      toggle.textContent = off ? "Movimiento reducido ✓" : "Reducir movimiento";
      toggle.disabled = reducedMotion.matches;
    }
    if (off) $$(".reveal-ready").forEach((el) => el.classList.add("visible"));
    document.dispatchEvent(new Event("solevault:motion"));
  }
  apply();
  reducedMotion.addEventListener("change", apply);
  toggle?.addEventListener("click", () => {
    const off = document.documentElement.dataset.motion !== "off";
    try {
      localStorage.setItem("solevault_motion", off ? "off" : "on");
    } catch {}
    document.documentElement.dataset.motion = off ? "off" : "on";
    toggle.setAttribute("aria-pressed", String(off));
    toggle.textContent = off ? "Movimiento reducido ✓" : "Reducir movimiento";
    if (off) $$(".reveal-ready").forEach((e) => e.classList.add("visible"));
    document.dispatchEvent(new Event("solevault:motion"));
  });
  const header = $("#header");
  let queued = false;
  function progress() {
    queued = false;
    const range = document.documentElement.scrollHeight - innerHeight;
    header.style.setProperty(
      "--scroll-progress",
      range > 0 ? Math.min(1, Math.max(0, scrollY / range)) : 0,
    );
    header.classList.toggle("scrolled", scrollY > 30);
  }
  const scheduleProgress = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(progress);
    }
  };
  addEventListener("scroll", scheduleProgress, { passive: true });
  addEventListener("resize", scheduleProgress);
  // Filters, expanded sections and async cards change the document height.
  if ("ResizeObserver" in window)
    new ResizeObserver(scheduleProgress).observe(document.body);
  progress();
  const hero = $(".hero-visual");
  if (hero && matchMedia("(hover:hover) and (pointer:fine)").matches) {
    hero.addEventListener("pointermove", (e) => {
      if (!motionEnabled()) return;
      const r = hero.getBoundingClientRect();
      hero.style.setProperty(
        "--hero-x",
        `${(e.clientX - r.left - r.width / 2) * 0.012}px`,
      );
      hero.style.setProperty(
        "--hero-y",
        `${(e.clientY - r.top - r.height / 2) * 0.012}px`,
      );
    });
    hero.addEventListener("pointerleave", () => {
      hero.style.setProperty("--hero-x", "0px");
      hero.style.setProperty("--hero-y", "0px");
    });
  }
}
