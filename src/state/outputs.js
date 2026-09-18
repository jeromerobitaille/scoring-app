/**
 * Sorties (tableau, bandeaux LED, canevas OBS…) : chaque sortie est une scène
 * de taille fixe composée d'éléments positionnés librement dans l'éditeur.
 *
 *   output = { id, name, width, height, background, legacy, elements: [Element] }
 *     background  "black" | "green" | "blue" | "transparent" | "look" (dégradé du thème) | "#rrggbb"
 *     legacy      "display" | "banner:0" | "banner:1" | "canvas" | null — ancienne
 *                 adresse (?display=1, ?banner=1&bid=0, ?canvas=1) qui ouvre cette sortie
 *
 *   Element (commun) = { id, kind, name, x, y, width, height, opacity, visible,
 *                        states: { none, running, results }, needsCompetitor, animate }
 *     states          les 3 états d'une sortie : aucun résultat / en course
 *                     (chrono affiché) / affichage des résultats ; l'élément n'est
 *                     rendu que dans les états cochés
 *     needsCompetitor masqué tant qu'aucun compétiteur n'est sélectionné
 *     animate         animation d'entrée quand le sujet (compétiteur, texte) change
 *
 *   kinds : text (texte avec variables), image (logo, infographie téléversée,
 *   couleur incrustée), card (fond/carte du thème), table (classement paginé),
 *   carousel (défilement de cartes de résultats, ex-bandeau), timer (chrono).
 */

import { FONTS } from "./look.js";

export const OUTPUT_STATES = [
  { key: "none", label: "Aucun résultat" },
  { key: "running", label: "En course" },
  { key: "results", label: "Affichage des résultats" },
];

export const BACKGROUNDS = {
  look: { label: "Dégradé du thème (Apparence)" },
  black: { label: "Noir" },
  green: { label: "Vert (chroma key)" },
  blue: { label: "Bleu (chroma key)" },
  transparent: { label: "Transparent (source navigateur OBS)" },
};

/** Couleurs de texte : une clé du thème ou un hexa. */
export const THEME_COLORS = [
  ["text", "Texte du thème"],
  ["muted", "Texte secondaire"],
  ["accent", "Accent"],
  ["accentText", "Texte sur accent"],
];

export const SIZE_PRESETS = [
  { label: "1920 × 1080 (écran, projecteur)", width: 1920, height: 1080 },
  { label: "1280 × 720", width: 1280, height: 720 },
  { label: "2592 × 216 (bandeau LED)", width: 2592, height: 216 },
  { label: "1920 × 216 (bandeau LED)", width: 1920, height: 216 },
  { label: "1920 × 144 (bandeau LED)", width: 1920, height: 144 },
];

const ALL_STATES = { none: true, running: true, results: true };

const COMMON = {
  name: "",
  x: 0,
  y: 0,
  width: 400,
  height: 100,
  opacity: 1,
  visible: true,
  states: ALL_STATES,
  needsCompetitor: false,
  animate: false,
};

