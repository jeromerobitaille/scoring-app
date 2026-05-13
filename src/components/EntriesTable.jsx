import React, { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { computeRanking, formatScore, entryDisplayMode } from "../utils/score";

const MEDAL = {
  1: { bg: "linear-gradient(135deg,#FFD700,#FFE68A)", fg: "#1a1300" },
  2: { bg: "linear-gradient(135deg,#D9D9D9,#FFFFFF)", fg: "#111111" },
  3: { bg: "linear-gradient(135deg,#CD7F32,#E6A260)", fg: "#1a0e00" },
};

function RankBadge({ rank }) {
  const m = MEDAL[rank];
  if (m) {
    return (
      <span
        className="inline-grid place-items-center w-9 h-9 rounded-full text-base font-black tabular-nums shadow-sm"
        style={{ background: m.bg, color: m.fg }}
        title={`Rang ${rank}`}
      >
        {rank}
      </span>
    );
  }
  return (
    <span className="inline-grid place-items-center w-9 h-9 rounded-full text-base font-bold tabular-nums bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200">
      {rank}
    </span>
  );
}

export default function EntriesTable({ entries, scoreMode, onRemove, onEdit, editingId }) {
  const ranked = useMemo(() => computeRanking(entries, scoreMode), [entries, scoreMode]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
          <tr>
            <th className="py-2 pr-3 w-14">Rang</th>
            <th className="py-2 pr-3">Compétiteur</th>
            <th className="py-2 pr-3 w-32">Score/Temps</th>
            <th className="py-2 pr-3 w-24 text-zinc-400">Brut</th>
            <th className="py-2 pr-2 w-28 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {ranked.map((e) => {
              const isEditing = e.id === editingId;
              return (
                <motion.tr
                  key={e.id}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.22 }}
                  className={
                    "border-b border-zinc-100 dark:border-zinc-800 " +
                    (isEditing
                      ? "bg-amber-50 dark:bg-amber-950/40 outline outline-2 outline-amber-300/60"
                      : "")
                  }
                >
                  <td className="py-2 pr-3"><RankBadge rank={e.rank} /></td>
                  <td className="py-2 pr-3 font-medium">{e.name}</td>
                  <td className="py-2 pr-3 tabular-nums font-semibold">
                    {formatScore(e.parsed, entryDisplayMode(e, scoreMode))}
                  </td>
                  <td className="py-2 pr-3 text-zinc-500 truncate">{e.raw || ""}</td>
                  <td className="py-2 pr-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(e.id)}
                          title="Modifier"
                          aria-label="Modifier"
                          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-blue-600 dark:text-blue-400 cursor-pointer"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemove(e.id)}
                        title="Supprimer"
                        aria-label="Supprimer"
                        className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-red-600 dark:text-red-400 cursor-pointer"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </AnimatePresence>
          {ranked.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center opacity-60">
                Aucune entrée pour le moment. Tapez le nom du compétiteur ci-dessus et son score, puis pressez Entrée.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
