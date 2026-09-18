import React, { useLayoutEffect, useRef, useState } from "react";
import { FONTS, hexToRgba } from "../../../state/look";
import { resolveTemplate } from "../../../state/bindings";
import { resolveColor } from "./util";

/**
 * Texte avec variables. `autoFit` réduit la taille de police pour qu'une
 * ligne tienne dans la boîte (mesure faite sur une copie invisible).
 */
export default function TextElement({ el, ctx }) {
  const value = resolveTemplate(el.text, ctx);
  const f = FONTS[el.font] ?? FONTS.system;
  const measureRef = useRef(null);
  const [fit, setFit] = useState(1);
  const inner = Math.max(1, el.width - 2 * el.padding);

  useLayoutEffect(() => {
    if (!el.autoFit || el.lines > 1) { setFit(1); return; }
    const m = measureRef.current;
    if (!m) return;
    const w = m.scrollWidth;
    setFit(w > inner ? Math.max(0.2, inner / w) : 1);
  }, [value, el.autoFit, el.lines, el.size, el.font, el.bold, el.letterSpacing, el.uppercase, inner]);

  if (!value.trim()) return null;

  const font = {
    fontFamily: f.family,
    fontWeight: el.bold ? 800 : f.weight,
    textTransform: el.uppercase || f.uppercase ? "uppercase" : undefined,
    letterSpacing: el.letterSpacing ? `${el.letterSpacing}em` : undefined,
    lineHeight: 1.05,
  };
  const bg = el.background ? hexToRgba(resolveColor(el.background, ctx.look), el.bgOpacity) : undefined;
  // Le fond épouse le texte (pastille), pas toute la boîte.
  const pill = { background: bg, borderRadius: el.radius, padding: el.padding ? `${Math.round(el.padding * 0.35)}px ${el.padding}px` : undefined, boxSizing: "border-box" };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: el.valign === "top" ? "flex-start" : el.valign === "bottom" ? "flex-end" : "center",
        justifyContent: el.align === "left" ? "flex-start" : el.align === "right" ? "flex-end" : "center",
        color: resolveColor(el.color, ctx.look),
        textAlign: el.align,
        textShadow: el.shadow ? "0 2px 8px rgba(0,0,0,0.6)" : undefined,
        overflow: "hidden",
        ...font,
        fontSize: Math.max(4, el.size * fit),
      }}
    >
      {/* Copie de mesure, à la taille nominale. */}
      <span ref={measureRef} aria-hidden style={{ position: "absolute", visibility: "hidden", whiteSpace: "nowrap", fontSize: el.size, left: 0, top: 0, pointerEvents: "none" }}>
        {value}
      </span>
      <span
        style={
          el.lines > 1
            ? { ...pill, display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: el.lines, overflow: "hidden", maxWidth: "100%", whiteSpace: "normal", wordBreak: "break-word" }
            : { ...pill, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }
        }
      >
        {value}
      </span>
    </div>
  );
}
