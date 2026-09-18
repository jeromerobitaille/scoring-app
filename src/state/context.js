import { getActive } from "./model";
import { computeRanking } from "../utils/score";
import { backgroundFor } from "./look";
import { BACKGROUNDS } from "./outputs";

/** CSS du fond d'une sortie. */
export function backgroundCss(background, look) {
  switch (background) {
    case "look": return look ? backgroundFor(look) : "#000000";
    case "black": return "#000000";
    case "green": return "#00ff00";
    case "blue": return "#0000ff";
    case "transparent": return "transparent";
    default: return background in BACKGROUNDS ? "#000000" : /^#[0-9a-f]{6}$/i.test(background) ? background : "#000000";
  }
}

/** État d'une sortie : en course > résultats > aucun résultat. */
export function outputStateOf(ranked, timerFrame) {
  if (timerFrame) return "running";
  return ranked.length ? "results" : "none";
}

/**
 * Contexte de rendu des éléments (variables, classement, thème…), à partir de
 * l'état synchronisé et du chrono en direct.
 */
export function buildContext(state, timerFrame = null) {
  const { competition } = getActive(state);
  const current = competition.roster.find((p) => p.id === competition.currentId) ?? null;
  const ranked = computeRanking(competition.entries, state.scoreMode);
  return {
    current,
    ranked,
    byCompetitor: new Map(competition.roster.map((p) => [p.id, p])),
    scoreMode: state.scoreMode,
    eventName: state.eventName,
    rodeoName: state.rodeoName,
    timerFrame,
    timerTarget: state.timerTarget,
    look: state.look,
    outputState: outputStateOf(ranked, timerFrame),
    contextKey: `${state.currentRodeoId}:${state.currentDisciplineId}`,
  };
}

/** L'élément est-il rendu dans ce contexte (état de la sortie, compétiteur) ? */
export function isElementShown(el, ctx) {
  if (!el.visible) return false;
  if (el.states[ctx.outputState] === false) return false;
  if (el.needsCompetitor && !ctx.current) return false;
  if (el.kind === "timer" && !ctx.timerFrame) return false;
  return true;
}
