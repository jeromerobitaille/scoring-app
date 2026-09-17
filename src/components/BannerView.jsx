import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { computeRanking, formatScore, entryDisplayMode } from "../utils/score";
import bannerLogo from "../assets/banner.jpg";
import logo from "../assets/logo.png";
import TimerDisplay from "./TimerDisplay";
import { bannerCardStyle } from "./bannerCard";

const BREAKING_MS = 5000;
const ROTATE_MS = 5000;

const rankBadgeBg = (rank) => {
  if (rank === 1) return "linear-gradient(135deg,#FFD700 0%,#FFE68A 100%)";
  if (rank === 2) return "linear-gradient(135deg,#D9D9D9 0%,#FFFFFF 100%)";
  if (rank === 3) return "linear-gradient(135deg,#CD7F32 0%,#E6A260 100%)";
  return "linear-gradient(135deg,#2f2f2f 0%,#3a3a3a 100%)";
};

/**
 * Chrono FarmTek en direct, par-dessus le bandeau : le temps seul, précédé du
 * nom du compétiteur si l'option est active. Sous l'annonce « breaking »
 * (zIndex 50) pour qu'un résultat qu'on vient de saisir reste prioritaire.
 */
function LiveTimerOverlay({ frame, competitor, target, containerW, containerH }) {
  return (
    <motion.div
      key="live-timer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        background: "linear-gradient(180deg,#000,#0b0b0b)",
      }}
    >
      <TimerDisplay
        seconds={frame.seconds}
        competitor={competitor}
        width={containerW}
        height={containerH}
        target={target}
      />
    </motion.div>
  );
}

/**
 * Pure presentational banner. Renders the chip layout (logo + ranked entries)
 * and the breaking-news overlay inside the bounds given by `width` × `height`.
 * No URL/localStorage access — all data comes from props.
 */
