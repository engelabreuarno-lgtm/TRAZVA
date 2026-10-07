import { brand } from "../data/brand.js";
export function initBrand() {
  const footer = document.querySelector(".footer-links");
  if (!footer) return;
  const block = document.createElement("div");
  block.innerHTML =
    '<p>LA MARCA</p><a href="marca.html">Deja huella</a><a href="informacion.html">Antes de elegir</a>';
  for (const [network, url] of Object.entries(brand.social)) {
    if (!url) continue;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") continue;
      const a = document.createElement("a");
      a.href = parsed.href;
      a.textContent = network[0].toUpperCase() + network.slice(1);
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      block.append(a);
    } catch {}
  }
  footer.append(block);
  const announcement = document.querySelector(".announcement");
  if (announcement)
    announcement.innerHTML = `DE LA CALLE A TU PRÓXIMA META <span aria-hidden="true">✳</span> MUÉVETE A TU MANERA`;
}