export const ELEMENT_KINDS = {
  text: {
    label: "Texte",
    description: "Texte libre avec variables ({competitor.name}, {timer}…).",
    defaults: {
      width: 600,
      height: 80,
      text: "{competitor.name}",
      font: "system",
      size: 48,
      color: "text",
      align: "left",
      valign: "middle",
      bold: false,
      uppercase: false,
      shadow: false,
      letterSpacing: 0,
      lines: 1,
      autoFit: true,
      background: null,
      bgOpacity: 1,
      radius: 0,
      padding: 0,
    },
  },
  image: {
    label: "Image",
    description: "Logo, infographie téléversée ; une couleur peut être rendue transparente.",
    defaults: {
      width: 400,
      height: 200,
      src: "asset:logo",
      fit: "contain",
      keyColor: null,
      keyTolerance: 0.35,
    },
  },
  card: {
    label: "Carte",
    description: "Fond ou carte aux couleurs du thème, à placer derrière d'autres éléments.",
    defaults: {
      width: 800,
      height: 200,
      fill: "card",
      color: "#000000",
      fillOpacity: 0.92,
      border: true,
      radius: null,
      shadow: true,
      accentBar: "none",
    },
  },
  table: {
    label: "Tableau",
    description: "Classement paginé : rang, nom, ville, résultat.",
    defaults: {
      width: 1200,
      height: 600,
      pageSize: 5,
      rotationMs: 5000,
      showRank: true,
      showHometown: true,
      showUnit: true,
      showPagination: true,
      rowStyle: "card",
      fontScale: 1,
      emptyText: "En attente des premiers résultats…",
    },
  },
  carousel: {
    label: "Carrousel",
    description: "Cartes de résultats qui défilent (bandeau LED).",
    defaults: {
      width: 1600,
      height: 216,
      pageSize: 3,
      rotationMs: 5000,
      nameScale: 1,
      scoreScale: 1,
      showHometown: true,
      flashNew: true,
    },
  },
  timer: {
    label: "Chrono",
    description: "Temps en direct pendant la course, jusqu'à validation.",
    defaults: {
      width: 640,
      height: 160,
      showName: false,
      align: "center",
      timeScale: 1,
      fill: "none",
    },
  },
};

export const KIND_KEYS = Object.keys(ELEMENT_KINDS);

const HEX = /^#[0-9a-f]{6}$/i;
const hex = (v, fallback) => (typeof v === "string" && HEX.test(v) ? v.toLowerCase() : fallback);
const THEME_KEYS = new Set(THEME_COLORS.map(([k]) => k));
const num = (v, fb, min, max) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb;
};
const bool = (v, fb) => (v === undefined || v === null ? fb : Boolean(v));
const oneOf = (v, list, fb) => (list.includes(v) ? v : fb);
const str = (v, fb, max = 200) => (typeof v === "string" ? v.slice(0, max) : fb);

export const newId = (prefix = "el") => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

/** Couleur de texte : hexa ou clé du thème. */
export function textColor(value, fallback = "text") {
  if (THEME_KEYS.has(value)) return value;
  return hex(value, fallback);
}