export default function BannerView({
  banner,
  entries,
  scoreMode,
  eventName,
  width,
  height,
  timerFrame = null,
  competitor = null,
  timerTarget = null,
  contextKey = null,
}) {
  const containerW = Math.max(64, Number(width) || 0);
  const containerH = Math.max(32, Number(height) || 0);
  const unit = containerH / 216;

  const ranked = useMemo(() => computeRanking(entries, scoreMode), [entries, scoreMode]);

  // Pagination
  const pageSize = Math.min(6, Math.max(1, Number(banner.pageSize) || 3));
  const pages = useMemo(() => {
    const out = [];
    for (let i = 0; i < ranked.length; i += pageSize) out.push(ranked.slice(i, i + pageSize));
    return out;
  }, [ranked, pageSize]);

  const pageCount = pages.length || 1;
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    if (pageCount <= 1) return;
    const id = setInterval(() => setPageIndex((p) => (p + 1) % pageCount), ROTATE_MS);
    return () => clearInterval(id);
  }, [pageCount]);

  useEffect(() => {
    if (pageIndex >= pageCount) setPageIndex(0);
  }, [pageIndex, pageCount]);

  // Annonce « nouveau résultat »
  const [breaking, setBreaking] = useState(null);
  const seenIdsRef = useRef(new Set());
  const lastParsedRef = useRef(new Map());
  const contextRef = useRef(null);

  // Détection seulement : cet effet se relance à chaque état reçu (la liste est
  // recréée même sans changement de résultats), il ne doit donc gérer aucun
  // minuteur — sinon il annule celui qui ferme l'annonce et elle reste figée.
  useEffect(() => {
    // Nouvelle compétition (ou premier rendu) : les résultats déjà là ne sont
    // pas des nouveautés.
    if (contextRef.current !== contextKey) {
      contextRef.current = contextKey;
      seenIdsRef.current = new Set(ranked.map((e) => e.id));
      lastParsedRef.current = new Map(ranked.map((e) => [e.id, e.parsed]));
      setBreaking(null);
      return;
    }

    const unseen = ranked.filter((e) => !seenIdsRef.current.has(e.id));
    let announce = null;
    if (unseen.length > 0) {
      // ranked est trié : le premier non vu est le mieux classé.
      announce = unseen[0];
      unseen.forEach((e) => seenIdsRef.current.add(e.id));
    } else {
      announce = ranked.find((e) => {
        const prev = lastParsedRef.current.get(e.id);
        return prev !== undefined && prev !== e.parsed && e.parsed != null;
      }) ?? null;
    }
    lastParsedRef.current = new Map(ranked.map((e) => [e.id, e.parsed]));

    if (announce) {
      setBreaking({
        key: `${announce.id}:${announce.parsed}:${Date.now()}`,
        id: announce.id,
        name: announce.name,
        scoreText: formatScore(announce.parsed, entryDisplayMode(announce, scoreMode)),
        rank: announce.rank,
      });
    }
  }, [ranked, scoreMode, contextKey]);

  // Fermeture : ne dépend que de l'annonce affichée.
  useEffect(() => {
    if (!breaking) return;
    const t = setTimeout(() => setBreaking(null), BREAKING_MS);
    return () => clearTimeout(t);
  }, [breaking]);

  // Une nouvelle course passe avant l'annonce : le chrono doit rester visible.
  const timerRunning = timerFrame?.state === "running";
  useEffect(() => {
    if (timerRunning) setBreaking(null);
  }, [timerRunning]);

  // UI tokens
  const padX = Math.round(40 * unit);
  const gap = Math.round(24 * unit);
  const nameSizeBase = Math.round(40 * unit);
  const scoreSizeBase = Math.round(56 * unit);
  const logoHCentered = Math.round(0.8 * containerH);
  const logoHLeft = Math.round(0.6 * containerH);
  const chipPX = `${Math.round(32 * unit)}px`;
  const chipPY = `${Math.round(36 * unit)}px`;
  const sep = `${Math.round(16 * unit)}px`;

  const nameScale = Number(banner.nameScale ?? 1);
  const scoreScale = Number(banner.scoreScale ?? 1);
  const nameSize = Math.max(10, Math.round(nameSizeBase * nameScale));
  const scoreSize = Math.max(10, Math.round(scoreSizeBase * scoreScale));

  const showLogo = banner.showLogo !== false;

  // ── Empty state ─────────────────────────────────────────────
  if (ranked.length === 0) {
    return (
      <div
        className="bg-black flex items-center justify-center"
        style={{
          width: containerW,
          height: containerH,
          position: "absolute",
          top: 0,
          left: 0,
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {showLogo ? (
          <img
            src={bannerLogo}
            alt="Festival Western de St-Tite"
            style={{ height: `${logoHCentered}px`, width: "auto", objectFit: "contain" }}
          />
        ) : (
          <div
            style={{
              color: "rgba(255,255,255,0.85)",
              fontWeight: 800,
              fontSize: Math.round(72 * unit),
              letterSpacing: "0.02em",
              textAlign: "center",
              padding: `0 ${Math.round(40 * unit)}px`,
            }}
          >
            {eventName?.trim() || "En attente des résultats…"}
          </div>
        )}
        <AnimatePresence>
          {timerFrame && <LiveTimerOverlay frame={timerFrame} competitor={competitor} target={timerTarget} containerW={containerW} containerH={containerH} />}
        </AnimatePresence>
      </div>
    );
  }

  const current = pages[pageIndex] || [];
  const slots = Array.from({ length: pageSize }, (_, i) => current[i] ?? null);

  return (
    <div
      className="flex items-center"
      style={{
        width: containerW,
        height: containerH,
        position: "absolute",
        top: 0,
        left: 0,
        overflow: "hidden",
        padding: `0 ${padX}px`,
        boxSizing: "border-box",
        background:
          "radial-gradient(120% 100% at 0% 50%, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0) 60%), linear-gradient(180deg,#000,#0b0b0b)",
      }}
    >
      {showLogo && (
        <div className="flex items-center h-full" style={{ marginRight: gap }}>
          <img
            src={logo}
            alt="Festival Western de St-Tite"
            style={{ height: `${logoHLeft}px`, width: "auto", objectFit: "contain" }}
          />
        </div>
      )}

      <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`page-${pageIndex}`}
            className="grid items-stretch"
            style={{
              gridTemplateColumns: `repeat(${pageSize}, minmax(0, 1fr))`,
              gap: `${gap}px`,
            }}
            initial={{ opacity: 0, x: 40 * unit }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 * unit }}
            transition={{ duration: 0.45 }}
          >
            {slots.map((e, colIdx) => {
              if (!e) return <div key={`empty-${colIdx}`} className="min-w-0" />;

              const displayRank = e.rank;
              const nameLineHeight = Math.round(nameSize * 1.06);
              const numberCircle = Math.round(70 * unit);

              return (
                <div key={e.id} className="min-w-0">
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `${numberCircle}px 1fr auto`,
                      alignItems: "center",
                      gap: sep,
                      padding: `${chipPY} ${chipPX}`,
                      ...bannerCardStyle(unit),
                      color: "#fff",
                      minWidth: 0,
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        width: numberCircle,
                        height: numberCircle,
                        minWidth: numberCircle,
                        borderRadius: "9999px",
                        background: rankBadgeBg(displayRank),
                        display: "grid",
                        placeItems: "center",
                        color: displayRank <= 3 ? "#111" : "#fff",
                        fontWeight: 900,
                        fontSize: `${Math.round(50 * unit)}px`,
                        boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
                      }}
                      title={`Rang ${displayRank}`}
                    >
                      {displayRank}
                    </div>

                    <div
                      style={{
                        fontSize: `${nameSize}px`,
                        fontWeight: 900,
                        lineHeight: `${nameLineHeight}px`,
                        maxHeight: `${nameLineHeight * 2}px`,
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "normal",
                        minWidth: 0,
                      }}
                      title={e.name}
                    >
                      {e.name.split(" ").map((part, i) => (
                        <span key={i}>
                          {part}
                          {i < e.name.split(" ").length - 1 && <br />}
                        </span>
                      ))}
                    </div>

                    <motion.div
                      key={`${e.id}-${e.parsed}`}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 320, damping: 22 }}
                      style={{
                        fontSize: (scoreMode === "lower" || e.timeHint) ? Math.round(scoreSize * 0.82) : scoreSize,
                        fontWeight: 900,
                        fontVariantNumeric: "tabular-nums lining-nums",
                        justifySelf: "end",
                        alignSelf: "center",
                        display: "flex",
                        alignItems: "baseline",
                        gap: Math.round(6 * unit),
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span>{formatScore(e.parsed, entryDisplayMode(e, scoreMode))}</span>
                      <span style={{ fontSize: `${Math.round(scoreSize * 0.35)}px`, opacity: 0.7 }}>
                        {scoreMode === "lower" || e.timeHint ? "sec" : "pts"}
                      </span>
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {timerFrame && <LiveTimerOverlay frame={timerFrame} competitor={competitor} target={timerTarget} containerW={containerW} containerH={containerH} />}
      </AnimatePresence>

      {/* Breaking news overlay */}
      <AnimatePresence>
        {breaking && !timerRunning && (
          <motion.div
            key={`breaking-${breaking.key}`}
            initial={{ y: -containerH, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -containerH, opacity: 0 }}
            transition={{ duration: 0.45 }}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 50,
              background: `
                linear-gradient(180deg, rgba(0,0,0,0.85), rgba(0,0,0,0.85)),
                repeating-linear-gradient(
                  -45deg,
                  rgba(255,255,255,0.04) 0px,
                  rgba(255,255,255,0.04) 6px,
                  transparent 6px,
                  transparent 12px
                )
              `,
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              alignItems: "center",
              gap: Math.round(24 * unit),
              padding: `0 ${Math.round(40 * unit)}px`,
            }}
          >
            <div
              style={{
                width: Math.round(88 * unit),
                height: Math.round(88 * unit),
                borderRadius: 9999,
                background: rankBadgeBg(breaking.rank),
                display: "grid",
                placeItems: "center",
                color: breaking.rank <= 3 ? "#111" : "#fff",
                fontWeight: 900,
                fontSize: Math.round(40 * unit),
                boxShadow: "0 6px 22px rgba(0,0,0,0.45)",
              }}
              title={`Rang ${breaking.rank}`}
            >
              {breaking.rank}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: Math.round(24 * unit) }}>
              <div
                style={{
                  fontSize: Math.round(66 * unit),
                  fontWeight: 800,
                  lineHeight: `${Math.round(66 * unit * 1.06)}px`,
                  maxHeight: `${Math.round(66 * unit * 2 * 1.06)}px`,
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: "#fff",
                  letterSpacing: "-0.01em",
                }}
                title={breaking.name}
              >
                {breaking.name}
              </div>

              <motion.div
                key={`score-${breaking.scoreText}`}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
                style={{
                  fontWeight: 900,
                  color: "#fff",
                  fontVariantNumeric: "tabular-nums lining-nums",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "baseline",
                  gap: Math.round(6 * unit),
                }}
              >
                <span style={{ fontSize: Math.round(92 * unit) }}>{breaking.scoreText}</span>
                <span style={{ fontSize: Math.round(92 * unit * 0.35), opacity: 0.7, marginLeft: 2 }}>
                  {(scoreMode === "lower" || ranked.find((r) => r.id === breaking.id)?.timeHint) ? "sec" : "pts"}
                </span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
