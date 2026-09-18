import React, { useMemo } from "react";
import BannerView from "../BannerView";
import TimerDisplay from "../TimerDisplay";
import GraphicElement from "./GraphicElement";
import { TIMER_FONT_KEY, cardStyle } from "../../state/look";
import { getActive } from "../../state/model";
import { bindingContext, canvasBackgroundCss } from "../../state/canvas";

/**
 * Scène du canevas : tous les éléments à leur position, purement
 * présentationnelle. Sert à la sortie plein écran et à l'aperçu de l'éditeur.
 */
export default function CanvasStage({ state, timerFrame, width, height, background }) {
  const canvas = state.canvas;
  const roster = getActive(state).competition.roster;
  const ctx = useMemo(() => bindingContext(state, timerFrame), [state, timerFrame]);
  const contextKey = `${state.currentRodeoId}:${state.currentDisciplineId}`;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        overflow: "hidden",
        background: canvasBackgroundCss(background ?? canvas.background),
      }}
    >
      {canvas.banners.map((el) => (
        <div
          key={el.id}
          style={{ position: "absolute", left: el.x, top: el.y, width: el.width, height: el.height, overflow: "hidden" }}
        >
          {el.kind === "timer" ? (
            // Élément « Chrono » : noir tant qu'il n'y a rien à montrer.
            <div style={{ width: "100%", height: "100%", background: "#000" }}>
              {timerFrame && (
                <div style={{ width: "100%", height: "100%", boxSizing: "border-box", ...cardStyle(state.look, el.height / 216) }}>
                  <TimerDisplay
                    seconds={timerFrame.seconds}
                    competitor={el.showName ? state.currentCompetitor : null}
                    width={el.width}
                    height={el.height}
                    align={el.align}
                    scale={el.timeScale}
                    font={TIMER_FONT_KEY[state.look.fonts.numbers]}
                    color={state.look.colors.text}
                    targetColor={state.look.colors.timerTarget}
                    target={state.timerTarget}
                  />
                </div>
              )}
            </div>
          ) : el.kind === "graphic" ? (
            <GraphicElement element={el} ctx={ctx} />
          ) : (
            <BannerView
              banner={el}
              entries={state.entries}
              scoreMode={state.scoreMode}
              eventName={state.eventName}
              timerFrame={timerFrame}
              competitor={state.bannerTimerShowName ? state.currentCompetitor : null}
              timerTarget={state.timerTarget}
              contextKey={contextKey}
              look={state.look}
              roster={roster}
              width={el.width}
              height={el.height}
            />
          )}
        </div>
      ))}
    </div>
  );
}
