import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { fontStyle } from "../../state/look";
import { resolveField } from "../../state/bindings";
import logo from "../../assets/logo.png";

/**
 * Infographie « lower third » pour le broadcast, d'après le gabarit fourni par
 * l'équipe : tuile logo, barre principale avec liseré, boîte de droite.
 * Toutes les cotes sont relatives à la hauteur `height` de l'élément
 * (le gabarit d'origine fait 1760 × 250 sur un canevas 1920 × 1080).
 *
 * element = { width, height, style: { primary, panel, light, text, textOnPrimary },
 *             font, showLogo, fields: { title, subtitle, box, boxLabel }, animate }
 */
export default function LowerThird({ element, ctx }) {
  const { width, height, style, fields } = element;
  const h = height;
  const u = (n) => Math.round(n * (h / 250));
  const font = fontStyle(element.font);

  const title = resolveField(fields.title, ctx);
  const subtitle = resolveField(fields.subtitle, ctx);
  const box = resolveField(fields.box, ctx);
  const boxLabel = resolveField(fields.boxLabel, ctx);
  const visible = Boolean(title || subtitle || box);

  // Gabarit : tuile logo 292 × 152 avec ombre, barre 843→985, boîte droite 250 × 110.
  const tileW = element.showLogo ? u(292) : 0;
  const tileH = u(152);
  const barTop = u(50);
  const stripH = u(15);
  const barH = u(110);
  const boxW = box ? u(250) : 0;
  const boxGap = box ? u(104) : 0;
  const barLeft = tileW;
  const barRight = width - boxW - boxGap;
  const barW = Math.max(u(200), barRight - barLeft);
  const shadow = u(18);

  // L'animation d'entrée ne rejoue que si le sujet change (pas à chaque tic du chrono).
  const key = `${title}|${subtitle}`;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "visible", ...font, color: style.text }}>
      <AnimatePresence>
        {visible && (
          <motion.div
            key={element.animate ? key : "static"}
            initial={element.animate ? { x: -u(60), opacity: 0 } : false}
            animate={{ x: 0, opacity: 1 }}
            exit={element.animate ? { x: -u(60), opacity: 0 } : { opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            style={{ position: "absolute", inset: 0 }}
          >
            {/* Ombre sous la tuile et la barre */}
            {element.showLogo && (
              <div style={{ position: "absolute", left: u(42), top: tileH, width: tileW - u(42) + shadow, height: shadow, background: style.panel }} />
            )}
            <div style={{ position: "absolute", left: barLeft + Math.round(barW * 0.33), top: barTop + stripH + barH, width: Math.round(barW * 0.67) + shadow, height: shadow, background: style.light }} />
            <div style={{ position: "absolute", left: barLeft + barW, top: barTop + stripH + u(42), width: shadow, height: barH - u(42) + shadow, background: style.light }} />

            {/* Bande supérieure bordeaux + barre principale */}
            <div style={{ position: "absolute", left: barLeft, top: barTop, width: Math.round(barW * 0.67), height: stripH, background: style.primary }} />
            <div
              style={{
                position: "absolute",
                left: barLeft,
                top: barTop + stripH,
                width: barW,
                height: barH,
                background: style.panel,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: `0 ${u(36)}px 0 ${u(tileW ? 40 : 36)}px`,
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  fontSize: subtitle ? u(58) : u(68),
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: style.text,
                }}
              >
                {title}
              </div>
              {subtitle && (
                <div
                  style={{
                    marginTop: u(8),
                    fontSize: u(32),
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    color: style.light,
                    opacity: 0.85,
                  }}
                >
                  {subtitle}
                </div>
              )}
            </div>

            {/* Tuile logo */}
            {element.showLogo && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: tileW,
                  height: tileH,
                  background: style.primary,
                  display: "grid",
                  placeItems: "center",
                  zIndex: 2,
                }}
              >
                <img src={logo} alt="" style={{ height: Math.round(tileH * 0.6), width: "auto", objectFit: "contain", filter: "brightness(0) invert(1) sepia(0.15)" }} />
              </div>
            )}

            {/* Boîte de droite (score / chrono) */}
            {box && (
              <div style={{ position: "absolute", left: barRight + boxGap, top: barTop, width: boxW, height: stripH + barH }}>
                <div style={{ position: "absolute", left: 0, top: 0, width: u(160), height: u(88), background: style.primary }} />
                <div style={{ position: "absolute", left: u(115), top: u(78), width: u(158), height: u(64), background: style.light }} />
                <div
                  style={{
                    position: "absolute",
                    left: u(21),
                    top: stripH,
                    width: u(230),
                    height: barH,
                    background: style.panel,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 2,
                  }}
                >
                  {boxLabel && (
                    <div style={{ fontSize: u(20), letterSpacing: "0.12em", color: style.light, opacity: 0.8, lineHeight: 1, marginBottom: u(6) }}>
                      {boxLabel}
                    </div>
                  )}
                  <div style={{ fontSize: u(60), lineHeight: 1, fontVariantNumeric: "tabular-nums lining-nums", whiteSpace: "nowrap" }}>
                    {box}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
