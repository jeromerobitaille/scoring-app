import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import useSyncedState from "../state/useSyncedState";
import { computeRanking, formatScore, entryDisplayMode } from "../utils/score";
import bannerLogo from "../assets/banner.jpg";
import logo from "../assets/logo.png";

const BREAKING_MS = 5000;

const FALLBACK_BANNER = {
    width: 2592, height: 216,
    nameScale: 1, scoreScale: 1,
    pageSize: 3, showLogo: true,
};

export default function BannerDisplay() {
    const [state] = useSyncedState();
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;

    const bid = Math.min(1, Math.max(0, Number(params?.get("bid")) || 0));
    const banner = state.banners?.[bid] ?? state.banners?.[0] ?? FALLBACK_BANNER;

    const wParam = params?.get("w") ? Number(params.get("w")) : banner.width;
    const hParam = params?.get("h") ? Number(params.get("h")) : banner.height;

    const containerW = Math.max(320, wParam || 0);
    const containerH = Math.max(64, hParam || 0);
    const unit = containerH / 216;

    const ranked = useMemo(() => computeRanking(state.entries, state.scoreMode), [state]);

    // Overlay "breaking news"
    const [breaking, setBreaking] = useState(null); // { id, name, scoreText, rank }
    const seenIdsRef = useRef(new Set());
    const lastParsedRef = useRef(new Map());

    const rankBadgeBg = (rank) => {
        if (rank === 1) return "linear-gradient(135deg,#FFD700 0%,#FFE68A 100%)";
        if (rank === 2) return "linear-gradient(135deg,#D9D9D9 0%,#FFFFFF 100%)";
        if (rank === 3) return "linear-gradient(135deg,#CD7F32 0%,#E6A260 100%)";
        return "linear-gradient(135deg,#2f2f2f 0%,#3a3a3a 100%)";
    };

    // Pagination en colonnes fixes — taille de page configurable par bandeau
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
        const id = setInterval(() => setPageIndex((p) => (p + 1) % pageCount), 5000);
        return () => clearInterval(id);
    }, [pageCount]);

    useEffect(() => {
        if (pageIndex >= pageCount) setPageIndex(0);
    }, [pageIndex, pageCount]);

    // Détection breaking (nouvelle entrée / score modifié)
    useEffect(() => {
        if (seenIdsRef.current.size === 0 && ranked.length > 0) {
            ranked.forEach((e) => seenIdsRef.current.add(e.id));
            ranked.forEach((e) => lastParsedRef.current.set(e.id, e.parsed));
            return;
        }

        const unseen = ranked.filter((e) => !seenIdsRef.current.has(e.id));
        if (unseen.length > 0) {
            let best = unseen[0];
            let bestIdx = ranked.findIndex((r) => r.id === best.id);
            for (const e of unseen) {
                const idx = ranked.findIndex((r) => r.id === e.id);
                if (idx !== -1 && idx < bestIdx) { best = e; bestIdx = idx; }
            }
            const scoreText = formatScore(best.parsed, entryDisplayMode(best, state.scoreMode));
            setBreaking({ id: best.id, name: best.name, scoreText, rank: best.rank });
            unseen.forEach((e) => seenIdsRef.current.add(e.id));
            const t = setTimeout(() => setBreaking(null), BREAKING_MS);
            return () => clearTimeout(t);
        }

        for (const e of ranked) {
            const prev = lastParsedRef.current.get(e.id);
            if (prev !== undefined && prev !== e.parsed && e.parsed != null) {
                const scoreText = formatScore(e.parsed, entryDisplayMode(e, state.scoreMode));
                setBreaking({ id: e.id, name: e.name, scoreText, rank: e.rank });
                const t = setTimeout(() => setBreaking(null), BREAKING_MS);
                lastParsedRef.current.set(e.id, e.parsed);
                return () => clearTimeout(t);
            }
            lastParsedRef.current.set(e.id, e.parsed);
        }
    }, [ranked, state.scoreMode]);

    // Tokens d’UI
    const padX = Math.round(40 * unit);
    const gap = Math.round(24 * unit);
    const nameSizeBase = Math.round(40 * unit);
    const scoreSizeBase = Math.round(56 * unit);
    const logoHCentered = Math.round(0.8 * containerH);
    const logoHLeft = Math.round(0.6 * containerH);
    const chipPX = `${Math.round(32 * unit)}px`;
    const chipPY = `${Math.round(36 * unit)}px`;
    const sep = `${Math.round(16 * unit)}px`;

    const nameScale  = Number(banner.nameScale ?? 1);
    const scoreScale = Number(banner.scoreScale ?? 1);

    const nameSize  = Math.max(10, Math.round(nameSizeBase  * nameScale));
    const scoreSize = Math.max(10, Math.round(scoreSizeBase * scoreScale));

    const showLogo = banner.showLogo !== false;

    if (ranked.length === 0) {
        return (
            <div
                className="bg-black flex items-center justify-center"
                style={{
                    width: containerW,
                    height: containerH,
                    position: "absolute",
                    top: 0, left: 0, overflow: "hidden", boxSizing: "border-box",
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
                        {state.eventName?.trim() || "En attente des résultats…"}
                    </div>
                )}
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
            {/* Logo gauche (largeur auto) — masquable via Paramètres > Bandeau */}
            {showLogo && (
                <div className="flex items-center h-full" style={{ marginRight: gap }}>
                    <img
                        src={logo}
                        alt="Festival Western de St-Tite"
                        style={{ height: `${logoHLeft}px`, width: "auto", objectFit: "contain" }}
                    />
                </div>
            )}

            {/* Grille fixe 3 colonnes (positions stables) */}
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
                            // slot vide pour préserver l’alignement
                            if (!e) {
                                return (
                                    <div key={`empty-${colIdx}`} className="min-w-0" />
                                );
                            }

                            const displayRank = e.rank;

                            const chipRadius = Math.round(18 * unit);
                            const nameLineHeight = Math.round(nameSize * 1.06);
                            const numberCircle = Math.round(70 * unit);

                            return (
                                <div key={e.id} className="min-w-0">
                                    {/* CHIP (pleine largeur de la colonne) */}
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: `${numberCircle}px 1fr auto`,
                                            alignItems: "center",
                                            gap: sep,
                                            padding: `${chipPY} ${chipPX}`,
                                            borderRadius: chipRadius,
                                            backdropFilter: "blur(6px)",
                                            background: "rgba(30,30,30,0.6)",
                                            border: "2px solid rgba(255,255,255,0.15)",
                                            boxShadow: "0 6px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
                                            color: "#fff",
                                            minWidth: 0,
                                            width: "100%",
                                        }}
                                    >
                                        {/* Badge rang */}
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

                                        {/* Nom – clamp 2 lignes */}
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

                                                minWidth: 0, // important pour ellipsis dans une grille
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

                                        {/* Score – collé à droite, ne pousse jamais */}
                                        <motion.div
                                            key={`${e.id}-${e.parsed}`}
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ type: "spring", stiffness: 320, damping: 22 }}
                                            style={{
                                                fontSize: (state.scoreMode === "lower" || e.timeHint) ? Math.round(scoreSize * 0.82) : scoreSize, // ← ICI
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
                                            <span>
                                                {formatScore(e.parsed, entryDisplayMode(e, state.scoreMode))}
                                            </span>
                                            <span style={{ fontSize: `${Math.round(scoreSize * 0.35)}px`, opacity: 0.7 }}>
                                                {state.scoreMode === "lower" || e.timeHint ? "sec" : "pts"}
                                            </span>
                                        </motion.div>
                                    </div>
                                </div>
                            );
                        })}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Overlay "Breaking news" */}
            <AnimatePresence>
                {breaking && (
                    <motion.div
                        key={`breaking-${breaking.id}-${breaking.scoreText}`}
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
                        {/* BADGE RANG */}
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

                        {/* NOM + SCORE */}
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

                            {/* Score animé + unité */}
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
                                    gap: Math.round(6 * (containerH / 216)),
                                }}
                            >
                                <span style={{ fontSize: Math.round(92 * (containerH / 216)) }}>
                                    {breaking.scoreText}
                                </span>
                                <span
                                    style={{
                                        fontSize: Math.round(92 * (containerH / 216) * 0.35),
                                        opacity: 0.7,
                                        marginLeft: 2,
                                    }}
                                >
                                    {(state.scoreMode === "lower" ||
                                        (ranked.find((r) => r.id === breaking.id)?.timeHint))
                                        ? "sec"
                                        : "pts"}
                                </span>
                            </motion.div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
