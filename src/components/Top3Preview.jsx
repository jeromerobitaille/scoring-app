import React from "react";
import { formatScore, entryDisplayMode } from "../utils/score";

export default function Top3Preview({ entries, scoreMode, eventName }) {
  return (
    <div className="space-y-2">
      <div className="text-sm opacity-70">{eventName}</div>
      {entries.map((e) => (
        <div key={e.id} className="flex items-center gap-3 p-3 rounded-2xl border bg-white/60 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
          <div className="text-2xl font-black tabular-nums w-8 text-center">{e.rank}</div>
          <div className="flex-1 font-medium">{e.name}</div>
          <div className="text-xl font-semibold tabular-nums">
            {formatScore(e.parsed, entryDisplayMode(e, scoreMode))}
          </div>
        </div>
      ))}
      {entries.length === 0 && <div className="text-sm opacity-70">Ajoutez des entrées pour voir le Top 3.</div>}
    </div>
  );
}
