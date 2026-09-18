import React, { useEffect, useMemo, useState } from "react";
import useSyncedState from "../state/useSyncedState";
import useFullscreenExit from "../hooks/useFullscreenExit";
import OutputStage from "../components/outputs/OutputStage";
import { backgroundCss, buildContext } from "../state/context";
import { findLegacyOutput } from "../state/outputs";
import { useOutputTimer, HOLD_TIME_MODE_MS, HOLD_SCORE_MODE_MS } from "../hooks/useLiveTimer";

function useWindowSize() {
  const read = () => ({ width: window.innerWidth, height: window.innerHeight });
  const [size, setSize] = useState(read);
  useEffect(() => {
    const onResize = () => setSize(read());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}

/** Sortie désignée par l'adresse : ?output=<id>, ou ancienne forme (?display=1, ?banner=1&bid=N, ?canvas=1). */
function resolveOutput(outputs, params) {
  const id = params.get("output");
  if (id) return outputs.find((o) => o.id === id) ?? null;
  if (params.get("display") === "1") return findLegacyOutput(outputs, "display") ?? outputs[0] ?? null;
  if (params.get("banner") === "1") {
    const bid = Math.max(0, Number(params.get("bid")) || 0);
    return findLegacyOutput(outputs, `banner:${bid}`) ?? findLegacyOutput(outputs, "banner:0") ?? null;
  }
  if (params.get("canvas") === "1") return findLegacyOutput(outputs, "canvas") ?? null;
  return null;
}

/**
 * Fenêtre de sortie (2e écran, bandeau LED, source navigateur OBS). La scène
 * est rendue à sa taille nominale puis mise à l'échelle de la fenêtre.
 */
export default function OutputView() {
  useFullscreenExit();
  const [state] = useSyncedState();
  const { width: winW, height: winH } = useWindowSize();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const output = resolveOutput(state.outputs, params);
  const timerFrame = useOutputTimer({
    enabled: state.timerArmed && state.showLiveTimer !== false,
    pendingRun: state.pendingRun,
    holdMs: state.scoreMode === "lower" ? HOLD_TIME_MODE_MS : HOLD_SCORE_MODE_MS,
  });
  const ctx = useMemo(() => buildContext(state, timerFrame), [state, timerFrame]);
  const bg = output ? backgroundCss(output.background, state.look) : "#000";

  useEffect(() => {
    document.title = output ? `FWST Scoring — ${output.name}` : "FWST Scoring — Sortie";
  }, [output]);

  // Fond de page = fond de la sortie (transparent pour une source navigateur OBS).
  useEffect(() => {
    document.body.classList.add("dark");
    document.body.style.background = bg;
    document.documentElement.style.background = bg;
    document.body.style.overflow = "hidden";
    document.fonts?.load("64px 'Timmons NY'").catch(() => {});
    document.fonts?.load("64px 'TexasTango'").catch(() => {});
    return () => {
      document.body.style.background = "";
      document.documentElement.style.background = "";
      document.body.style.overflow = "";
    };
  }, [bg]);

  if (!output) {
    return (
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "rgba(255,255,255,0.6)", fontSize: 20, textAlign: "center", padding: 40 }}>
        Sortie introuvable — ouvrez-la depuis Paramètres → Éditeur.
      </div>
    );
  }

  const scale = Math.min(winW / output.width, winH / output.height) || 1;
  const left = Math.round((winW - output.width * scale) / 2);
  const top = Math.round((winH - output.height * scale) / 2);

  return (
    <div style={{ position: "absolute", left, top, width: output.width, height: output.height, transform: `scale(${scale})`, transformOrigin: "top left" }}>
      <OutputStage output={output} ctx={ctx} />
      {output.elements.length === 0 && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "rgba(255,255,255,0.4)", fontSize: Math.round(Math.min(output.width, output.height) * 0.04), pointerEvents: "none" }}>
          Sortie vide — ajoutez des éléments dans Paramètres → Éditeur.
        </div>
      )}
    </div>
  );
}
