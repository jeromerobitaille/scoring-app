import React, { useMemo } from "react";
import { computeRanking, formatScore, entryDisplayMode } from "../utils/score";

export default function EntriesTable({ entries, scoreMode, onRemove, onEdit }) {
  const ranked = useMemo(() => computeRanking(entries, scoreMode), [entries, scoreMode]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
          <tr>
            <th className="py-2 pr-2">#</th>
            <th className="py-2 pr-2">Compétiteur</th>
            <th className="py-2 pr-2">Score/Temps</th>
            <th className="py-2 pr-2">Brut</th>
            <th className="py-2 pr-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((e) => (
            <tr key={e.id} className="border-b border-zinc-100 dark:border-zinc-800">
              <td className="py-2 pr-2 w-10 tabular-nums">{e.rank}</td>
              <td className="py-2 pr-2">{e.name}</td>
              <td className="py-2 pr-2 tabular-nums">
                {formatScore(e.parsed, entryDisplayMode(e, scoreMode))}
              </td>
              <td className="py-2 pr-2 text-zinc-500">{e.raw || ""}</td>
              <td className="py-2 pr-2 text-right space-x-3">
                {onEdit && (
                  <button className="text-blue-600 hover:underline" onClick={() => onEdit(e.id)}>
                    Modifier
                  </button>
                )}
                <button className="text-red-600 hover:underline" onClick={() => onRemove(e.id)}>
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
          {ranked.length === 0 && (
            <tr><td colSpan={5} className="py-6 text-center opacity-70">Aucune entrée pour le moment.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
