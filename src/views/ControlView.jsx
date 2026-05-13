import React, { useEffect, useMemo, useRef, useState } from "react";
import useSyncedState from "../state/useSyncedState";
import { detectIsTimeString, parseScore } from "../utils/score";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Label from "../components/ui/Label";
import TextInput from "../components/ui/TextInput";
import EntriesTable from "../components/EntriesTable";
import {
  Cog6ToothIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/solid";
import {
  PlusCircleIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import logo from "../assets/logo.png";

const DISCIPLINES = [
  "Monte de chevaux sans selle",
  "Course de sauvetage",
  "Prise du veau au lasso",
  "Monte de chevaux avec selle",
  "Course de barils | Femmes",
  "Échange de cavaliers",
  "Terrassement du bouvillon",
  "Monte de taureaux",
];

function toTitleCase(str) {
  return str.replace(/\p{L}[\p{L}\p{M}'-]*/gu, (w) =>
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  );
}

function NetStatusDot({ status }) {
  const color =
    status === "open"
      ? "bg-emerald-500"
      : status === "connecting"
      ? "bg-amber-400 animate-pulse"
      : status === "local"
      ? "bg-zinc-400"
      : "bg-red-500";
  const label =
    status === "open"
      ? "Synchro active"
      : status === "connecting"
      ? "Connexion…"
      : status === "local"
      ? "Mode local"
      : "Synchro hors ligne";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
      <span>{label}</span>
    </span>
  );
}

function KebabMenu({ onClearAll }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", (e) => e.key === "Escape" && setOpen(false));
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Plus d'actions"
        className="p-2 rounded-xl hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 cursor-pointer"
      >
        <EllipsisVerticalIcon className="w-5 h-5" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-52 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden z-30">
          <button
            type="button"
            onClick={() => { setOpen(false); onClearAll(); }}
            className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 cursor-pointer"
          >
            <TrashIcon className="w-4 h-4" />
            Effacer toutes les entrées
          </button>
        </div>
      )}
    </div>
  );
}

