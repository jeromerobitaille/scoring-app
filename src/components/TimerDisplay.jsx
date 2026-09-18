import React from "react";
import { formatScore } from "../utils/score";
import { targetReached, TARGET_REACHED_COLOR } from "../hooks/useLiveTimer";

/**
 * Métriques des polices, en fraction de la taille de police (em).
 *   digit     largeur d'un chiffre (case fixe si `fixedDigits`)
 *   separator largeur de « . » et « : »
 *   char      largeur moyenne d'une lettre du nom
 *   capHeight hauteur des capitales / chiffres
 *   capShift  décalage vertical pour centrer les chiffres (line-height: 1)
 */
const FONTS = {
  default: {
    family: undefined,
    digit: 0.62,
    separator: 0.62,
    char: 0.56,
    capHeight: 0.72,
    capShift: 0,
    nameWeight: 800,
    timeWeight: 900,
    fixedDigits: false,
  },
  // TIMMONS NY 2.0 (src/assets/fonts) : chiffres 0.158–0.255 em, capitales
  // 0.733 em, ascendante 0.85 / descendante 0.17. Ses chiffres ne sont pas à
  // chasse fixe : chacun est posé dans une case de 0.26 em pour que le temps
  // ne tremble pas pendant qu'il défile.
  timmons: {
    family: "'Timmons NY', 'Arial Narrow', sans-serif",
    digit: 0.26,
    separator: 0.135,
    char: 0.25,
    capHeight: 0.733,
    capShift: 0.027,
    nameWeight: "normal",
    timeWeight: "normal",
    fixedDigits: true,
  },
  // Texas Tango (texas_tango.otf) : chiffres à chasse fixe 0.681 em, capitales 0.74 em.
  texasTango: {
    family: "'TexasTango', 'Impact', sans-serif",
    digit: 0.681,
    separator: 0.319,
    char: 0.73,
    capHeight: 0.74,
    capShift: 0.06,
    nameWeight: "normal",
    timeWeight: "normal",
    fixedDigits: false,
  },
};


const isDigit = (c) => c >= "0" && c <= "9";

function textWidthEm(text, m) {
  let w = 0;
  for (const c of text) w += isDigit(c) ? m.digit : m.separator;
  return w;
}

/**
 * Temps du chrono (et nom du compétiteur en option) dimensionné pour tenir
 * dans une boîte width × height. Utilisé par l'overlay des bandeaux et par
 * l'élément « Chrono » du canevas (police `timmons`).
 */
export default function TimerDisplay({
  seconds,
  competitor = null,
  width,
  height,
  align = "center",
  scale = 1,
  font = "default",
  target = null,
  color = "#fff",
  targetColor = TARGET_REACHED_COLOR,
}) {
  const m = FONTS[font] ?? FONTS.default;
  const text = formatScore(seconds, "time");
  // Au moins « 00.000 » : la taille ne saute pas en passant de 9.999 à 10.000.
  const refWidthEm = Math.max(textWidthEm(text, m), textWidthEm("00.000", m));

  const padding = Math.round(height * 0.2);
  const gap = competitor ? Math.round(height * 0.18) : 0;
  // Largeur utile, partagée entre le temps et le nom quand il est affiché.
  const avail = Math.max(1, width - 2 * padding - gap);
  // Les chiffres occupent ~52 % de la hauteur de la boîte, quelle que soit la police.
  const maxByHeight = (height * 0.52) / m.capHeight;
  const timeSize = Math.max(
    8,
    Math.round(Math.min(maxByHeight, (avail * (competitor ? 0.58 : 1)) / refWidthEm) * scale)
  );
  const timeWidth = refWidthEm * timeSize;
  const nameSize = competitor
    ? Math.max(
        8,
        Math.round(
          Math.min(
            (height * 0.25) / m.capHeight,
            timeSize * 0.5,
            (avail - timeWidth) / (competitor.length * m.char)
          )
        )
      )
    : 0;
  const justify = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
  const shift = m.capShift ? `translateY(${m.capShift}em)` : undefined;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: justify,
        gap,
        padding: `0 ${padding}px`,
        boxSizing: "border-box",
        color,
        fontFamily: m.family,
      }}
    >
      {competitor && (
        <div
          style={{
            fontSize: nameSize,
            fontWeight: m.nameWeight,
            lineHeight: 1,
            transform: shift,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {competitor}
        </div>
      )}
      <div
        style={{
          fontSize: timeSize,
          lineHeight: 1,
          fontWeight: m.timeWeight,
          fontVariantNumeric: m.fixedDigits ? undefined : "tabular-nums lining-nums",
          transform: shift,
          whiteSpace: "nowrap",
          flexShrink: 0,
          color: targetReached(seconds, target) ? targetColor : undefined,
          transition: "color 0.2s",
        }}
      >
        {m.fixedDigits
          ? [...text].map((c, i) =>
              isDigit(c) ? (
                <span
                  key={i}
                  style={{ display: "inline-block", width: `${m.digit}em`, textAlign: "center" }}
                >
                  {c}
                </span>
              ) : (
                <span key={i}>{c}</span>
              )
            )
          : text}
      </div>
    </div>
  );
}
