import React, { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, TrashIcon, ClipboardDocumentListIcon, TableCellsIcon } from "@heroicons/react/24/outline";
import { getCompetition, newId, rosterFromText, rosterToText, updateCompetition } from "../../state/model";

const COLUMNS = [
  { key: "name", label: "Nom", placeholder: "Nom du compétiteur", className: "min-w-[140px]" },
  { key: "hometown", label: "Ville", placeholder: "Ville, prov.", className: "min-w-[100px]" },
  { key: "animal", label: "Animal", placeholder: "Animal tiré", className: "min-w-[100px]" },
  { key: "contractor", label: "Entrepreneur", placeholder: "Entrepreneur de bétail", className: "min-w-[100px]" },
];

const CELL =
  "w-full min-w-0 bg-transparent px-2 py-1.5 text-sm outline-none rounded-md focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600";

const emptyRow = () => ({ id: newId(), name: "", hometown: "", animal: "", contractor: "" });
const fromRoster = (roster) => roster.map((p) => ({ ...p }));
const toRoster = (rows) =>
  rows
    .map((r) => ({ id: r.id, name: r.name.trim(), hometown: r.hometown.trim(), animal: r.animal.trim(), contractor: r.contractor.trim() }))
    .filter((r) => r.name);

/**
 * Ordre de passage d'une compétition, en tableau : une ligne par compétiteur
 * (nom, ville, animal, entrepreneur), réordonnable. Coller plusieurs lignes
 * (Excel, « Nom | Ville | … ») dans une cellule ajoute autant de lignes.
 * Un mode texte reste disponible pour l'édition en bloc.
 */
