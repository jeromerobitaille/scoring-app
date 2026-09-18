import React, { useEffect, useState } from "react";
import useSyncedState from "../state/useSyncedState";
import useFullscreenExit from "../hooks/useFullscreenExit";
import { getActive } from "../state/model";
import { useOutputTimer, HOLD_TIME_MODE_MS, HOLD_SCORE_MODE_MS } from "../hooks/useLiveTimer";
import LeaderboardScreen from "../components/outputs/LeaderboardScreen";

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

/** Tableau plein écran (2e écran / projecteur). */
export default function DisplayView() {
  useFullscreenExit();
  const [state] = useSyncedState();
  const { width, height } = useWindowSize();
  const timerFrame = useOutputTimer({
    enabled: state.timerArmed && state.showLiveTimer !== false,
    pendingRun: state.pendingRun,
    holdMs: state.scoreMode === "lower" ? HOLD_TIME_MODE_MS : HOLD_SCORE_MODE_MS,
  });

  useEffect(() => {
    document.body.classList.add("dark");
    document.body.style.background = "#000";
    document.body.style.overflow = "hidden";
    // Charger les polices d'affichage d'avance.
    document.fonts?.load("64px 'Timmons NY'").catch(() => {});
    document.fonts?.load("64px 'TexasTango'").catch(() => {});
    return () => {
      document.body.style.background = "";
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <LeaderboardScreen
      look={state.look}
      entries={state.entries}
      roster={getActive(state).competition.roster}
      scoreMode={state.scoreMode}
      eventName={state.eventName}
      rodeoName={state.rodeoName}
      current={state.currentCompetitorInfo}
      timerFrame={timerFrame}
      timerTarget={state.timerTarget}
      width={width}
      height={height}
      pageSize={Number(state.displayPageSize) || 5}
      rotationMs={Math.max(0, Number(state.displayRotationMs ?? 5000))}
      showPagination={state.displayShowPagination !== false}
      showLogo={state.showDisplayLogo !== false}
      showHero={state.displayShowHero !== false}
    />
  );
}
