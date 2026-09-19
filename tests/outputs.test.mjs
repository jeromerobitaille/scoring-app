// Modèle des sorties : migration des anciens réglages, validation, modèles par discipline, recadrage.
import assert from "node:assert/strict";
const m = await import("../src/state/model.js");
const o = await import("../src/state/outputs.js");
const b = await import("../src/state/bindings.js");

// 1. État 1.0.9 (bandeaux + canevas + réglages du tableau) → sorties
const legacy = {
  eventName: "Monte de taureaux", scoreMode: "higher", entries: [],
  banners: [{ id: "primary", label: "Arène", width: 2000, height: 200, pageSize: 4, nameScale: 1.2, scoreScale: 0.9, showLogo: false }, { id: "secondary", label: "Régie", width: 1920, height: 144, pageSize: 2 }],
  canvas: { width: 1920, height: 1080, background: "blue", banners: [
    { id: "c1", kind: "banner", label: "Bandeau", x: 0, y: 0, width: 1920, height: 216, pageSize: 3 },
    { id: "c2", kind: "timer", label: "Chrono", x: 1280, y: 300, width: 640, height: 160, showName: true, align: "right", timeScale: 1.2 },
    { id: "c3", kind: "graphic", label: "Info", x: 100, y: 800, width: 1700, height: 250, image: "/media/x.jpg", keyColor: "#00ff00", keyTolerance: 0.4, hideWhenEmpty: true, animate: true,
      layers: [{ id: "l1", text: "{competitor.name}", x: 40, y: 20, width: 800, height: 60, font: "timmons", size: 54, color: "#ffffff", align: "left", valign: "middle", uppercase: true }] },
    { id: "c4", kind: "lowerThird" },
  ] },
  displayPageSize: 7, displayRotationMs: 8000, displayShowPagination: false, showDisplayLogo: true, displayShowHero: true, bannerTimerShowName: true,
  look: { headerTitle: "FWST", showHometown: false },
};
let s = m.normalizeState(legacy);
assert.equal(s.outputs.length, 4);
for (const k of o.LEGACY_STATE_KEYS) assert.equal(k in s, false, `clé obsolète retirée : ${k}`);
const [display, b0, b1, canvas] = s.outputs;
assert.equal(display.legacy, "display");
const table = display.elements.find((e) => e.kind === "table");
assert.equal(table.pageSize, 7);
assert.equal(table.rotationMs, 8000);
assert.equal(table.showPagination, false);
assert.equal(table.showHometown, false);
assert.ok(display.elements.some((e) => e.kind === "text" && e.text === "FWST"));
assert.ok(display.elements.some((e) => e.kind === "text" && e.text === "{competitor.name}" && e.needsCompetitor));
assert.equal(b0.legacy, "banner:0"); assert.equal(b0.name, "Arène"); assert.equal(b0.width, 2000);
const car = b0.elements.find((e) => e.kind === "carousel");
assert.equal(car.pageSize, 4); assert.equal(car.nameScale, 1.2); assert.equal(car.scoreScale, 0.9);
assert.equal(car.badgeScale, 1); assert.equal(car.nameFont, "theme"); assert.equal(car.cardFill, "card");
assert.deepEqual(car.states, { none: false, running: false, results: true });
assert.ok(b0.elements.some((e) => e.kind === "text" && e.text === "{discipline}" && e.states.none && !e.states.results));
const t0 = b0.elements.find((e) => e.kind === "timer");
assert.equal(t0.showName, true); assert.deepEqual(t0.states, { none: false, running: true, results: false });
assert.equal(b1.legacy, "banner:1"); assert.equal(b1.name, "Régie");
assert.equal(canvas.legacy, "canvas"); assert.equal(canvas.background, "blue");
const solo = canvas.elements.filter((e) => e.kind === "timer").find((e) => e.x === 1280);
assert.equal(solo.showName, true); assert.equal(solo.align, "right"); assert.equal(solo.fill, "card");
const img = canvas.elements.find((e) => e.kind === "image" && e.src === "/media/x.jpg");
assert.equal(img.keyColor, "#00ff00"); assert.equal(img.needsCompetitor, true);
const layer = canvas.elements.find((e) => e.kind === "text" && e.text === "{competitor.name}" && e.x === 140);
assert.equal(layer.y, 820); assert.equal(layer.font, "timmons"); assert.equal(layer.autoFit, false);

// 2. Idempotence
assert.deepEqual(m.normalizeState(s), s);

// 3. État vierge → tableau + 2 bandeaux + canevas vide
const fresh = m.normalizeState({});
assert.equal(fresh.outputs.length, 4);
assert.equal(fresh.outputs[3].elements.length, 0);
assert.equal(fresh.outputs[1].width, 2592);

// 4. Bornes des éléments
const out = o.normalizeOutput({ name: "x", width: 1000, height: 500, background: "#ABCDEF", legacy: "nope", elements: [
  { kind: "text", x: 5000, y: -9000, width: 99999, height: 1, text: "a", color: "muted", states: { none: false } },
  { kind: "bogus" }, null, { kind: "image", src: "asset:logo" },
] });
assert.equal(out.background, "#abcdef"); assert.equal(out.legacy, null); assert.equal(out.elements.length, 2);
assert.equal(out.elements[0].width, 1000); assert.equal(out.elements[0].x, 992); assert.equal(out.elements[0].y, -500);
assert.equal(o.normalizeElement({ kind: "text", color: "#12345G" }).color, "text");
const c = o.normalizeElement({ kind: "carousel", pageSize: 99, badgeScale: 9, nameFont: "nope", cardBorderColor: "#FFF000", cardRadius: 500 });
assert.equal(c.pageSize, 8); assert.equal(c.badgeScale, 2.5); assert.equal(c.nameFont, "theme");
assert.equal(c.cardBorderColor, "#fff000"); assert.equal(c.cardRadius, 200);
assert.equal(o.normalizeElement({ kind: "timer", font: "texasTango" }).font, "texasTango");

// 5. Variables
const ctx = { current: null, ranked: [{ id: "a", name: "A", parsed: 12, rank: 1 }], scoreMode: "lower", eventName: "Barils", rodeoName: "R", timerFrame: null };
assert.equal(b.resolveTemplate("{scoreModeLabel} · {unit} · {count}", ctx), "Temps — le plus bas gagne · s · 1");

// 6. Modèles par discipline
{
  const base = m.normalizeState({});
  const d0 = base.disciplines[0].id;
  const out0 = { ...base.outputs[0], variants: { [d0]: [{ kind: "text", text: "spécial" }], ghost: [{ kind: "text" }] } };
  const s2 = m.normalizeState({ ...base, outputs: [out0, ...base.outputs.slice(1)] });
  const o0 = s2.outputs[0];
  assert.deepEqual(Object.keys(o0.variants), [d0]);
  assert.equal(o.elementsFor(o0, d0)[0].text, "spécial");
  assert.equal(o.elementsFor(o0, base.disciplines[1].id), o0.elements);
  assert.notEqual(o.cloneElements(o0.elements)[0].id, o0.elements[0].id);
  assert.deepEqual(m.normalizeState(s2), s2);
}

// 7. Recadrage
assert.equal(o.normalizeCrop({ x: 0, y: 0, w: 1, h: 1 }), null);
assert.deepEqual(o.normalizeCrop({ x: 0.5, y: 0.2, w: 0.8, h: 0.5 }), { x: 0.2, y: 0.2, w: 0.8, h: 0.5 });
assert.equal(o.normalizeElement({ kind: "image", crop: "bogus" }).crop, null);
console.log("outputs OK");
