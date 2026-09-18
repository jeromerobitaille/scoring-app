import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { computeRanking, formatScore, entryDisplayMode } from "../../utils/score";
import { backgroundFor, cardStyle, fontStyle, hexToRgba, rankBadge } from "../../state/look";
import { targetReached } from "../../hooks/useLiveTimer";
import logo from "../../assets/logo.png";

/**
 * Tableau plein écran, purement présentationnel. Toutes les dimensions sont
 * relatives à `unit` = hauteur / 1080 : le même composant sert au plein écran
 * et à l'aperçu réduit de l'éditeur d'apparence.
 *
 * Structure : en-tête (logo, titre, discipline) → bloc « sur le parcours »
 * (compétiteur, animal, chrono) → classement paginé avec ligne de coupure →
 * pied (« Non officiel », pagination).
 */
export default function LeaderboardScreen({
  look,
  entries,
  roster = [],
  scoreMode,
  eventName,
  rodeoName,
  current = null, // { name, hometown, animal, contractor }
  timerFrame = null,
  timerTarget = null,
  width,
  height,
  pageSize = 5,
  rotationMs = 5000,
  showPagination = true,
  showLogo = true,
  showHero = true,
}) {
  const unit = Math.max(0.05, height / 1080);
  const u = (n) => Math.round(n * unit);
  const { colors } = look;
  const display = fontStyle(look.fonts.display);
  const numbers = fontStyle(look.fonts.numbers);

  const ranked = useMemo(() => computeRanking(entries, scoreMode), [entries, scoreMode]);
  const byCompetitor = useMemo(() => new Map(roster.map((p) => [p.id, p])), [roster]);

  const size = Math.min(10, Math.max(1, pageSize));
  const pages = useMemo(() => {
    const out = [];
    for (let i = 0; i < ranked.length; i += size) out.push(ranked.slice(i, i + size));
    return out;
  }, [ranked, size]);
  const pageCount = pages.length || 1;
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    if (pageCount <= 1 || rotationMs <= 0) return;
    const id = setInterval(() => setPageIndex((p) => (p + 1) % pageCount), rotationMs);
    return () => clearInterval(id);
  }, [pageCount, rotationMs]);
  useEffect(() => {
    if (pageIndex >= pageCount) setPageIndex(0);
  }, [pageIndex, pageCount]);

  const heroVisible = showHero && (current || timerFrame);
  const headerH = u(150);
  const heroH = heroVisible ? u(210) : 0;
  const footerH = u(64);
  const padY = u(28);
  // Marges haut/bas + un écart entre chaque section.
  const listH = height - headerH - heroH - footerH - padY * (heroVisible ? 5 : 4);
  const rowGap = u(12);
  const rowH = Math.min(u(112), Math.floor((listH - rowGap * (size - 1)) / size));
  const rowFont = Math.round(rowH * 0.42);
  const subFont = Math.round(rowH * 0.2);
  const badge = Math.round(rowH * 0.66);
  // Les polices de chiffres condensées (Timmons) paraissent petites : on les
  // dimensionne sur la hauteur de capitale pour égaler visuellement les noms.
  const numScale = look.fonts.numbers === "system" ? 1 : 1.35;

  const page = pages[pageIndex] || [];
  const unitLabel = scoreMode === "lower" ? "s" : "pts";
  const timerReached = timerFrame && targetReached(timerFrame.seconds, timerTarget);

  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        padding: `${padY}px ${u(64)}px`,
        display: "flex",
        flexDirection: "column",
        gap: padY,
        background: backgroundFor(look),
        color: colors.text,
        fontFamily: display.fontFamily,
      }}
    >
      {/* En-tête */}
      <header style={{ height: headerH, display: "flex", alignItems: "center", gap: u(32) }}>
        {showLogo && (
          <img src={logo} alt="" style={{ height: u(120), width: "auto", objectFit: "contain", flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {look.headerTitle && (
            <div
              style={{
                fontSize: u(26),
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: colors.muted,
                fontWeight: 700,
                marginBottom: u(6),
              }}
            >
              {look.headerTitle}
            </div>
          )}
          <div
            style={{
              ...display,
              fontSize: u(72),
              lineHeight: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {eventName}
          </div>
        </div>
        {rodeoName && (
          <div
            style={{
              flexShrink: 0,
              padding: `${u(10)}px ${u(22)}px`,
              borderRadius: u(999),
              background: hexToRgba(colors.accent, 0.16),
              border: `${Math.max(1, u(2))}px solid ${hexToRgba(colors.accent, 0.6)}`,
              color: colors.accent,
              fontSize: u(26),
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {rodeoName}
          </div>
        )}
      </header>

      {/* Sur le parcours */}
      {heroVisible && (
        <section
          style={{
            ...cardStyle(look, unit),
            height: heroH,
            display: "flex",
            alignItems: "center",
            gap: u(40),
            padding: `0 ${u(48)}px`,
            boxSizing: "border-box",
            borderLeft: `${u(10)}px solid ${colors.accent}`,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: u(22),
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: colors.muted,
                fontWeight: 700,
                marginBottom: u(8),
              }}
            >
              {timerFrame?.state === "running" ? "En cours" : "Sur le parcours"}
            </div>
            <div
              style={{
                ...display,
                fontSize: u(64),
                lineHeight: 1.05,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {current?.name ?? "—"}
            </div>
            {look.showHometown && current?.hometown && (
              <div style={{ fontSize: u(28), color: colors.muted, marginTop: u(6), fontWeight: 600 }}>
                {current.hometown}
              </div>
            )}
          </div>

          {look.showAnimal && current?.animal && (
            <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
              <div style={{ fontSize: u(26), color: colors.accent, fontWeight: 800, letterSpacing: "0.12em" }}>
                VS
              </div>
              <div
                style={{
                  ...display,
                  fontSize: u(52),
                  lineHeight: 1.05,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {current.animal}
              </div>
              {current.contractor && (
                <div style={{ fontSize: u(26), color: colors.muted, marginTop: u(6), fontWeight: 600 }}>
                  {current.contractor}
                </div>
              )}
            </div>
          )}

          {timerFrame && (
            <div
              style={{
                flexShrink: 0,
                minWidth: u(420),
                padding: `${u(14)}px ${u(36)}px`,
                borderRadius: u(look.radius),
                background: "#000",
                border: `${Math.max(1, u(3))}px solid ${colors.accent}`,
                textAlign: "center",
                ...numbers,
                fontSize: u(132),
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums lining-nums",
                color: timerReached ? colors.timerTarget : colors.text,
                transition: "color 0.2s",
              }}
            >
              {formatScore(timerFrame.seconds, "time")}
            </div>
          )}
        </section>
      )}

      {/* Classement */}
      <section style={{ flex: 1, minHeight: 0, position: "relative" }}>
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
                      ...cardStyle(look, unit),
                      height: rowH,
                      display: "flex",
                      alignItems: "center",
                      gap: u(28),
                      padding: `0 ${u(36)}px 0 ${u(24)}px`,
                      boxSizing: "border-box",
                      opacity: look.cutLine > 0 && !qualified ? 0.8 : 1,
                    }}
                  >
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
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          ...display,
                          fontSize: rowFont,
                          lineHeight: 1.05,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {e.name}
                      </div>
                      {look.showHometown && p?.hometown && rowH >= u(70) && (
                        <div style={{ fontSize: subFont, color: colors.muted, fontWeight: 600, marginTop: u(2) }}>
                          {p.hometown}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: u(10), flexShrink: 0 }}>
                      <span
                        style={{
                          ...numbers,
                          fontSize: Math.round(rowH * 0.56 * numScale),
                          lineHeight: 1,
                          fontVariantNumeric: "tabular-nums lining-nums",
                        }}
                      >
                        {formatScore(e.parsed, entryDisplayMode(e, scoreMode))}
                      </span>
                      <span style={{ fontSize: subFont, color: colors.muted, fontWeight: 700 }}>
                        {e.timeHint ? "s" : unitLabel}
                      </span>
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
            {page.length === 0 && (
              <div style={{ textAlign: "center", color: colors.muted, fontSize: u(36), paddingTop: u(60) }}>
                En attente des premiers résultats…
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Pied */}
      <footer
        style={{
          height: footerH,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: colors.muted,
          fontSize: u(24),
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        <span>{look.showUnofficial ? "Non officiel" : ""}</span>
        {pageCount > 1 && showPagination && (
          <span style={{ display: "flex", alignItems: "center", gap: u(10) }}>
            {Array.from({ length: pageCount }).map((_, i) => (
              <span
                key={i}
                style={{
                  width: u(14),
                  height: u(14),
                  borderRadius: "50%",
                  background: i === pageIndex ? colors.accent : hexToRgba(colors.text, 0.25),
                }}
              />
            ))}
          </span>
        )}
        <span>{scoreMode === "lower" ? "Temps — le plus bas gagne" : "Pointage — le plus haut gagne"}</span>
      </footer>
    </div>
  );
}
