import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatScore, entryDisplayMode } from "../../../utils/score";
import { cardStyle, hexToRgba, rankBadge } from "../../../state/look";
import { paginate, resolveColor, themedFont, useRotation } from "./util";

const FLASH_MS = 5000;

/**
 * Cartes de résultats qui défilent page par page (l'ancien bandeau LED), avec
 * l'annonce « nouveau résultat » qui recouvre l'élément quelques secondes.
 */
export default function CarouselElement({ el, ctx }) {
  const { look, ranked, scoreMode, byCompetitor, contextKey } = ctx;
  const display = themedFont(el.nameFont, look, "display");
  const numbers = themedFont(el.numberFont, look, "numbers");
  const W = el.width;
  const H = el.height;
  const unit = H / 216;
  const r = (v) => Math.round(v * unit);

  const pages = paginate(ranked, el.pageSize);
  const pageCount = pages.length || 1;
  const pageIndex = useRotation(pageCount, el.rotationMs);

  // Annonce « nouveau résultat » : détection seule ici (l'effet se relance à
  // chaque état reçu), fermeture par un effet séparé.
  const [flash, setFlash] = useState(null);
  const seenIdsRef = useRef(new Set());
  const lastParsedRef = useRef(new Map());
  const contextRef = useRef(null);
  useEffect(() => {
    if (contextRef.current !== contextKey) {
      contextRef.current = contextKey;
      seenIdsRef.current = new Set(ranked.map((e) => e.id));
      lastParsedRef.current = new Map(ranked.map((e) => [e.id, e.parsed]));
      setFlash(null);
      return;
    }
    const unseen = ranked.filter((e) => !seenIdsRef.current.has(e.id));
    let announce = null;
    if (unseen.length > 0) {
      announce = unseen[0];
      unseen.forEach((e) => seenIdsRef.current.add(e.id));
    } else {
      announce = ranked.find((e) => {
        const prev = lastParsedRef.current.get(e.id);
        return prev !== undefined && prev !== e.parsed && e.parsed != null;
      }) ?? null;
    }
    lastParsedRef.current = new Map(ranked.map((e) => [e.id, e.parsed]));
    if (announce && el.flashNew) {
      setFlash({
        key: `${announce.id}:${announce.parsed}:${Date.now()}`,
        name: announce.name,
        scoreText: formatScore(announce.parsed, entryDisplayMode(announce, scoreMode)),
        unit: scoreMode === "lower" || announce.timeHint ? "s" : "pts",
        rank: announce.rank,
      });
    }
  }, [ranked, scoreMode, contextKey, el.flashNew]);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(t);
  }, [flash]);

  const gap = r(24 * el.gapScale);
  const nameSize = Math.max(6, Math.round(40 * unit * el.nameScale));
  const scoreSize = Math.max(6, Math.round(56 * unit * el.scoreScale));
  const chipPX = r(32 * el.paddingScale);
  const chipPY = r(36 * el.paddingScale);
  const sep = r(16);
  const numberCircle = Math.max(6, r(70 * el.badgeScale));
  const base = cardStyle(look, unit);
  const borderW = Math.max(1, Math.round(2 * unit));
  const chip = {
    background: el.cardFill === "none" ? "transparent" : el.cardFill === "custom" ? hexToRgba(el.cardColor, el.cardOpacity) : base.background,
    border: el.cardBorder ? `${borderW}px solid ${el.cardBorderColor ?? hexToRgba(look.colors.cardBorder, 0.9)}` : `${borderW}px solid transparent`,
    borderRadius: el.cardRadius == null ? base.borderRadius : Math.round(el.cardRadius * unit),
    boxShadow: el.cardShadow && el.cardFill !== "none" ? base.boxShadow : "none",
    color: resolveColor(el.nameColor, look),
  };
  const current = pages[pageIndex] || [];
  const slots = Array.from({ length: el.pageSize }, (_, i) => current[i] ?? null);

  return (
    <div style={{ position: "absolute", inset: 0, color: look.colors.text }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`page-${pageIndex}`}
              style={{ display: "grid", gridTemplateColumns: `repeat(${el.pageSize}, minmax(0, 1fr))`, gap, alignItems: "stretch" }}
              initial={{ opacity: 0, x: 40 * unit }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 * unit }}
              transition={{ duration: 0.45 }}
            >
              {slots.map((e, i) => {
                if (!e) return <div key={`empty-${i}`} style={{ minWidth: 0 }} />;
                const hometown = el.showHometown ? byCompetitor.get(e.competitorId)?.hometown : "";
                const beyondCut = look.cutLine > 0 && e.rank > look.cutLine;
                const nameLineHeight = Math.round(nameSize * 1.06);
                return (
                  <div
                    key={e.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: `${numberCircle}px 1fr auto`,
                      alignItems: "center",
                      gap: sep,
                      padding: `${chipPY}px ${chipPX}px`,
                      ...chip,
                      opacity: beyondCut ? 0.75 : 1,
                      minWidth: 0,
                      boxSizing: "border-box",
                    }}
                  >
                    <div
                      style={{
                        width: numberCircle,
                        height: numberCircle,
                        borderRadius: "9999px",
                        ...rankBadge(look, e.rank),
                        display: "grid",
                        placeItems: "center",
                        ...numbers,
                        fontSize: r(50 * el.badgeScale),
                      }}
                    >
                      {e.rank}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          ...display,
                          fontSize: nameSize,
                          lineHeight: `${nameLineHeight}px`,
                          maxHeight: `${nameLineHeight * (hometown ? 1 : 2)}px`,
                          // Sur une ligne (avec la ville) : bloc simple pour que « … » s'affiche.
                          display: hometown ? "block" : "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: hometown ? undefined : 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: hometown ? "nowrap" : "normal",
                        }}
                      >
                        {e.name}
                      </div>
                      {hometown && (
                        <div style={{ fontSize: Math.round(nameSize * 0.5), lineHeight: 1.15, marginTop: r(4), color: look.colors.muted, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {hometown}
                        </div>
                      )}
                    </div>
                    <motion.div
                      key={`${e.id}-${e.parsed}`}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 320, damping: 22 }}
                      style={{
                        ...numbers,
                        color: resolveColor(el.scoreColor, look),
                        fontSize: scoreMode === "lower" || e.timeHint ? Math.round(scoreSize * 0.82) : scoreSize,
                        fontVariantNumeric: "tabular-nums lining-nums",
                        justifySelf: "end",
                        display: "flex",
                        alignItems: "baseline",
                        gap: r(6),
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span>{formatScore(e.parsed, entryDisplayMode(e, scoreMode))}</span>
                      <span style={{ fontSize: Math.round(scoreSize * 0.35), color: look.colors.muted, fontFamily: display.fontFamily, fontWeight: 700 }}>
                        {scoreMode === "lower" || e.timeHint ? "s" : "pts"}
                      </span>
                    </motion.div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {flash && (
          <motion.div
            key={`flash-${flash.key}`}
            initial={{ y: -H, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -H, opacity: 0 }}
            transition={{ duration: 0.45 }}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 5,
              background: `linear-gradient(180deg, ${hexToRgba(look.colors.bg2, 0.94)}, ${hexToRgba(look.colors.bg2, 0.94)}), repeating-linear-gradient(-45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 6px, transparent 6px, transparent 12px)`,
              borderTop: `${Math.max(2, r(6))}px solid ${look.colors.accent}`,
              borderRadius: Math.round(look.radius * unit),
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              alignItems: "center",
              gap: r(24),
              padding: `0 ${r(40)}px`,
              boxSizing: "border-box",
            }}
          >
            <div style={{ width: r(88), height: r(88), borderRadius: 9999, ...rankBadge(look, flash.rank), display: "grid", placeItems: "center", ...numbers, fontSize: r(40) }}>
              {flash.rank}
            </div>
            <div style={{ ...display, fontSize: Math.min(r(66), Math.round(W / 14)), lineHeight: 1.06, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
              {flash.name}
            </div>
            <div style={{ ...numbers, fontVariantNumeric: "tabular-nums lining-nums", whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: r(6) }}>
              <span style={{ fontSize: r(92) }}>{flash.scoreText}</span>
              <span style={{ fontSize: r(32), color: look.colors.muted, fontFamily: display.fontFamily, fontWeight: 700 }}>{flash.unit}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