export default function ControlView() {
  const [state, push, sync] = useSyncedState();
  const [name, setName] = useState("");
  const [score, setScore] = useState("");
  const [editingId, setEditingId] = useState(null);
  const nameRef = useRef(null);
  const scoreRef = useRef(null);

  const scoreTrimmed = score.trim();
  const scoreParsed = scoreTrimmed === "" ? null : parseScore(scoreTrimmed);
  const scoreInvalid = scoreTrimmed !== "" && scoreParsed == null;
  const canSubmit = name.trim() !== "" && scoreTrimmed !== "" && !scoreInvalid;

  // #14: dynamic window title
  useEffect(() => {
    const base = "FWST Scoring";
    document.title = state.eventName ? `${base} — ${state.eventName}` : base;
  }, [state.eventName]);

  // Autofocus name on mount
  useEffect(() => { nameRef.current?.focus(); }, []);

  function resetForm() {
    setName("");
    setScore("");
    setEditingId(null);
    nameRef.current?.focus();
  }

  function submitEntry() {
    if (!canSubmit) return;
    if (editingId) {
      const next = {
        ...state,
        entries: state.entries.map((e) =>
          e.id === editingId
            ? {
                ...e,
                name: name.trim() || "(sans nom)",
                raw: score,
                parsed: scoreParsed,
                timeHint: detectIsTimeString(score),
              }
            : e
        ),
      };
      push(next);
    } else {
      const entry = {
        id: crypto.randomUUID(),
        name: name.trim() || "(sans nom)",
        raw: score,
        parsed: scoreParsed,
        timeHint: detectIsTimeString(score),
      };
      push({ ...state, entries: [entry, ...state.entries] });
    }
    resetForm();
  }

  function handleNameKey(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (canSubmit) submitEntry();
      else scoreRef.current?.focus();
    }
  }
  function handleScoreKey(e) {
    if (e.key === "Enter" && canSubmit) {
      e.preventDefault();
      submitEntry();
    } else if (e.key === "Escape" && editingId) {
      e.preventDefault();
      resetForm();
    }
  }

  function clearAll() {
    if (!confirm("Effacer toutes les entrées de cette discipline ?")) return;
    push({ ...state, entries: [] });
    resetForm();
  }

  function remove(id) {
    if (id === editingId) resetForm();
    push({ ...state, entries: state.entries.filter((e) => e.id !== id) });
  }

  function startEdit(id) {
    const entry = state.entries.find((e) => e.id === id);
    if (!entry) return;
    setEditingId(id);
    setName(entry.name === "(sans nom)" ? "" : entry.name);
    setScore(entry.raw ?? "");
    setTimeout(() => scoreRef.current?.focus(), 0);
  }

  function openSettings() {
    const url = new URL(window.location.href);
    url.searchParams.set("settings", "1");
    window.location.href = url.toString();
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-zinc-950 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100">
      <div className="flex-1 mx-auto w-full max-w-6xl px-6 pt-5 pb-4 space-y-4">

        {/* Header compact */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src={logo} alt="" className="h-12 w-auto flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold leading-tight truncate">
                {state.eventName || "FWST Scoring"}
              </h1>
              <p className="text-xs opacity-60">Saisie des pointages</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={openSettings}>
              <Cog6ToothIcon className="w-5 h-5 inline-block mr-1 -mt-0.5" />
              Paramètres
            </Button>
            <KebabMenu onClearAll={clearAll} />
          </div>
        </header>

        {/* Barre de contexte : discipline + mode */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur px-4 py-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Label className="flex-shrink-0">Discipline</Label>
            <select
              className="flex-1 min-w-0 rounded-xl border px-3 py-2 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
              value={state.eventName || ""}
              onChange={(e) => push({ ...state, eventName: e.target.value })}
            >
              <option value="" disabled>— Choisir une discipline —</option>
              {DISCIPLINES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <Label className="flex-shrink-0">Classement</Label>
            <select
              className="rounded-xl border px-3 py-2 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
              value={state.scoreMode}
              onChange={(e) => push({ ...state, scoreMode: e.target.value })}
            >
              <option value="higher">Score (plus haut = meilleur)</option>
              <option value="lower">Temps (plus bas = meilleur)</option>
            </select>
          </div>
        </div>

        {/* Formulaire principal */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              {editingId ? "Modifier l'entrée" : "Ajouter une entrée"}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 inline-flex items-center cursor-pointer"
              >
                <XMarkIcon className="w-4 h-4 mr-1" />
                Annuler (Échap)
              </button>
            )}
          </div>
          <div className="grid md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-5">
              <Label htmlFor="name">Nom du compétiteur</Label>
              <TextInput
                id="name"
                name="name"
                ref={nameRef}
                value={name}
                onChange={(e) => setName(toTitleCase(e.target.value))}
                onKeyDown={handleNameKey}
                placeholder="Ex.: Marie Tremblay"
                autoComplete="off"
                enterKeyHint="next"
              />
            </div>
            <div className="md:col-span-4">
              <Label htmlFor="score">
                {state.scoreMode === "lower" ? "Temps" : "Score"}
              </Label>
              <TextInput
                id="score"
                name="score"
                ref={scoreRef}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                onKeyDown={handleScoreKey}
                placeholder={state.scoreMode === "lower" ? "Ex.: 17.243 ou 00:17.243" : "Ex.: 86.5"}
                autoComplete="off"
                inputMode="decimal"
                enterKeyHint="done"
                aria-invalid={scoreInvalid || undefined}
                className={scoreInvalid ? "border-red-500 ring-1 ring-red-500/40 focus:ring-red-500" : ""}
              />
              {scoreInvalid && (
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                  Format invalide. Utilisez un nombre (87.5) ou mm:ss.mmm (00:17.243).
                </div>
              )}
            </div>
            <div className="md:col-span-3">
              <Button onClick={submitEntry} disabled={!canSubmit} className="w-full">
                {editingId ? (
                  <>
                    <CheckIcon className="w-5 h-5 inline-block mr-1 -mt-0.5" />
                    Enregistrer
                  </>
                ) : (
                  <>
                    <PlusCircleIcon className="w-5 h-5 inline-block mr-1 -mt-0.5" />
                    Ajouter
                  </>
                )}
              </Button>
              <p className="mt-1 text-[11px] opacity-60 text-center">
                Entrée pour valider · Échap pour annuler
              </p>
            </div>
          </div>
        </Card>

        {/* Table pleine largeur */}
        <Card>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-semibold">Résultats</h2>
            <span className="text-xs opacity-60 tabular-nums">
              {state.entries.length} entrée{state.entries.length > 1 ? "s" : ""}
            </span>
          </div>
          <EntriesTable
            entries={state.entries}
            scoreMode={state.scoreMode}
            onRemove={remove}
            onEdit={startEdit}
            editingId={editingId}
          />
        </Card>
      </div>

      {/* Barre de statut */}
      <footer className="mt-2 border-t border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-2 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <NetStatusDot status={sync?.netStatus || "local"} />
            <span className="opacity-70">
              Room: <span className="font-mono">{sync?.roomId || "default"}</span>
            </span>
          </div>
          <div className="truncate opacity-70">
            {state.eventName || "Aucune discipline sélectionnée"}
          </div>
        </div>
      </footer>
    </div>
  );
}
