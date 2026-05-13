import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import useSyncedState from "../state/useSyncedState";
import { computeRanking, formatScore } from "../utils/score";
import logo from "../assets/logo.png";


const rankBadgeBg = (rank) => {
  if (rank === 1) return "linear-gradient(135deg,#FFD700 0%,#FFE68A 100%)";
  if (rank === 2) return "linear-gradient(135deg,#D9D9D9 0%,#FFFFFF 100%)";
  if (rank === 3) return "linear-gradient(135deg,#CD7F32 0%,#E6A260 100%)";
  return "linear-gradient(135deg,#2f2f2f 0%,#3a3a3a 100%)";
};

export default function DisplayView() {
  const [state] = useSyncedState();

  useEffect(() => {
    document.body.classList.toggle("dark", state.theme === "dark");
  }, [state.theme]);

  const ranked = useMemo(
    () => computeRanking(state.entries, state.scoreMode),
    [state]
  );


  const pageSize = 5;
  const pages = useMemo(() => {
    const out = [];
    for (let i = 0; i < ranked.length; i += pageSize) {
      out.push(ranked.slice(i, i + pageSize));
    }
    return out;
  }, [ranked]);

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

  const current = pages[pageIndex] || [];

  return (
    <div className="min-h-screen px-10 py-8 flex flex-col gap-6 items-stretch bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-black dark:to-zinc-950 text-zinc-900 dark:text-white">

     
      <div className="relative mx-auto w-full max-w-7xl flex items-center justify-center">
        <img
          src={logo}
          alt="Festival Western de St-Tite"
          className="absolute left-0 h-24 w-auto"
        />
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-center">
          {state.eventName}
        </h1>
      </div>

      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={`page-${pageIndex}`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35 }}
            className="grid gap-4 justify-items-center"
          >
            {current.map((e) => {
              const isTime = state.scoreMode === "lower" || e.timeHint;
              const displayRank = ranked.findIndex((r) => r.id === e.id) + 1;

              return (
                <div
                  key={e.id}
                  className="w-full max-w-7xl flex items-center gap-6 rounded-3xl border-2 border-zinc-200 dark:border-zinc-700 p-6 md:p-8 bg-white/70 dark:bg-zinc-900 backdrop-blur"
                >
          
                  <div
                    className="flex-shrink-0 rounded-full grid place-items-center w-16 h-16 md:w-20 md:h-20 shadow"
                    style={{
                      background: rankBadgeBg(displayRank),
                      boxShadow: "0 6px 22px rgba(0,0,0,0.35)",
                    }}
                    title={`Rang ${displayRank}`}
                  >
                    <span
                      className="tabular-nums font-black text-3xl md:text-5xl"
                      style={{ color: displayRank <= 3 ? "#111" : "#fff", lineHeight: 1 }}
                    >
                      {displayRank}
                    </span>
                  </div>

                 
                  <div className="flex-1 min-w-0">
                    <div className="text-3xl md:text-5xl font-bold leading-tight truncate">
                      {e.name}
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <div className="text-4xl md:text-6xl font-extrabold tabular-nums whitespace-nowrap">
                      {formatScore(
                        e.parsed,
                        e.timeHint || (state.scoreMode === "lower" ? "time" : null)
                      )}
                    </div>
                    <div className="text-lg md:text-2xl opacity-70">
                      {isTime ? "sec" : "pts"}
                    </div>
                  </div>
                </div>
              );
            })}

            {current.length === 0 && (
              <div className="text-center text-lg opacity-70">
                En attente des premiers résultats…
              </div>
            )}
          </motion.div>
        </AnimatePresence>

     
        {pageCount > 1 && (
          <div className="mt-3 w-full flex justify-center gap-2">
            {Array.from({ length: pageCount }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full ${
                  i === pageIndex
                    ? "bg-zinc-800 dark:bg-zinc-200"
                    : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="text-center opacity-60 text-xs">
        Mode d’affichage • Tri:{" "}
        {state.scoreMode === "higher"
          ? "Plus haut = meilleur"
          : "Plus bas = meilleur"}
      </div>
    </div>
  );
}
