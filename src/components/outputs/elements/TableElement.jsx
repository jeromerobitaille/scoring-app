import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatScore, entryDisplayMode } from "../../../utils/score";
import { cardStyle, hexToRgba, rankBadge } from "../../../state/look";
import { fontKeyFor, paginate, themedFont, useRotation } from "./util";

/**
 * Classement paginé (rang, nom, ville, résultat). Les rangées se partagent la
 * hauteur de l'élément ; la ligne de coupure vient du thème (Apparence).
 */
export default function TableElement({ el, ctx }) {
  const { look, ranked, scoreMode, byCompetitor } = ctx;
  const { colors } = look;
  const display = themedFont(el.nameFont, look, "display");
  const numbers = themedFont(el.numberFont, look, "numbers");
  const n = el.pageSize;
  const pages = paginate(ranked, n);
  const pageCount = pages.length || 1;
  const pageIndex = useRotation(pageCount, el.rotationMs);
  const page = pages[pageIndex] || [];

  const dotsH = el.showPagination && pageCount > 1 ? Math.round(Math.min(40, el.height * 0.07)) : 0;
  const rowGap = Math.round(Math.min(12, el.height * 0.02));
  const rowH = Math.max(12, Math.min(220, Math.floor((el.height - dotsH - rowGap * (n - 1)) / n)));
  const unit = rowH / 112; // 112 px = rangée du tableau 1080p d'origine
  const u = (v) => Math.round(v * unit);
  const rowFont = Math.round(rowH * 0.42 * el.fontScale);
  const subFont = Math.round(rowH * 0.2 * el.fontScale);
  const badge = Math.round(rowH * 0.66);
  const numScale = fontKeyFor(el.numberFont, look, "numbers") === "system" ? 1 : 1.35;
  const unitLabel = scoreMode === "lower" ? "s" : "pts";
  const line = el.rowStyle === "line";

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", color: colors.text, fontFamily: display.fontFamily }}>
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`page-${pageIndex}`}
            initial={{ opacity: 0, x: u(40) }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -u(40) }}
            transition={{ duration: 0.35 }}
            style={{ display: "flex", flexDirection: "column", gap: rowGap }}
          >
            {page.map((e) => {
              const p = byCompetitor.get(e.competitorId);
              const qualified = look.cutLine > 0 && e.rank <= look.cutLine;
              const showCut = look.cutLine > 0 && e.rank === look.cutLine;
              return (
                <React.Fragment key={e.id}>
                  <div
                    style={{
                      ...(line
                        ? { borderBottom: `${Math.max(1, u(2))}px solid ${hexToRgba(colors.text, 0.18)}` }
                        : cardStyle(look, unit)),
                      height: rowH,
                      display: "flex",
                      alignItems: "center",
                      gap: u(28),
                      padding: line ? `0 ${u(12)}px` : `0 ${u(36)}px 0 ${u(24)}px`,
                      boxSizing: "border-box",
                      opacity: look.cutLine > 0 && !qualified ? 0.8 : 1,
                    }}
                  >
                    {el.showRank && (
                      <div
                        style={{
                          ...rankBadge(look, e.rank),
                          width: badge,
                          height: badge,
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                          ...numbers,
                          fontSize: Math.round(badge * 0.62 * numScale),
                          lineHeight: 1,
                        }}
                      >
                        {e.rank}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...display, fontSize: rowFont, lineHeight: 1.05, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {e.name}
                      </div>
                      {el.showHometown && p?.hometown && rowH >= 70 * el.fontScale && (
                        <div style={{ fontSize: subFont, color: colors.muted, fontWeight: 600, marginTop: u(2), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p.hometown}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: u(10), flexShrink: 0 }}>
                      <span style={{ ...numbers, fontSize: Math.round(rowH * 0.56 * numScale * el.fontScale), lineHeight: 1, fontVariantNumeric: "tabular-nums lining-nums" }}>
                        {formatScore(e.parsed, entryDisplayMode(e, scoreMode))}
                      </span>
                      {el.showUnit && (
                        <span style={{ fontSize: subFont, color: colors.muted, fontWeight: 700 }}>{e.timeHint ? "s" : unitLabel}</span>
                      )}
                    </div>
                  </div>
                  {showCut && (
                    <div
                      style={{
                        height: Math.max(2, u(4)),
                        margin: `${-rowGap / 2 + u(2)}px ${u(8)}px`,
                        background: colors.cutLine,
                        boxShadow: `0 0 ${u(12)}px ${colors.cutLine}`,
                        borderRadius: 2,
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
            {page.length === 0 && el.emptyText && (
              <div style={{ textAlign: "center", color: colors.muted, fontSize: Math.round(rowH * 0.32 * el.fontScale), paddingTop: u(40) }}>
                {el.emptyText}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      {dotsH > 0 && (
        <div style={{ height: dotsH, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: Math.round(dotsH * 0.3) }}>
          {Array.from({ length: pageCount }).map((_, i) => (
            <span
              key={i}
              style={{
                width: Math.round(dotsH * 0.35),
                height: Math.round(dotsH * 0.35),
                borderRadius: "50%",
                background: i === pageIndex ? colors.accent : hexToRgba(colors.text, 0.25),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
