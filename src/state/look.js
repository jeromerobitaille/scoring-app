/**
 * Apparence des sorties (tableau plein écran, bandeaux LED, canevas).
 *
 *   look = {
 *     preset,          "arena" | "fwst" | "night" | "custom"
 *     colors: { bg1, bg2, card, cardBorder, accent, accentText, text, muted, cutLine, timerTarget }
 *     fonts:  { display, numbers }     clés de FONTS
 *     headerTitle,     petit titre au-dessus de la discipline (ex. nom du festival)
 *     cutLine,         nb de places qualifiées : une ligne rouge est tracée après (0 = aucune)
 *     showHometown, showAnimal, showUnofficial, showRank
 *     radius           arrondi des cartes (px à l'échelle 1080p)
 *   }
 */

export const FONTS = {
  system: {
    label: "Système (Inter)",
    family: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
    weight: 800,
    uppercase: false,
  },
  timmons: {
    label: "Timmons NY (condensé)",
    family: "'Timmons NY', 'Arial Narrow', sans-serif",
    weight: 400,
    uppercase: true, // la police n'a que des capitales
  },
  texasTango: {
    label: "Texas Tango (western)",
    family: "'TexasTango', 'Impact', sans-serif",
    weight: 400,
    uppercase: false,
  },
};

/** Clé de police → clé de métriques de TimerDisplay. */
export const TIMER_FONT_KEY = { system: "default", timmons: "timmons", texasTango: "texasTango" };

export const PRESETS = {
  arena: {
    label: "Arène",
    description: "Marine et or, style diffusion télé.",
    colors: {
      bg1: "#0b1f4b",
      bg2: "#061233",
      card: "#0e2a63",
      cardBorder: "#c9a227",
      accent: "#e3b93a",
      accentText: "#1a1300",
      text: "#ffffff",
      muted: "#a9b7d6",
      cutLine: "#e5242b",
      timerTarget: "#4ade80",
    },
    fonts: { display: "system", numbers: "timmons" },
    radius: 10,
  },
  fwst: {
    label: "FWST classique",
    description: "Noir et blanc, or pour le premier rang.",
    colors: {
      bg1: "#000000",
      bg2: "#0b0b0b",
      card: "#1e1e1e",
      cardBorder: "#3a3a3a",
      accent: "#ffd700",
      accentText: "#111111",
      text: "#ffffff",
      muted: "#a1a1aa",
      cutLine: "#ef4444",
      timerTarget: "#34d399",
    },
    fonts: { display: "system", numbers: "timmons" },
    radius: 18,
  },
  night: {
    label: "Nuit",
    description: "Anthracite et cuivre, sobre.",
    colors: {
      bg1: "#141414",
      bg2: "#050505",
      card: "#1c1c1c",
      cardBorder: "#2a2a2a",
      accent: "#d97a3a",
      accentText: "#1a0d05",
      text: "#f5f5f5",
      muted: "#9a9a9a",
      cutLine: "#d97a3a",
      timerTarget: "#7dd3fc",
    },
    fonts: { display: "texasTango", numbers: "timmons" },
    radius: 6,
  },
};

const COMMON_DEFAULTS = {
  headerTitle: "",
  cutLine: 0,
  showHometown: true,
  showAnimal: true,
  showUnofficial: true,
};

export const DEFAULT_LOOK = {
  preset: "arena",
  ...PRESETS.arena,
  ...COMMON_DEFAULTS,
};

const HEX = /^#[0-9a-f]{6}$/i;

function color(value, fallback) {
  return typeof value === "string" && HEX.test(value) ? value.toLowerCase() : fallback;
}

function fontKey(value, fallback) {
  return value in FONTS ? value : fallback;
}

/** Valide un objet look ; les champs manquants viennent du préréglage. */
export function normalizeLook(src) {
  const presetKey = src?.preset in PRESETS ? src.preset : src?.preset === "custom" ? "custom" : "arena";
  const base = PRESETS[presetKey === "custom" ? "arena" : presetKey];
  const colors = {};
  for (const [k, v] of Object.entries(base.colors)) colors[k] = color(src?.colors?.[k], v);
  const cut = Number(src?.cutLine);
  return {
    preset: presetKey,
    colors,
    fonts: {
      display: fontKey(src?.fonts?.display, base.fonts.display),
      numbers: fontKey(src?.fonts?.numbers, base.fonts.numbers),
    },
    radius: Math.min(40, Math.max(0, Number(src?.radius ?? base.radius) || 0)),
    headerTitle: String(src?.headerTitle ?? COMMON_DEFAULTS.headerTitle).slice(0, 80),
    cutLine: Number.isInteger(cut) && cut > 0 ? Math.min(50, cut) : 0,
    showHometown: src?.showHometown ?? COMMON_DEFAULTS.showHometown,
    showAnimal: src?.showAnimal ?? COMMON_DEFAULTS.showAnimal,
    showUnofficial: src?.showUnofficial ?? COMMON_DEFAULTS.showUnofficial,
  };
}

/** Applique un préréglage en gardant les options (titre, coupure, affichages). */
export function applyPreset(look, key) {
  const p = PRESETS[key];
  if (!p) return look;
  return normalizeLook({ ...look, preset: key, colors: p.colors, fonts: p.fonts, radius: p.radius });
}

export function fontStyle(key) {
  const f = FONTS[key] ?? FONTS.system;
  return {
    fontFamily: f.family,
    fontWeight: f.weight,
    textTransform: f.uppercase ? "uppercase" : undefined,
  };
}

/** Dégradé de fond des sorties. */
export function backgroundFor(look) {
  const { bg1, bg2 } = look.colors;
  return `radial-gradient(120% 100% at 0% 0%, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0) 55%), linear-gradient(180deg, ${bg1} 0%, ${bg2} 100%)`;
}

export function hexToRgba(hex, alpha) {
  const h = color(hex, "#000000").slice(1);
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Style d'une carte (rangée de classement, puce de bandeau). */
export function cardStyle(look, unit = 1) {
  return {
    background: hexToRgba(look.colors.card, 0.92),
    border: `${Math.max(1, Math.round(2 * unit))}px solid ${hexToRgba(look.colors.cardBorder, 0.9)}`,
    borderRadius: Math.round(look.radius * unit),
    boxShadow: `0 ${Math.round(6 * unit)}px ${Math.round(24 * unit)}px rgba(0,0,0,0.35)`,
    color: look.colors.text,
  };
}

/** Pastille de rang : or pour le 1er, argent, bronze, puis neutre. */
export function rankBadge(look, rank) {
  const { accent, accentText, card, text } = look.colors;
  if (rank === 1) return { background: `linear-gradient(135deg, ${accent}, ${hexToRgba("#ffffff", 0.35)} 140%)`, color: accentText };
  if (rank === 2) return { background: "linear-gradient(135deg,#d9d9d9,#ffffff)", color: "#111111" };
  if (rank === 3) return { background: "linear-gradient(135deg,#cd7f32,#e6a260)", color: "#1a0e00" };
  return { background: hexToRgba(card, 1), color: text, boxShadow: `inset 0 0 0 2px ${hexToRgba(text, 0.25)}` };
}
