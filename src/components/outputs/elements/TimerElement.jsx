import React from "react";
import TimerDisplay from "../../TimerDisplay";
import { TIMER_FONT_KEY, cardStyle } from "../../../state/look";

/** Chrono en direct : rien tant qu'aucun temps n'est à montrer. */
export default function TimerElement({ el, ctx }) {
  const frame = ctx.timerFrame;
  if (!frame) return null;
  const look = ctx.look;
  const unit = el.height / 216;
  const fill =
    el.fill === "card" ? cardStyle(look, unit)
      : el.fill === "black" ? { background: "#000", border: `${Math.max(1, Math.round(3 * unit))}px solid ${look.colors.accent}`, borderRadius: Math.round(look.radius * unit) }
      : {};
  return (
    <div style={{ position: "absolute", inset: 0, boxSizing: "border-box", ...fill }}>
      <TimerDisplay
        seconds={frame.seconds}
        competitor={el.showName ? ctx.current?.name ?? null : null}
        width={el.width}
        height={el.height}
        align={el.align}
        scale={el.timeScale}
        font={TIMER_FONT_KEY[look.fonts.numbers]}
        color={look.colors.text}
        targetColor={look.colors.timerTarget}
        target={ctx.timerTarget}
      />
    </div>
  );
}