export function normalizeElement(src, output) {
  if (!src || typeof src !== "object") return null;
  const kind = KIND_KEYS.includes(src.kind) ? src.kind : null;
  if (!kind) return null;
  const d = ELEMENT_KINDS[kind].defaults;
  const maxW = output?.width ?? 8000;
  const maxH = output?.height ?? 8000;
  const width = num(src.width, d.width, 8, maxW);
  const height = num(src.height, d.height, 8, maxH);
  const states = src.states && typeof src.states === "object" ? src.states : ALL_STATES;
  const base = {
    id: typeof src.id === "string" && src.id ? src.id : newId(),
    kind,
    name: str(src.name, "", 60) || ELEMENT_KINDS[kind].label,
    x: num(src.x, 0, -maxW, maxW - 8),
    y: num(src.y, 0, -maxH, maxH - 8),
    width,
    height,
    opacity: num(src.opacity, 1, 0, 1),
    visible: bool(src.visible, true),
    states: {
      none: bool(states.none, true),
      running: bool(states.running, true),
      results: bool(states.results, true),
    },
    needsCompetitor: bool(src.needsCompetitor, false),
    animate: bool(src.animate, false),
  };
  switch (kind) {
    case "text":
      return {
        ...base,
        text: str(src.text, d.text, 400),
        font: src.font in FONTS ? src.font : d.font,
        size: num(src.size, d.size, 6, 800),
        color: textColor(src.color, d.color),
        align: oneOf(src.align, ["left", "center", "right"], d.align),
        valign: oneOf(src.valign, ["top", "middle", "bottom"], d.valign),
        bold: bool(src.bold, d.bold),
        uppercase: bool(src.uppercase, d.uppercase),
        shadow: bool(src.shadow, d.shadow),
        letterSpacing: num(src.letterSpacing, d.letterSpacing, -0.1, 1),
        lines: num(src.lines, d.lines, 1, 6),
        autoFit: bool(src.autoFit, d.autoFit),
        background: src.background == null ? null : textColor(src.background, null),
        bgOpacity: num(src.bgOpacity, d.bgOpacity, 0, 1),
        radius: num(src.radius, d.radius, 0, 999),
        padding: num(src.padding, d.padding, 0, 400),
      };
    case "image":
      return {
        ...base,
        src: str(src.src, d.src, 2000),
        fit: oneOf(src.fit, ["contain", "cover", "fill"], d.fit),
        keyColor: hex(src.keyColor, null),
        keyTolerance: num(src.keyTolerance, d.keyTolerance, 0.05, 0.8),
      };
    case "card":
      return {
        ...base,
        fill: oneOf(src.fill, ["card", "background", "custom"], d.fill),
        color: hex(src.color, d.color),
        fillOpacity: num(src.fillOpacity, d.fillOpacity, 0, 1),
        border: bool(src.border, d.border),
        radius: src.radius == null ? null : num(src.radius, 0, 0, 400),
        shadow: bool(src.shadow, d.shadow),
        accentBar: oneOf(src.accentBar, ["none", "left", "top"], d.accentBar),
      };
    case "table":
      return {
        ...base,
        pageSize: Math.round(num(src.pageSize, d.pageSize, 1, 12)),
        rotationMs: num(src.rotationMs, d.rotationMs, 0, 60000),
        showRank: bool(src.showRank, d.showRank),
        showHometown: bool(src.showHometown, d.showHometown),
        showUnit: bool(src.showUnit, d.showUnit),
        showPagination: bool(src.showPagination, d.showPagination),
        rowStyle: oneOf(src.rowStyle, ["card", "line"], d.rowStyle),
        fontScale: num(src.fontScale, d.fontScale, 0.5, 2),
        emptyText: str(src.emptyText, d.emptyText, 120),
      };
    case "carousel":
      return {
        ...base,
        pageSize: Math.round(num(src.pageSize, d.pageSize, 1, 8)),
        rotationMs: num(src.rotationMs, d.rotationMs, 1000, 60000),
        nameScale: num(src.nameScale, d.nameScale, 0.6, 2),
        scoreScale: num(src.scoreScale, d.scoreScale, 0.6, 2),
        showHometown: bool(src.showHometown, d.showHometown),
        flashNew: bool(src.flashNew, d.flashNew),
      };
    case "timer":
      return {
        ...base,
        showName: bool(src.showName, d.showName),
        align: oneOf(src.align, ["left", "center", "right"], d.align),
        timeScale: num(src.timeScale, d.timeScale, 0.3, 2),
        fill: oneOf(src.fill, ["none", "card", "black"], d.fill),
      };
    default:
      return null;
  }
}

/** Nouvel élément d'un type, avec ses valeurs par défaut et un patch. */
export function createElement(kind, patch = {}, output = null) {
  const d = ELEMENT_KINDS[kind]?.defaults ?? {};
  return normalizeElement({ ...COMMON, ...d, kind, name: ELEMENT_KINDS[kind]?.label, ...patch, id: newId() }, output);
}

export function normalizeBackground(bg, fallback = "black") {
  if (typeof bg === "string" && bg in BACKGROUNDS) return bg;
  return hex(bg, fallback);
}

const LEGACY_KEYS = /^(display|canvas|banner:\d)$/;

export function normalizeOutput(src) {
  if (!src || typeof src !== "object") return null;
  const width = Math.round(num(src.width, 1920, 64, 8192));
  const height = Math.round(num(src.height, 1080, 32, 8192));
  const out = { width, height };
  const elements = Array.isArray(src.elements) ? src.elements.map((e) => normalizeElement(e, out)).filter(Boolean) : [];
  return {
    id: typeof src.id === "string" && src.id ? src.id : newId("out"),
    name: str(src.name, "", 60) || "Sortie",
    width,
    height,
    background: normalizeBackground(src.background),
    legacy: typeof src.legacy === "string" && LEGACY_KEYS.test(src.legacy) ? src.legacy : null,
    elements,
  };
}

