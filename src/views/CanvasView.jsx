import React, { useEffect } from "react";
import useSyncedState from "../state/useSyncedState";
import useFullscreenExit from "../hooks/useFullscreenExit";
import CanvasStage from "../components/outputs/CanvasStage";
import { canvasBackgroundCss } from "../state/canvas";
import { useOutputTimer, HOLD_TIME_MODE_MS, HOLD_SCORE_MODE_MS } from "../hooks/useLiveTimer";

const FALLBACK_CANVAS = { width: 1920, height: 1080, background: "black", banners: [] };

/** Sortie « canevas » : une fenêtre, plusieurs éléments positionnés librement. */
export default function CanvasView() {
  useFullscreenExit();
  const [state] = useSyncedState();
  const timerFrame = useOutputTimer({
    enabled: state.timerArmed && state.showLiveTimer !== false,
    pendingRun: state.pendingRun,
    holdMs: state.scoreMode === "lower" ? HOLD_TIME_MODE_MS : HOLD_SCORE_MODE_MS,
  });
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const canvas = state.canvas ?? FALLBACK_CANVAS;

  const width = Math.max(320, (params?.get("w") ? Number(params.get("w")) : canvas.width) || 0);
  const height = Math.max(64, (params?.get("h") ? Number(params.get("h")) : canvas.height) || 0);

  // Fond de page = fond du canevas (transparent pour une source navigateur OBS).
  useEffect(() => {
    document.body.style.background = canvasBackgroundCss(canvas.background);
    document.documentElement.style.background = canvasBackgroundCss(canvas.background);
    return () => {
      document.body.style.background = "";
      document.documentElement.style.background = "";
    };
  }, [canvas.background]);

  useEffect(() => {
    document.fonts?.load("64px 'Timmons NY'").catch(() => {});
    document.fonts?.load("64px 'TexasTango'").catch(() => {});
  }, []);

  return (
    <>
      <CanvasStage state={state} timerFrame={timerFrame} width={width} height={height} />
      {canvas.banners.length === 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            color: "rgba(255,255,255,0.4)",
            fontSize: Math.round(Math.min(width, height) * 0.025),
            pointerEvents: "none",
          }}
        >
          Aucun élément dans le canevas — ajoutez-en depuis Paramètres → Canevas.
        </div>
      )}
    </>
  );
}
