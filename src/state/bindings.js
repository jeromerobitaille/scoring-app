import { formatScore, entryDisplayMode } from "../utils/score.js";

/**
 * Sources de texte d'un champ d'infographie. Chaque champ = { source, text }
 * où `text` n'est utilisé que pour la source "text" (ou comme préfixe/suffixe
 * facultatif avec {value} pour les autres, ex. « {value} s »).
 */
export const BINDINGS = [
  { key: "none", label: "— vide —" },
  { key: "text", label: "Texte libre" },
  { key: "competitor.name", label: "Compétiteur — nom" },
  { key: "competitor.hometown", label: "Compétiteur — ville" },
  { key: "competitor.animal", label: "Animal" },
  { key: "competitor.contractor", label: "Entrepreneur de bétail" },
  { key: "competitor.vsAnimal", label: "« VS » + animal" },
  { key: "competitor.result", label: "Résultat du compétiteur" },
  { key: "timer", label: "Chrono en direct" },
  { key: "timerOrResult", label: "Chrono, puis résultat une fois validé" },
  { key: "discipline", label: "Discipline" },
  { key: "rodeo", label: "Rodéo" },
  { key: "leader", label: "Meneur — nom" },
  { key: "leader.result", label: "Meneur — résultat" },
  { key: "competitor.rank", label: "Rang du compétiteur (ex. 3e)" },
  { key: "scoreModeLabel", label: "Mode (« Temps — le plus bas gagne »)" },
  { key: "unit", label: "Unité (s / pts)" },
  { key: "count", label: "Nombre de résultats" },
];

export const BINDING_KEYS = new Set(BINDINGS.map((b) => b.key));

/** Variables utilisables dans un texte : {competitor.name}, {timer}, … */
export const VARIABLES = BINDINGS.filter((b) => b.key !== "none" && b.key !== "text");

/** Remplace chaque {variable} d'un texte par sa valeur courante. */
export function resolveTemplate(text, ctx) {
  return String(text ?? "").replace(/\{([a-zA-Z.]+)\}/g, (m, key) =>
    BINDING_KEYS.has(key) ? resolveField({ source: key, text: "" }, ctx) : m
  );
}

const ordinal = (n) => (n === 1 ? "1er" : `${n}e`);

/**
 * Résout un champ en texte.
 *   ctx = { current, competitionEntries (classés), scoreMode, eventName,
 *           rodeoName, timerFrame, ranked }
 */
export function resolveField(field, ctx) {
  if (!field || field.source === "none") return "";
  const template = typeof field.text === "string" ? field.text : "";
  const wrap = (v) => {
    if (v == null || v === "") return "";
    return template.includes("{value}") ? template.replaceAll("{value}", v) : v;
  };
  const c = ctx.current;
  const mine = c ? ctx.ranked.find((e) => e.competitorId === c.id || e.name === c.name) : null;
  const fmt = (e) => (e ? formatScore(e.parsed, entryDisplayMode(e, ctx.scoreMode)) : "");
  switch (field.source) {
    case "text": return template;
    case "competitor.name": return wrap(c?.name);
    case "competitor.hometown": return wrap(c?.hometown);
    case "competitor.animal": return wrap(c?.animal);
    case "competitor.contractor": return wrap(c?.contractor);
    case "competitor.vsAnimal": return wrap(c?.animal ? `VS ${c.animal}` : "");
    case "competitor.result": return wrap(fmt(mine));
    case "competitor.rank": return wrap(mine ? ordinal(mine.rank) : "");
    case "timer": return wrap(ctx.timerFrame ? formatScore(ctx.timerFrame.seconds, "time") : "");
    case "timerOrResult":
      if (ctx.timerFrame) return wrap(formatScore(ctx.timerFrame.seconds, "time"));
      return wrap(fmt(mine));
    case "discipline": return wrap(ctx.eventName);
    case "rodeo": return wrap(ctx.rodeoName);
    case "leader": return wrap(ctx.ranked[0]?.name);
    case "leader.result": return wrap(fmt(ctx.ranked[0]));
    case "scoreModeLabel": return wrap(ctx.scoreMode === "lower" ? "Temps — le plus bas gagne" : "Pointage — le plus haut gagne");
    case "unit": return wrap(ctx.scoreMode === "lower" ? "s" : "pts");
    case "count": return wrap(ctx.ranked.length ? String(ctx.ranked.length) : "");
    default: return "";
  }
}

export function normalizeField(src, fallback) {
  return {
    source: BINDING_KEYS.has(src?.source) ? src.source : fallback.source,
    text: String(src?.text ?? fallback.text ?? "").slice(0, 120),
  };
}