// ── Sorties par défaut / migration des anciens réglages ─────────────────────

const el = (kind, patch) => ({ ...COMMON, ...ELEMENT_KINDS[kind].defaults, kind, id: newId(), ...patch });
const only = (...keys) => ({ none: keys.includes("none"), running: keys.includes("running"), results: keys.includes("results") });

/**
 * Tableau plein écran (1920 × 1080), reprise de l'ancienne mise en page :
 * en-tête, bloc « sur le parcours », classement, pied.
 */
export function buildDisplayOutput({ look = {}, pageSize = 5, rotationMs = 5000, showPagination = true, showLogo = true, showHero = true } = {}) {
  const W = 1920;
  const elements = [];
  if (showLogo) elements.push(el("image", { name: "Logo", src: "asset:logo", x: 64, y: 43, width: 160, height: 120 }));
  const textX = showLogo ? 256 : 64;
  if (look.headerTitle) {
    elements.push(el("text", { name: "Titre", text: look.headerTitle, x: textX, y: 44, width: 1180, height: 32, size: 26, color: "muted", bold: true, uppercase: true, letterSpacing: 0.18 }));
  }
  elements.push(el("text", { name: "Discipline", text: "{discipline}", x: textX, y: look.headerTitle ? 82 : 60, width: 1180, height: 80, size: 72, font: "display", color: "text" }));
  elements.push(el("text", { name: "Rodéo", text: "{rodeo}", x: 1456, y: 78, width: 400, height: 52, size: 26, color: "accent", bold: true, uppercase: true, letterSpacing: 0.08, align: "right", background: "accent", bgOpacity: 0.16, radius: 999, padding: 22 }));

  let tableY = 206;
  let tableH = 754;
  if (showHero) {
    tableY = 444;
    tableH = 516;
    const hero = { needsCompetitor: true };
    elements.push(el("card", { name: "Carte « sur le parcours »", x: 64, y: 206, width: 1792, height: 210, fill: "card", accentBar: "left", ...hero }));
    elements.push(el("text", { name: "Étiquette", text: "Sur le parcours", x: 112, y: 236, width: 600, height: 26, size: 22, color: "muted", bold: true, uppercase: true, letterSpacing: 0.18, ...hero }));
    elements.push(el("text", { name: "Compétiteur", text: "{competitor.name}", x: 112, y: 270, width: 760, height: 70, size: 64, font: "display", ...hero, animate: true }));
    if (look.showHometown !== false) elements.push(el("text", { name: "Ville", text: "{competitor.hometown}", x: 112, y: 346, width: 760, height: 34, size: 28, color: "muted", bold: true, ...hero }));
    if (look.showAnimal !== false) {
      elements.push(el("text", { name: "VS", text: "VS", x: 900, y: 250, width: 440, height: 30, size: 26, color: "accent", bold: true, letterSpacing: 0.12, align: "center", ...hero }));
      elements.push(el("text", { name: "Animal", text: "{competitor.animal}", x: 900, y: 284, width: 440, height: 58, size: 52, font: "display", align: "center", ...hero, animate: true }));
      elements.push(el("text", { name: "Entrepreneur", text: "{competitor.contractor}", x: 900, y: 346, width: 440, height: 30, size: 26, color: "muted", bold: true, align: "center", ...hero }));
    }
    elements.push(el("timer", { name: "Chrono", x: 1380, y: 226, width: 440, height: 170, fill: "black", timeScale: 1.1 }));
  }
  elements.push(el("table", { name: "Classement", x: 64, y: tableY, width: 1792, height: tableH, pageSize, rotationMs, showPagination, showHometown: look.showHometown !== false }));
  if (look.showUnofficial !== false) {
    elements.push(el("text", { name: "Non officiel", text: "Non officiel", x: 64, y: 988, width: 600, height: 64, size: 24, color: "muted", bold: true, uppercase: true, letterSpacing: 0.12 }));
  }
  elements.push(el("text", { name: "Mode", text: "{scoreModeLabel}", x: W - 64 - 800, y: 988, width: 800, height: 64, size: 24, color: "muted", bold: true, uppercase: true, letterSpacing: 0.12, align: "right" }));

  return normalizeOutput({ id: newId("out"), name: "Tableau", width: W, height: 1080, background: "look", legacy: "display", elements });
}

