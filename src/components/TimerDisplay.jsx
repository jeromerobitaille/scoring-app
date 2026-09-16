import React from "react";
import { formatScore } from "../utils/score";

// Largeur moyenne d'un chiffre en tabular-nums, en fraction de la taille de police.
const DIGIT_WIDTH = 0.62;
// Largeur moyenne d'un caractère de nom (gras), même unité.
const NAME_CHAR_WIDTH = 0.56;

/**
 * Temps du chrono (et nom du compétiteur en option) dimensionné pour tenir
 * dans une boîte width × height. Utilisé par l'overlay des bandeaux et par
 * l'élément « Chrono » du canevas.
 */
export default function TimerDisplay({
  seconds,
  competitor = null,
  width,
  height,
  align = "center",
  scale = 1,
}) {
  const text = formatScore(seconds, "time");
  // Au moins « 00.000 » : la taille ne saute pas en passant de 9.999 à 10.000.
  const chars = Math.max(text.length, 6);
  const padding = Math.round(height * 0.2);
  const gap = competitor ? Math.round(height * 0.18) : 0;
  // Largeur utile, partagée entre le temps et le nom quand il est affiché.
  const avail = Math.max(1, width - 2 * padding - gap);
  const timeSize = Math.max(
    8,
    Math.round(
      Math.min(height * 0.72, (avail * (competitor ? 0.58 : 1)) / (chars * DIGIT_WIDTH)) * scale
    )
  );
  const timeWidth = chars * DIGIT_WIDTH * timeSize;
  const nameSize = competitor
    ? Math.max(
        8,
        Math.round(
          Math.min(
            height * 0.34,
            timeSize * 0.5,
            (avail - timeWidth) / (competitor.length * NAME_CHAR_WIDTH)
          )
        )
      )
    : 0;
  const justify = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

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
        color: "#fff",
      }}
    >
      {competitor && (
        <div
          style={{
            fontSize: nameSize,
            fontWeight: 800,
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
          fontWeight: 900,
          fontVariantNumeric: "tabular-nums lining-nums",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {text}
      </div>
    </div>
  );
}
