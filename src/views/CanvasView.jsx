import React, { useEffect } from "react";
import useSyncedState from "../state/useSyncedState";
import useFullscreenExit from "../hooks/useFullscreenExit";
import BannerView from "../components/BannerView";
import TimerDisplay from "../components/TimerDisplay";
import { bannerCardStyle } from "../components/bannerCard";
import { useOutputTimer, HOLD_TIME_MODE_MS, HOLD_SCORE_MODE_MS } from "../hooks/useLiveTimer";

const FALLBACK_CANVAS = { width: 1920, height: 1080, banners: [] };

export default function CanvasView() {
  useFullscreenExit();
  const [state] = useSyncedState();
  // Charger la police du chrono d'avance : le premier temps affiché ne doit
  // pas apparaître avec une police de remplacement.
  useEffect(() => {
    document.fonts?.load("64px 'Timmons NY'").catch(() => {});
  }, []);
  const timerFrame = useOutputTimer({
    enabled: state.timerArmed && state.showLiveTimer !== false,
    pendingRun: state.pendingRun,
    holdMs: state.scoreMode === "lower" ? HOLD_TIME_MODE_MS : HOLD_SCORE_MODE_MS,
  });
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const canvas = state.canvas ?? FALLBACK_CANVAS;

  const wParam = params?.get("w") ? Number(params.get("w")) : canvas.width;
  const hParam = params?.get("h") ? Number(params.get("h")) : canvas.height;

  const width = Math.max(320, wParam || 0);
  const height = Math.max(64, hParam || 0);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        overflow: "hidden",
        background: "#000",
      }}
    >
      {canvas.banners.map((cb) => (
        <div
          key={cb.id}
          style={{
            position: "absolute",
            left: cb.x,
            top: cb.y,
            width: cb.width,
            height: cb.height,
            overflow: "hidden",
          }}
        >
          {cb.kind === "timer" ? (
            // Élément « Chrono » : carte grise comme celles du bandeau, police
            // Timmons NY. Noir tant qu'il n'y a rien à montrer (chrono désarmé,
            // ou aucune course en cours / en attente).
            <div style={{ width: "100%", height: "100%", background: "#000" }}>
              {timerFrame && (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    boxSizing: "border-box",
                    ...bannerCardStyle(cb.height / 216),
                  }}
                >
                  <TimerDisplay
                    seconds={timerFrame.seconds}
                    competitor={cb.showName ? state.currentCompetitor : null}
                    width={cb.width}
                    height={cb.height}
                    align={cb.align}
                    scale={cb.timeScale}
                    font="timmons"
                    target={state.timerTarget}
                  />
                </div>
              )}
            </div>
          ) : (
            <BannerView
              banner={cb}
              entries={state.entries}
              scoreMode={state.scoreMode}
              eventName={state.eventName}
              timerFrame={timerFrame}
              competitor={state.bannerTimerShowName ? state.currentCompetitor : null}
              timerTarget={state.timerTarget}
              width={cb.width}
              height={cb.height}
            />
          )}
        </div>
      ))}

      {canvas.banners.length === 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            color: "rgba(255,255,255,0.4)",
            fontSize: Math.round(Math.min(width, height) * 0.025),
          }}
        >
          Aucun élément dans le canevas — ajoutez-en depuis Paramètres → Canevas.
        </div>
      )}
    </div>
  );
}