/** Éléments d'un bandeau LED (logo, carrousel, chrono, attente) dans un rectangle. */
export function bannerElements({ x = 0, y = 0, width, height, pageSize = 3, nameScale = 1, scoreScale = 1, showLogo = true, showHometown = true, timerShowName = false, withBackground = false }) {
  const unit = height / 216;
  const r = (n) => Math.round(n * unit);
  const out = [];
  if (withBackground) out.push(el("card", { name: "Fond", x, y, width, height, fill: "background", border: false, shadow: false, radius: 0 }));
  const logoH = r(130);
  const logoW = logoH;
  const padX = r(40);
  let carouselX = x + padX;
  if (showLogo) {
    out.push(el("image", { name: "Logo", src: "asset:logo", x: x + padX, y: y + Math.round((height - logoH) / 2), width: logoW, height: logoH, states: only("results") }));
    carouselX += logoW + r(24);
  }
  out.push(el("carousel", { name: "Résultats", x: carouselX, y, width: x + width - carouselX - padX, height, pageSize, nameScale, scoreScale, showHometown, states: only("results") }));
  if (showLogo) {
    out.push(el("image", { name: "Logo (attente)", src: "asset:banner", x, y: y + Math.round(height * 0.1), width, height: Math.round(height * 0.8), states: only("none") }));
  } else {
    out.push(el("text", { name: "Discipline (attente)", text: "{discipline}", x: x + padX, y, width: width - 2 * padX, height, size: r(72), align: "center", states: only("none") }));
  }
  out.push(el("timer", { name: "Chrono", x, y, width, height, showName: timerShowName, fill: "none", states: only("running") }));
  return out;
}

export function buildBannerOutput({ name, width = 2592, height = 216, index = 0, ...opts }) {
  return normalizeOutput({
    id: newId("out"),
    name,
    width,
    height,
    background: "look",
    legacy: `banner:${index}`,
    elements: bannerElements({ width, height, ...opts }),
  });
}

/** Ancien élément de canevas (bandeau, chrono, infographie) → éléments. */
function canvasElements(b, timerShowName) {
  if (b.kind === "timer") {
    return [
      el("card", { name: `${b.label ?? "Chrono"} (fond)`, x: b.x, y: b.y, width: b.width, height: b.height, fill: "custom", color: "#000000", fillOpacity: 1, border: false, shadow: false, radius: 0 }),
      el("timer", { name: b.label ?? "Chrono", x: b.x, y: b.y, width: b.width, height: b.height, showName: !!b.showName, align: b.align, timeScale: b.timeScale, fill: "card" }),
    ];
  }
  if (b.kind === "graphic") {
    const hide = b.hideWhenEmpty !== false;
    const out = [el("image", { name: b.label ?? "Infographie", src: b.image, fit: "fill", x: b.x, y: b.y, width: b.width, height: b.height, keyColor: b.keyColor, keyTolerance: b.keyTolerance, needsCompetitor: hide, animate: b.animate !== false })];
    for (const l of b.layers ?? []) {
      out.push(el("text", { name: `${b.label ?? "Infographie"} — texte`, text: l.text, x: b.x + l.x, y: b.y + l.y, width: l.width, height: l.height, font: l.font, size: l.size, color: l.color, align: l.align, valign: l.valign, bold: l.bold, uppercase: l.uppercase, shadow: l.shadow, letterSpacing: l.letterSpacing, autoFit: false, needsCompetitor: hide, animate: b.animate !== false }));
    }
    return out;
  }
  return bannerElements({ x: b.x, y: b.y, width: b.width, height: b.height, pageSize: b.pageSize, nameScale: b.nameScale, scoreScale: b.scoreScale, showLogo: b.showLogo !== false, timerShowName, withBackground: true });
}

