import { getActive } from "./model";
import { computeRanking } from "../utils/score";

export const CANVAS_BACKGROUNDS = {
  black: { label: "Noir", css: "#000000" },
  green: { label: "Vert (chroma key)", css: "#00ff00" },
  blue: { label: "Bleu (chroma key)", css: "#0000ff" },
  transparent: { label: "Transparent (source navigateur OBS)", css: "transparent" },
};

export function canvasBackgroundCss(background) {
  if (background in CANVAS_BACKGROUNDS) return CANVAS_BACKGROUNDS[background].css;
  return /^#[0-9a-f]{6}$/i.test(background) ? background : "#000000";
}

/** Contexte de résolution des champs d'infographie, à partir de l'état. */
export function bindingContext(state, timerFrame) {
  const { competition } = getActive(state);
  const current = competition.roster.find((p) => p.id === competition.currentId) ?? null;
  return {
    current,
    ranked: computeRanking(competition.entries, state.scoreMode),
    scoreMode: state.scoreMode,
    eventName: state.eventName,
    rodeoName: state.rodeoName,
    timerFrame,
  };
}

