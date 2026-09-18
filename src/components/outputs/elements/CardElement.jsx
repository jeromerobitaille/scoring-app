import React from "react";
import { backgroundFor, cardStyle, hexToRgba } from "../../../state/look";

/** Carte / fond aux couleurs du thème (ou couleur libre). */
export default function CardElement({ el, ctx }) {
  const look = ctx.look;
  const unit = Math.max(0.3, el.height / 216);
  const base = el.fill === "card" ? cardStyle(look, unit) : {};
  const radius = el.radius == null ? base.borderRadius ?? Math.round(look.radius * unit) : el.radius;
  const style = {
    position: "absolute",
    inset: 0,
    boxSizing: "border-box",
    borderRadius: radius,
    background:
      el.fill === "background" ? backgroundFor(look)
        : el.fill === "custom" ? hexToRgba(el.color, el.fillOpacity)
        : base.background,
    border: el.border ? base.border ?? `${Math.max(1, Math.round(2 * unit))}px solid ${hexToRgba(look.colors.cardBorder, 0.9)}` : undefined,
    boxShadow: el.shadow ? base.boxShadow ?? `0 ${Math.round(6 * unit)}px ${Math.round(24 * unit)}px rgba(0,0,0,0.35)` : undefined,
    borderLeft: el.accentBar === "left" ? `${Math.round(10 * unit)}px solid ${look.colors.accent}` : undefined,
    borderTop: el.accentBar === "top" ? `${Math.round(8 * unit)}px solid ${look.colors.accent}` : undefined,
  };
  return <div style={style} />;
}