export default function RosterTable({ state, push, rodeoId, disciplineId }) {
  const competition = getCompetition(state, rodeoId, disciplineId);
  const savedKey = JSON.stringify(competition.roster);
  const [rows, setRows] = useState(() => fromRoster(competition.roster));
  const [dirty, setDirty] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [text, setText] = useState(() => rosterToText(competition.roster));
  const focusRef = useRef(null); // id de la ligne à focaliser après ajout

  // Suivre les modifications faites ailleurs tant qu'on n'édite pas.
  useEffect(() => {
    if (!dirty) {
      setRows(fromRoster(competition.roster));
      setText(rosterToText(competition.roster));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  useEffect(() => {
    if (!focusRef.current) return;
    const el = document.querySelector(`[data-row="${focusRef.current}"] input`);
    el?.focus();
    focusRef.current = null;
  }, [rows]);

  const roster = textMode ? rosterFromText(text, competition.roster) : toRoster(rows);
  const keptIds = new Set(roster.map((p) => p.id));
  const orphaned = competition.entries.filter(
    (e) => e.competitorId && competition.roster.some((p) => p.id === e.competitorId) && !keptIds.has(e.competitorId)
  );

  function save(next = roster) {
    push(updateCompetition(state, rodeoId, disciplineId, (comp) => ({ ...comp, roster: next })));
    setDirty(false);
  }

  const update = (next) => { setRows(next); setDirty(true); };
  const setCell = (id, key, value) => update(rows.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  const addRow = (afterIndex = rows.length - 1) => {
    const row = emptyRow();
    const next = [...rows];
    next.splice(afterIndex + 1, 0, row);
    update(next);
    focusRef.current = row.id;
  };
  const removeRow = (id) => update(rows.filter((r) => r.id !== id));
  const move = (id, dir) => {
    const i = rows.findIndex((r) => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };

  /** Collage de plusieurs lignes (Excel, texte « | ») : une ligne de tableau par ligne collée. */
  function onPaste(e, rowIndex, key) {
    const pasted = e.clipboardData.getData("text");
    if (!/\r?\n|\t|\|/.test(pasted.trim())) return; // simple valeur : collage normal
    e.preventDefault();
    const parsed = rosterFromText(pasted, []).map((p) => ({ ...p, id: newId() }));
    if (parsed.length === 0) return;
    const next = [...rows];
    const target = next[rowIndex];
    if (key === "name" && target && !target.name.trim()) {
      // Ligne vide : remplacée par les lignes collées.
      next.splice(rowIndex, 1, ...parsed);
    } else if (parsed.length === 1 && !/\r?\n/.test(pasted.trim())) {
      // Une seule ligne avec colonnes : remplit la ligne courante.
      next[rowIndex] = { ...target, ...parsed[0], id: target.id };
    } else {
      next.splice(rowIndex + 1, 0, ...parsed);
    }
    update(next);
  }

  function onKeyDown(e, rowIndex, colIndex) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (rowIndex === rows.length - 1) addRow(rowIndex);
      else document.querySelector(`[data-row="${rows[rowIndex + 1].id}"] input[data-col="${colIndex}"]`)?.focus();
    } else if (e.key === "ArrowDown" && rowIndex < rows.length - 1) {
      e.preventDefault();
      document.querySelector(`[data-row="${rows[rowIndex + 1].id}"] input[data-col="${colIndex}"]`)?.focus();
    } else if (e.key === "ArrowUp" && rowIndex > 0) {
      e.preventDefault();
      document.querySelector(`[data-row="${rows[rowIndex - 1].id}"] input[data-col="${colIndex}"]`)?.focus();
    }
  }

  function switchMode() {
    if (textMode) {
      const parsed = rosterFromText(text, competition.roster);
      setRows(fromRoster(parsed));
    } else {
      setText(rosterToText(toRoster(rows)));
    }
    setTextMode(!textMode);
  }

  const footer = (
    <>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs">
        <span className="opacity-70">
          {roster.length} compétiteur{roster.length > 1 ? "s" : ""}
          {competition.entries.length > 0 && ` · ${competition.entries.length} résultat(s)`}
          {dirty ? " · modifications non enregistrées" : ""}
        </span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={switchMode} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer" title={textMode ? "Revenir au tableau" : "Coller ou éditer la liste en texte (Nom | Ville | Animal | Entrepreneur)"}>
            {textMode ? <TableCellsIcon className="w-3.5 h-3.5" /> : <ClipboardDocumentListIcon className="w-3.5 h-3.5" />}
            {textMode ? "Tableau" : "Mode texte"}
          </button>
          <button
            type="button"
            onClick={() => save()}
            disabled={!dirty}
            className="rounded-lg px-3 py-1 font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 disabled:opacity-30 cursor-pointer"
          >
            Enregistrer
          </button>
        </div>
      </div>
      {orphaned.length > 0 && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          {orphaned.map((e) => e.name).join(", ")} {orphaned.length > 1 ? "ont" : "a"} déjà un résultat :
          le résultat restera dans le classement même si le nom est retiré de la liste.
        </p>
      )}
    </>
  );

  if (textMode) {
    return (
      <div className="flex flex-col h-full">
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setDirty(true); }}
          onBlur={() => { if (dirty) save(rosterFromText(text, competition.roster)); }}
          rows={16}
          spellCheck={false}
          placeholder={"Un compétiteur par ligne, dans l'ordre de passage :\nNom | Ville | Animal | Entrepreneur\n\nSeul le nom est obligatoire. On peut coller des colonnes depuis Excel."}
          aria-label="Liste des compétiteurs"
          className="flex-1 w-full rounded-xl border px-3 py-2 text-sm font-mono leading-6 outline-none bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 resize-y"
        />
        <p className="mt-1 text-[11px] opacity-60">
          Format : <span className="font-mono">Nom | Ville | Animal | Entrepreneur</span> (ou colonnes séparées par des tabulations).
        </p>
        {footer}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" onBlur={(e) => { if (dirty && !e.currentTarget.contains(e.relatedTarget)) save(); }}>
      <div className="rounded-xl border border-zinc-300 dark:border-zinc-700 overflow-x-auto bg-white/60 dark:bg-zinc-900/60">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide opacity-60 border-b border-zinc-200 dark:border-zinc-800">
              <th className="w-8 px-2 py-1.5 text-right font-medium">#</th>
              {COLUMNS.map((c) => (
                <th key={c.key} className={`px-2 py-1.5 text-left font-medium ${c.className}`}>{c.label}</th>
              ))}
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} data-row={r.id} className="border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40">
                <td className="px-2 py-0.5 text-right tabular-nums text-xs opacity-60">{i + 1}</td>
                {COLUMNS.map((c, ci) => (
                  <td key={c.key} className="px-0.5 py-0.5">
                    <input
                      data-col={ci}
                      value={r[c.key]}
                      placeholder={i === rows.length - 1 && !r.name ? c.placeholder : ""}
                      onChange={(e) => setCell(r.id, c.key, e.target.value)}
                      onPaste={(e) => onPaste(e, i, c.key)}
                      onKeyDown={(e) => onKeyDown(e, i, ci)}
                      className={CELL}
                      aria-label={`${c.label}, ligne ${i + 1}`}
                    />
                  </td>
                ))}
                <td className="px-1 py-0.5 whitespace-nowrap">
                  <button type="button" onClick={() => move(r.id, -1)} disabled={i === 0} className="p-0.5 rounded opacity-50 hover:opacity-100 disabled:opacity-15 cursor-pointer" title="Monter" aria-label="Monter"><ChevronUpIcon className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => move(r.id, 1)} disabled={i === rows.length - 1} className="p-0.5 rounded opacity-50 hover:opacity-100 disabled:opacity-15 cursor-pointer" title="Descendre" aria-label="Descendre"><ChevronDownIcon className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => removeRow(r.id)} className="p-0.5 rounded text-red-600 dark:text-red-400 opacity-60 hover:opacity-100 cursor-pointer" title="Retirer" aria-label="Retirer"><TrashIcon className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 2} className="px-3 py-4 text-xs opacity-60 italic text-center">
                  Aucun compétiteur. Ajoutez une ligne, ou collez une liste (une ligne par compétiteur) dans la première cellule.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => addRow()}
        className="mt-2 self-start inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
      >
        <PlusIcon className="w-3.5 h-3.5" /> Ajouter un compétiteur
      </button>
      <p className="mt-1 text-[11px] opacity-60">
        Entrée : ligne suivante (ou nouvelle ligne). Coller plusieurs lignes depuis Excel remplit le tableau.
      </p>
      {footer}
    </div>
  );
}
