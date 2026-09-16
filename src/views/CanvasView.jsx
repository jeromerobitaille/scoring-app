import React from "react";
import useSyncedState from "../state/useSyncedState";
import useFullscreenExit from "../hooks/useFullscreenExit";
import BannerView from "../components/BannerView";
import { useOutputTimer } from "../hooks/useLiveTimer";

const FALLBACK_CANVAS = { width: 1920, height: 1080, banners: [] };

export default function CanvasView() {
  useFullscreenExit();
  const [state] = useSyncedState();
  const timerFrame = useOutputTimer({
    enabled: state.scoreMode === "lower" && state.timerArmed && state.showLiveTimer !== false,
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
          <BannerView
            banner={cb}
            entries={state.entries}
            scoreMode={state.scoreMode}
            eventName={state.eventName}
            timerFrame={timerFrame}
            competitor={state.bannerTimerShowName ? state.currentCompetitor : null}
            width={cb.width}
            height={cb.height}
          />
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
          Aucun bandeau dans le canevas — ajoutez-en depuis Paramètres → Canevas.
        </div>
      )}
    </div>
  );
}
