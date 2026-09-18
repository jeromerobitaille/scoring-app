import React, { useEffect, useState } from "react";
import { CheckCircleIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import Card from "../../components/ui/Card";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import {
  getCompetition,
  newId,
  rosterFromText,
  rosterToText,
  updateCompetition,
} from "../../state/model";

const INPUT =
  "w-full min-w-0 rounded-xl border px-3 py-2 text-sm outline-none bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700";

function RodeoList({ state, push, selectedId, onSelect }) {
  const [newName, setNewName] = useState("");
  const [toDelete, setToDelete] = useState(null);

  function add(e) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const id = newId();
    push({ ...state, rodeos: [...state.rodeos, { id, name, competitions: {} }] });
    setNewName("");
    onSelect(id);
  }

  function rename(id, name) {
    if (!name.trim()) return;
    push({ ...state, rodeos: state.rodeos.map((r) => (r.id === id ? { ...r, name: name.trim() } : r)) });
  }

  function confirmDelete() {
    const id = toDelete.id;
    setToDelete(null);
    const rodeos = state.rodeos.filter((r) => r.id !== id);
    push({ ...state, rodeos });
    if (selectedId === id) onSelect(rodeos[0]?.id);
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {state.rodeos.map((r) => {
          const isSelected = r.id === selectedId;
          const isActive = r.id === state.currentRodeoId;
          const results = Object.values(r.competitions).reduce((n, c) => n + c.entries.length, 0);
          return (
            <li
              key={r.id}
              className={
                "rounded-xl border px-2 py-2 " +
                (isSelected
                  ? "border-zinc-900 dark:border-white"
                  : "border-zinc-200 dark:border-zinc-800")
              }
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="rodeo-select"
                  checked={isSelected}
                  onChange={() => onSelect(r.id)}
                  aria-label={`Modifier ${r.name}`}
                  className="w-4 h-4 flex-shrink-0"
                />
                <input
                  key={r.name}
                  defaultValue={r.name}
                  onFocus={() => onSelect(r.id)}
                  onBlur={(e) => rename(r.id, e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                  aria-label="Nom du rodéo"
                  className="flex-1 min-w-0 bg-transparent font-medium outline-none rounded px-1 focus:bg-white dark:focus:bg-zinc-900"
                />
                <button
                  type="button"
                  onClick={() => setToDelete({ ...r, results })}
                  disabled={state.rodeos.length <= 1}
                  aria-label={`Supprimer ${r.name}`}
                  className="p-1 rounded-lg text-red-600 dark:text-red-400 disabled:opacity-20 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="pl-6 mt-1 flex items-center justify-between gap-2 text-xs">
                <span className="opacity-60">{results} résultat{results > 1 ? "s" : ""}</span>
                {isActive ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircleIcon className="w-4 h-4" /> En cours
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => push({ ...state, currentRodeoId: r.id })}
                    className="underline opacity-70 hover:opacity-100 cursor-pointer"
                  >
                    Utiliser pour la saisie
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <form onSubmit={add} className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nouveau rodéo (ex. Vendredi soir)"
          aria-label="Nom du nouveau rodéo"
          className={INPUT}
        />
        <button
          type="submit"
          disabled={!newName.trim()}
          aria-label="Ajouter le rodéo"
          className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-2 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
        >
          <PlusIcon className="w-5 h-5" />
        </button>
      </form>

      <ConfirmDialog
        open={!!toDelete}
        title={`Supprimer « ${toDelete?.name} » ?`}
        message={`Les listes de compétiteurs${toDelete?.results ? ` et les ${toDelete.results} résultat(s)` : ""} de ce rodéo seront supprimés. Cette action est irréversible.`}
        confirmLabel="Supprimer"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function RosterEditor({ state, push, rodeoId, disciplineId }) {
  const competition = getCompetition(state, rodeoId, disciplineId);
  const saved = rosterToText(competition.roster);
  const [text, setText] = useState(saved);
  const [dirty, setDirty] = useState(false);

  // Suivre les modifications faites ailleurs (autre poste, ajout rapide) tant
  // qu'on n'est pas en train d'éditer. Le parent remonte ce composant (key)
  // quand on change de compétition.
  useEffect(() => {
    if (!dirty) setText(saved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  const preview = rosterFromText(text, competition.roster);
  const keptIds = new Set(preview.map((p) => p.id));
  const orphaned = competition.entries.filter(
    (e) => e.competitorId && competition.roster.some((p) => p.id === e.competitorId) && !keptIds.has(e.competitorId)
  );

  function save() {
    push(updateCompetition(state, rodeoId, disciplineId, (comp) => ({
      ...comp,
      roster: rosterFromText(text, comp.roster),
    })));
    setDirty(false);
  }

  return (
    <div className="flex flex-col h-full">
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setDirty(true); }}
        onBlur={() => { if (dirty) save(); }}
        rows={16}
        spellCheck={false}
        placeholder={"Un compétiteur par ligne, dans l'ordre de passage :\nNom | Ville | Animal | Entrepreneur\n\nSeul le nom est obligatoire. On peut coller des colonnes depuis Excel."}
        aria-label="Liste des compétiteurs"
        className="flex-1 w-full rounded-xl border px-3 py-2 text-sm font-mono leading-6 outline-none bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 resize-y"
      />
      <p className="mt-1 text-[11px] opacity-60">
        Format : <span className="font-mono">Nom | Ville | Animal | Entrepreneur</span> — la ville et
        l'animal s'affichent sur le tableau et les bandeaux (voir Apparence).
      </p>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs">
        <span className="opacity-70">
          {preview.length} compétiteur{preview.length > 1 ? "s" : ""}
          {competition.entries.length > 0 && ` · ${competition.entries.length} résultat(s)`}
          {dirty ? " · modifications non enregistrées" : ""}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={!dirty}
          className="rounded-xl px-3 py-1.5 font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 disabled:opacity-30 cursor-pointer"
        >
          Enregistrer
        </button>
      </div>
      {orphaned.length > 0 && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          {orphaned.map((e) => e.name).join(", ")} {orphaned.length > 1 ? "ont" : "a"} déjà un résultat :
          le résultat restera dans le classement même si le nom est retiré de la liste.
        </p>
      )}
    </div>
  );
}

export default function RodeosTab({ state, push }) {
  const [rodeoId, setRodeoId] = useState(state.currentRodeoId);
  const [disciplineId, setDisciplineId] = useState(state.currentDisciplineId);

  const rodeo = state.rodeos.find((r) => r.id === rodeoId) ?? state.rodeos[0];
  const discipline = state.disciplines.find((d) => d.id === disciplineId) ?? state.disciplines[0];

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Rodéos &amp; compétiteurs</h2>
        <p className="text-sm opacity-70">
          Préparez à l'avance l'ordre de passage de chaque discipline, pour chaque rodéo.
          Pendant le rodéo, il suffit de sélectionner le compétiteur en cours.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <h3 className="text-sm font-semibold mb-2">Rodéos</h3>
          <RodeoList state={state} push={push} selectedId={rodeo.id} onSelect={setRodeoId} />
        </div>

        <div className="lg:col-span-8 grid md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <h3 className="text-sm font-semibold mb-2">Disciplines — {rodeo.name}</h3>
            <ul className="space-y-1">
              {state.disciplines.map((d) => {
                const comp = rodeo.competitions[d.id];
                const count = comp?.roster.length ?? 0;
                const isSelected = d.id === discipline.id;
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setDisciplineId(d.id)}
                      className={
                        "w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm cursor-pointer " +
                        (isSelected
                          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800")
                      }
                    >
                      <span className="truncate">{d.name}</span>
                      <span className={`tabular-nums text-xs flex-shrink-0 ${count ? "" : "opacity-40"}`}>
                        {count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="md:col-span-3 flex flex-col">
            <h3 className="text-sm font-semibold mb-2 truncate">Ordre de passage — {discipline.name}</h3>
            <RosterEditor
              key={`${rodeo.id}:${discipline.id}`}
              state={state}
              push={push}
              rodeoId={rodeo.id}
              disciplineId={discipline.id}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