const DEFAULT_BANNERS = [
  { label: "Bandeau principal", width: 2592, height: 216, pageSize: 3 },
  { label: "Bandeau secondaire", width: 1920, height: 144, pageSize: 2 },
];

/** Sorties reconstruites depuis les anciens réglages (ou les valeurs par défaut). */
export function legacyOutputs(state = {}) {
  const look = state.look ?? {};
  const outputs = [
    buildDisplayOutput({
      look,
      pageSize: Math.round(num(state.displayPageSize, 5, 1, 10)),
      rotationMs: num(state.displayRotationMs, 5000, 0, 60000),
      showPagination: state.displayShowPagination !== false,
      showLogo: state.showDisplayLogo !== false,
      showHero: state.displayShowHero !== false,
    }),
  ];
  const banners = Array.isArray(state.banners) && state.banners.length ? state.banners : DEFAULT_BANNERS;
  banners.slice(0, 2).forEach((b, i) => {
    outputs.push(
      buildBannerOutput({
        name: b.label ?? DEFAULT_BANNERS[i]?.label ?? `Bandeau ${i + 1}`,
        width: Math.round(num(b.width, DEFAULT_BANNERS[i]?.width ?? 1920, 64, 8192)),
        height: Math.round(num(b.height, DEFAULT_BANNERS[i]?.height ?? 216, 32, 8192)),
        index: i,
        pageSize: Math.round(num(b.pageSize, DEFAULT_BANNERS[i]?.pageSize ?? 3, 1, 8)),
        nameScale: num(b.nameScale, 1, 0.6, 2),
        scoreScale: num(b.scoreScale, 1, 0.6, 2),
        showLogo: b.showLogo !== false,
        showHometown: look.showHometown !== false,
        timerShowName: !!state.bannerTimerShowName,
      })
    );
  });
  const canvas = state.canvas ?? {};
  const cw = Math.round(num(canvas.width, 1920, 64, 8192));
  const ch = Math.round(num(canvas.height, 1080, 32, 8192));
  const items = Array.isArray(canvas.banners) ? canvas.banners.filter((b) => b && b.kind !== "lowerThird") : [];
  outputs.push(
    normalizeOutput({
      id: newId("out"),
      name: "Canevas",
      width: cw,
      height: ch,
      background: normalizeBackground(canvas.background, "black"),
      legacy: "canvas",
      elements: items.flatMap((b) => canvasElements(b, !!state.bannerTimerShowName)),
    })
  );
  return outputs;
}

/** Liste de sorties validée ; construite depuis les anciens réglages si absente. */
export function normalizeOutputs(state) {
  if (Array.isArray(state?.outputs)) {
    const list = state.outputs.map(normalizeOutput).filter(Boolean);
    if (list.length) return list;
  }
  return legacyOutputs(state);
}

/** Sortie désignée par une ancienne adresse (?display=1, ?banner=1&bid=1, ?canvas=1). */
export function findLegacyOutput(outputs, key) {
  return outputs.find((o) => o.legacy === key) ?? null;
}

/** Clés d'état obsolètes remplacées par `outputs`. */
export const LEGACY_STATE_KEYS = [
  "banners",
  "canvas",
  "displayPageSize",
  "displayRotationMs",
  "displayShowPagination",
  "showDisplayLogo",
  "displayShowHero",
  "bannerTimerShowName",
];
