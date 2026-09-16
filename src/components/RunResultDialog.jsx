import React, { useEffect, useRef, useState } from "react";
import { formatScore } from "../utils/score";

const isTyping = (el) => el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");

/**
 * Fin de course : valider le temps du chrono, l'annuler, ou y ajouter une
 * pénalité. Clavier : 0 = aucune pénalité, 1/2/3… = pénalités dans l'ordre,
 * Entrée = valider, Échap = annuler.
 *
 * Monté seulement quand une course est à traiter (le parent le rend
 * conditionnellement), donc l'état local repart à neuf à chaque arrivée.
 */
export default function RunResultDialog({
  seconds,
  eye,
  penalties,
  roster,
  defaultCompetitorId,
  entries,
  onConfirm,
  onCancel,
}) {
  const [penalty, setPenalty] = useState(0);
  const [competitorId, setCompetitorId] = useState(defaultCompetitorId ?? roster[0]?.id ?? "");
  const [freeName, setFreeName] = useState("");
  const validateRef = useRef(null);

  const useRoster = roster.length > 0;
  const competitor = roster.find((p) => p.id === competitorId);
  const name = useRoster ? competitor?.name ?? "" : freeName.trim();
  const existing = useRoster ? entries.find((e) => e.competitorId === competitorId) : null;
  const total = Math.round((seconds + penalty) * 1000) / 1000;
  const canConfirm = name !== "";
  const options = [0, ...penalties];

  function confirm() {
    if (!canConfirm) return;
    onConfirm({
      competitorId: useRoster ? competitorId : null,
      name,
      time: seconds,
      penalty,
      total,
      replaceEntryId: existing?.id ?? null,
    });
  }

  // Les gestionnaires changent à chaque rendu : on passe par une ref pour ne
  // réabonner l'écouteur clavier qu'une seule fois.
  const handlersRef = useRef({});
  handlersRef.current = { confirm, onCancel, options };

  useEffect(() => {
    if (useRoster) validateRef.current?.focus(); // sinon le champ nom a autoFocus
    const onKey = (e) => {
      const { confirm, onCancel, options } = handlersRef.current;
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "Enter") {
        // Un autre bouton focalisé (ex. Annuler) garde son comportement natif.
        if (e.target?.tagName === "BUTTON" && e.target !== validateRef.current) return;
        e.preventDefault();
        confirm();
      } else if (/^\d$/.test(e.key) && !isTyping(e.target)) {
        const idx = Number(e.key);
        if (idx < options.length) {
          e.preventDefault();
          setPenalty(options[idx]);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="run-dialog-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-lg rounded-3xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xl p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="run-dialog-title" className="text-lg font-semibold">Arrivée</h2>
          {eye ? <span className="text-xs opacity-60">Cellule {eye}</span> : null}
        </div>

        <div className="mt-3">
          {useRoster ? (
            <select
              aria-label="Compétiteur"
              className="w-full rounded-xl border px-3 py-2 text-lg font-semibold bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
              value={competitorId}
              onChange={(e) => setCompetitorId(e.target.value)}
            >
              {roster.map((p, i) => (
                <option key={p.id} value={p.id}>{i + 1}. {p.name}</option>
              ))}
            </select>
          ) : (
            <input
              autoFocus
              aria-label="Nom du compétiteur"
              placeholder="Nom du compétiteur"
              value={freeName}
              onChange={(e) => setFreeName(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-lg font-semibold bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 outline-none"
            />
          )}
          {existing && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              Ce compétiteur a déjà un résultat ({formatScore(existing.parsed, "time")}) — il sera remplacé.
            </p>
          )}
        </div>

        <div className="mt-5 text-center">
          <div className="text-xs uppercase tracking-widest opacity-60">Temps chrono</div>
          <div className="font-mono tabular-nums font-black text-6xl leading-tight">
            {formatScore(seconds, "time")}
          </div>
        </div>

        {penalties.length > 0 && (
          <div className="mt-5">
            <div className="text-sm font-medium mb-2">Pénalité</div>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
              {options.map((p, i) => {
                const active = p === penalty;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setPenalty(p);
                      // Entrée doit valider, pas re-cliquer la pénalité.
                      if (useRoster) validateRef.current?.focus();
                    }}
                    aria-pressed={active}
                    className={
                      "rounded-xl border px-3 py-3 font-semibold tabular-nums transition cursor-pointer " +
                      (active
                        ? p === 0
                          ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white"
                          : "bg-red-600 text-white border-red-600"
                        : "border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800")
                    }
                  >
                    {p === 0 ? "Aucune" : `+${p} s`}
                    <span className="block text-[10px] font-normal opacity-60">touche {i}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-baseline justify-between rounded-xl bg-zinc-100 dark:bg-zinc-800 px-4 py-2">
              <span className="text-sm opacity-70">Temps final</span>
              <span className="font-mono tabular-nums font-bold text-2xl">
                {formatScore(total, "time")}
                {penalty > 0 && <span className="ml-2 text-sm text-red-600 dark:text-red-400">(+{penalty})</span>}
              </span>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2.5 text-sm font-medium border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            Annuler le temps (Échap)
          </button>
          <button
            type="button"
            ref={validateRef}
            onClick={confirm}
            disabled={!canConfirm}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Valider (Entrée)
          </button>
        </div>
      </div>
    </div>
  );
}
