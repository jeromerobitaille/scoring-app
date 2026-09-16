import React, { useEffect, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import Card from "../../components/ui/Card";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { newId, parsePenalties, parseTarget, BARREL_PENALTIES, RIDE_TARGET } from "../../state/model";

const INPUT =
  "w-full min-w-0 rounded-xl border px-3 py-2 text-sm outline-none bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700";

/** Champ texte qui ne pousse sa valeur qu'à la sortie (ou Entrée). */
function CommitInput({ value, onCommit, ...props }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => { if (draft !== value) onCommit(draft); };
  return (
    <input
      {...props}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
        if (e.key === "Escape") { setDraft(value); }
      }}
    />
  );
}

function countResults(state, disciplineId) {
  return state.rodeos.reduce(
    (n, r) => n + (r.competitions[disciplineId]?.entries.length ?? 0),
    0
  );
}

export default function DisciplinesTab({ state, push }) {
  const [toDelete, setToDelete] = useState(null);
  const list = state.disciplines;

  const update = (id, patch) =>
    push({ ...state, disciplines: list.map((d) => (d.id === id ? { ...d, ...patch } : d)) });

  function move(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    push({ ...state, disciplines: next });
  }

  function add() {
    push({
      ...state,
      disciplines: [...list, { id: newId(), name: "Nouvelle discipline", scoreMode: "lower", penalties: [] }],
    });
  }

  function confirmDelete() {
    const id = toDelete.id;
    setToDelete(null);
    push({
      ...state,
      disciplines: list.filter((d) => d.id !== id),
      // normalizeState retire aussi les compétitions orphelines
    });
  }

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Disciplines</h2>
        <p className="text-sm opacity-70">
          Chaque discipline a son mode de pointage : l'écran de saisie s'adapte
          automatiquement quand on change de discipline. Les pénalités proposées à
          l'arrivée (ex. barils renversés) se règlent ici — laisser vide si aucune.
          « Armé par défaut » arme le chrono en passant à cette discipline ; un chrono
          désarmé n'apparaît pas sur le tableau, les bandeaux ni le canevas. En mode
          pointage, le chrono sert à suivre la monte en direct (pas de fenêtre
          d'arrivée) ; le « temps cible » (ex. 8 s) le fait changer de couleur une
          fois atteint.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] text-sm">
          <thead className="text-left text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="py-2 pr-2 w-16">Ordre</th>
              <th className="py-2 pr-2">Nom</th>
              <th className="py-2 pr-2 w-60">Mode</th>
              <th className="py-2 pr-2 w-44">Pénalités (s)</th>
              <th className="py-2 pr-2 w-28" title="Le chrono change de couleur quand ce temps est atteint">Temps cible (s)</th>
              <th className="py-2 pr-2 w-24 text-center" title="Chrono armé en passant à cette discipline">Armé par défaut</th>
              <th className="py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {list.map((d, i) => (
              <tr key={d.id} className="border-b border-zinc-100 dark:border-zinc-800 align-middle">
                <td className="py-2 pr-2">
                  <div className="flex">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label="Monter"
                      className="p-1 rounded-lg disabled:opacity-20 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <ArrowUpIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === list.length - 1}
                      aria-label="Descendre"
                      className="p-1 rounded-lg disabled:opacity-20 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <ArrowDownIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
                <td className="py-2 pr-2">
                  <CommitInput
                    aria-label="Nom de la discipline"
                    className={INPUT}
                    value={d.name}
                    onCommit={(name) => update(d.id, { name: name.trim() || d.name })}
                  />
                </td>
                <td className="py-2 pr-2">
                  <select
                    aria-label="Mode de pointage"
                    className={INPUT}
                    value={d.scoreMode}
                    onChange={(e) => update(d.id, { scoreMode: e.target.value })}
                  >
                    <option value="lower">Temps — plus bas gagne</option>
                    <option value="higher">Pointage — plus haut gagne</option>
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <CommitInput
                    aria-label="Pénalités en secondes"
                    className={INPUT}
                    placeholder={`Aucune — ex. ${BARREL_PENALTIES.join(", ")}`}
                    value={d.penalties.join(", ")}
                    onCommit={(text) => update(d.id, { penalties: parsePenalties(text) })}
                  />
                </td>
                <td className="py-2 pr-2">
                  <CommitInput
                    aria-label={`Temps cible pour ${d.name}`}
                    className={INPUT}
                    inputMode="decimal"
                    placeholder={d.scoreMode === "higher" ? `ex. ${RIDE_TARGET}` : "Aucun"}
                    value={d.timerTarget == null ? "" : String(d.timerTarget)}
                    onCommit={(text) => update(d.id, { timerTarget: parseTarget(text) })}
                  />
                </td>
                <td className="py-2 pr-2 text-center">
                  <input
                    type="checkbox"
                    aria-label={`Chrono armé par défaut pour ${d.name}`}
                    checked={d.armedByDefault}
                    onChange={(e) => update(d.id, { armedByDefault: e.target.checked })}
                    className="w-4 h-4"
                  />
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => setToDelete({ ...d, results: countResults(state, d.id) })}
                    disabled={list.length <= 1}
                    aria-label={`Supprimer ${d.name}`}
                    className="p-1.5 rounded-lg text-red-600 dark:text-red-400 disabled:opacity-20 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={add}
        className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
      >
        <PlusIcon className="w-4 h-4" />
        Ajouter une discipline
      </button>

      <ConfirmDialog
        open={!!toDelete}
        title={`Supprimer « ${toDelete?.name} » ?`}
        message={
          toDelete?.results
            ? `Les listes de compétiteurs et les ${toDelete.results} résultat(s) de cette discipline, dans tous les rodéos, seront supprimés. Cette action est irréversible.`
            : "Les listes de compétiteurs de cette discipline, dans tous les rodéos, seront supprimées."
        }
        confirmLabel="Supprimer"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </Card>
  );
}
