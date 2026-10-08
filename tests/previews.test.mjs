import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { runningProducts } from "../web/js/data/running.js";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function fixture(t, { sdk = true } = {}) {
  const dom = new JSDOM("<!doctype html><body></body>", {
    url: "https://trazva.test/showroom.html",
    pretendToBeVisual: true,
  });
  const w = dom.window;
  for (const key of [
    "window",
    "document",
    "location",
    "localStorage",
    "MutationObserver",
  ])
    globalThis[key] = key === "window" ? w : w[key];
  globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });
  const observers = [];
  globalThis.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }
    observe() {}
    unobserve() {}
  };
  const sessions = [];
  class Sketchfab {
    constructor(version, frame) {
      this.frame = frame;
    }
    init(id, options) {
      const events = new Map();
      const session = {
        id,
        options,
        frame: this.frame,
        starts: 0,
        stops: 0,
        ready: () => events.get("viewerready")?.(),
        api: {
          addEventListener: (name, handler) => events.set(name, handler),
          start: () => session.starts++,
          stop: () => session.stops++,
        },
      };
      sessions.push(session);
      options.success(session.api);
    }
  }
  if (sdk) w.Sketchfab = Sketchfab;
  const { runningCard } = await import("../web/js/features/running.js");
  const { initModelPreviews, modelPreview } =
    await import("../web/js/features/model-preview.js");
  document.body.innerHTML = runningProducts.map(runningCard).join("");
  initModelPreviews();
  const hosts = [...document.querySelectorAll("[data-model-preview]")];
  async function show(list, visible = true) {
    observers[0].callback(
      list.map((target) => ({ target, isIntersecting: visible })),
    );
    await flush();
  }
  t.after(async () => {
    document.body.replaceChildren();
    await flush();
    w.close();
  });
  return { w, hosts, sessions, show, modelPreview, Sketchfab };
}

test("Running covers contain the model before the name, with no photos or nested iframe buttons", async (t) => {
  const { hosts, modelPreview } = await fixture(t);
  assert.equal(hosts.length, 4);
  assert.equal(
    document.querySelectorAll("img, .run-card-dimensional, iframe").length,
    0,
  );
  for (const host of hosts) {
    assert(host.closest(".product-image"));
    assert(!host.closest("button"));
    assert(!host.hasAttribute("aria-hidden"));
    const card = host.closest(".product-card");
    assert.equal(card.firstElementChild, host.parentElement);
    assert(card.querySelector(".product-info h3 [data-product]"));
    assert(card.querySelector("[data-favorite]"));
    assert(card.querySelector("[data-save-run]"));
    assert(card.querySelector("[data-compare]"));
  }
  // Finder buttons must not receive an interactive embed inside another control.
  assert.equal(modelPreview(runningProducts[0]), "");
});

test("External models load near the viewport, two at a time, using each shoe's exact source", async (t) => {
  const { hosts, sessions, show } = await fixture(t);
  await flush();
  assert.equal(sessions.length, 0);
  await show(hosts);
  assert.equal(sessions.length, 2);
  sessions[0].ready();
  await flush();
  assert.equal(sessions.length, 3);
  sessions[1].ready();
  await flush();
  assert.equal(sessions.length, 4);
  sessions.slice(2).forEach((s) => s.ready());
  assert.deepEqual(
    sessions.map((s) => s.id),
    runningProducts.map((p) => p.embed),
  );
  assert(hosts.every((host) => host.classList.contains("preview-ready")));
  for (const session of sessions) {
    assert.equal(session.options.preload, 0);
    assert.equal(session.options.animation_autoplay, 0);
    assert.equal(session.options.autospin, 0);
    assert(!("ui_watermark" in session.options));
    assert(
      session.frame.title.includes(
        runningProducts.find((p) => p.embed === session.id).name,
      ),
    );
    assert(!session.frame.hasAttribute("tabindex"));
  }
});

test("Ready previews pause off screen, behind a dialog and in a hidden tab; resume on return", async (t) => {
  const { w, hosts, sessions, show } = await fixture(t);
  await show([hosts[0]]);
  sessions[0].ready();
  const session = sessions[0];
  assert.equal(session.starts, 1);
  await show([hosts[0]], false);
  assert.equal(session.stops, 1);
  await show([hosts[0]]);
  assert.equal(session.starts, 2);
  document.body.classList.add("locked");
  await flush();
  assert.equal(session.stops, 2);
  document.body.classList.remove("locked");
  await flush();
  assert.equal(session.starts, 3);
  Object.defineProperty(document, "hidden", {
    value: true,
    configurable: true,
  });
  document.dispatchEvent(new w.Event("visibilitychange"));
  assert.equal(session.stops, 3);
  Object.defineProperty(document, "hidden", {
    value: false,
    configurable: true,
  });
  document.dispatchEvent(new w.Event("visibilitychange"));
  assert.equal(session.starts, 4);
  hosts[0].remove();
  await flush();
  assert.equal(session.stops, 4);
  assert(!session.frame.isConnected);
});

test("Filtering during loading frees the queue; late callbacks cannot restore removed views", async (t) => {
  const { hosts, sessions, show } = await fixture(t);
  await show(hosts);
  const removed = sessions[0];
  hosts[0].remove();
  await flush();
  assert.equal(sessions.length, 3);
  assert(!removed.frame.isConnected);
  removed.ready();
  assert(!hosts[0].classList.contains("preview-ready"));
  sessions[1].options.error();
  await flush();
  assert.equal(sessions.length, 4);
  assert(hosts[1].classList.contains("preview-failed"));
  assert.equal(hosts[1].querySelectorAll("iframe, img").length, 0);
  assert.match(hosts[1].textContent, /Abre la ficha/);
  assert(hosts[1].closest("article").querySelector("[data-product]"));
  sessions.slice(2).forEach((s) => s.ready());
});

test("Removing a preview while the SDK loads leaves no orphan iframe", async (t) => {
  const { w, hosts, sessions, show, Sketchfab } = await fixture(t, {
    sdk: false,
  });
  await show([hosts[0]]);
  const script = document.querySelector('script[src*="sketchfab-viewer"]');
  assert(script);
  hosts[0].remove();
  await flush();
  w.Sketchfab = Sketchfab;
  script.dispatchEvent(new w.Event("load"));
  await flush();
  assert.equal(sessions.length, 0);
  assert.equal(document.querySelectorAll("iframe").length, 0);
});
