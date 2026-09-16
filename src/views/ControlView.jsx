import React, { useEffect, useRef, useState } from "react";
import useSyncedState from "../state/useSyncedState";
import { detectIsTimeString, formatScore, parseScore, entryDisplayMode } from "../utils/score";
import {
  getActive,
  newId,
  nextPendingId,
  updateActiveCompetition,
} from "../state/model";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Label from "../components/ui/Label";
import TextInput from "../components/ui/TextInput";
import EntriesTable from "../components/EntriesTable";
import ThemeToggle from "../components/ui/ThemeToggle";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import LiveTimerPanel from "../components/LiveTimerPanel";
import RunResultDialog from "../components/RunResultDialog";
import {
  Cog6ToothIcon,
  EllipsisVerticalIcon,
  PlayIcon,
} from "@heroicons/react/24/solid";
import {
  PlusCircleIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ChevronDoubleRightIcon,
} from "@heroicons/react/24/outline";
import logo from "../assets/logo.png";

function toTitleCase(str) {
  return str.replace(/\p{L}[\p{L}\p{M}'-]*/gu, (w) =>
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  );
}

const sameName = (a, b) =>
  a.trim().localeCompare(b.trim(), "fr", { sensitivity: "base" }) === 0;

/**
 * Put the caret back in a field and make the browser actually re-run its focus
 * path. A bare .focus() is a no-op when document.activeElement already *is* the
 * element, which is exactly the state the window ends up in after a native
 * dialog or a native <select> popup has taken the OS key focus away. Blurring
 * first forces the focus to be re-established for real.
 */
function refocus(ref) {
  const el = ref?.current;
  if (!el) return;
  if (document.activeElement === el) el.blur();
  el.focus({ preventScroll: true });
}

const SELECT_CLASS =
  "min-w-0 rounded-xl border px-3 py-2 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700";

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
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", onKey);
    };
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
        <div className="absolute right-0 mt-1 w-60 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden z-30">
          <button
            type="button"
            onClick={() => { setOpen(false); onClearAll(); }}
            className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 cursor-pointer"
          >
            <TrashIcon className="w-4 h-4" />
            Effacer les résultats de la discipline
          </button>
        </div>
      )}
    </div>
  );
}

/** Ordre de passage de la compétition active. */
function RosterPanel({ competition, scoreMode, onSelect, onNext, onQuickAdd, onEditList }) {
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);
  const results = new Map(
    competition.entries.filter((e) => e.competitorId).map((e) => [e.competitorId, e])
  );
  const doneCount = competition.roster.filter((p) => results.has(p.id)).length;

  // Garder le compétiteur en cours visible dans une longue liste.
  useEffect(() => {
    listRef.current
      ?.querySelector("[data-current='true']")
      ?.scrollIntoView({ block: "nearest" });
  }, [competition.currentId]);

  function submitDraft(e) {
    e.preventDefault();
    const name = toTitleCase(draft.trim());
    if (!name) return;
    onQuickAdd(name);
    setDraft("");
  }

  return (
    <Card className="flex flex-col lg:max-h-[calc(100vh-11rem)]">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h2 className="text-lg font-semibold">Ordre de passage</h2>
        <span className="text-xs opacity-60 tabular-nums">
          {doneCount}/{competition.roster.length}
        </span>
      </div>

      {competition.roster.length === 0 ? (
        <div className="text-sm opacity-70 py-4 space-y-2">
          <p>Aucun compétiteur inscrit pour cette discipline.</p>
          <button type="button" onClick={onEditList} className="underline cursor-pointer">
            Préremplir la liste
          </button>
        </div>
      ) : (
        <ol ref={listRef} className="flex-1 min-h-0 overflow-y-auto -mx-2 space-y-0.5">
          {competition.roster.map((p, i) => {
            const isCurrent = p.id === competition.currentId;
            const result = results.get(p.id);
            return (
              <li key={p.id} data-current={isCurrent}>
                <button
                  type="button"
                  onClick={() => onSelect(p.id)}
                  className={
                    "w-full flex items-center gap-2 rounded-xl px-2 py-2 text-left text-sm cursor-pointer transition " +
                    (isCurrent
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800")
                  }
                >
                  <span className="w-6 text-right tabular-nums opacity-60 flex-shrink-0">{i + 1}</span>
                  {isCurrent
                    ? <PlayIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    : <span className="w-3.5 flex-shrink-0" />}
                  <span className={`flex-1 truncate ${result && !isCurrent ? "opacity-50" : "font-medium"}`}>
                    {p.name}
                  </span>
                  <span className="tabular-nums text-xs flex-shrink-0 opacity-80">
                    {result ? (
                      <>
                        {formatScore(result.parsed, entryDisplayMode(result, scoreMode))}
                        {result.penalty > 0 && (
                          <span className="ml-1 text-red-500">+{result.penalty}</span>
                        )}
                      </>
                    ) : "—"}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
        {competition.roster.length > 0 && (
          <button
            type="button"
            onClick={onNext}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <ChevronDoubleRightIcon className="w-4 h-4" />
            Compétiteur suivant
          </button>
        )}
        <form onSubmit={submitDraft} className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ajouter à la liste…"
            aria-label="Ajouter un compétiteur à la liste"
            autoComplete="off"
            className="flex-1 min-w-0 rounded-xl border px-3 py-2 text-sm outline-none border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Ajouter"
            className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-2 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <PlusCircleIcon className="w-5 h-5" />
          </button>
        </form>
        <button
          type="button"
          onClick={onEditList}
          className="text-xs underline opacity-60 hover:opacity-100 cursor-pointer"
        >
          Modifier la liste complète
        </button>
      </div>
    </Card>
  );
}

export default function ControlView() {
  const [state, push, sync] = useSyncedState();
  const [name, setName] = useState("");
  const [score, setScore] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [pendingRun, setPendingRun] = useState(null); // { seconds, eye }
  const nameRef = useRef(null);
  const scoreRef = useRef(null);

  const { rodeo, discipline, competition } = getActive(state);
  const isTimeMode = discipline.scoreMode === "lower";
  const current = competition.roster.find((p) => p.id === competition.currentId) ?? null;
  // « Armé » est partagé (les sorties n'affichent le chrono que s'il est armé),
  // mais la fenêtre d'arrivée ne s'ouvre que sur l'application branchée au
  // chrono : sinon chaque tablette enregistrerait le même temps en double.
  const armed = state.timerArmed;
  const isTimerHost = typeof window !== "undefined" && !!window.fwst?.timer;

  const scoreTrimmed = score.trim();
  const scoreParsed = scoreTrimmed === "" ? null : parseScore(scoreTrimmed);
  const scoreInvalid = scoreTrimmed !== "" && scoreParsed == null;
  const canSubmit = name.trim() !== "" && scoreTrimmed !== "" && !scoreInvalid;

  const typedCompetitor = name.trim()
    ? competition.roster.find((p) => sameName(p.name, name)) ?? null
    : null;
  const typedExisting = !editingId && typedCompetitor
    ? competition.entries.find((e) => e.competitorId === typedCompetitor.id)
    : null;

  useEffect(() => {
    const base = "FWST Scoring";
    document.title = `${base} — ${rodeo.name} · ${discipline.name}`;
  }, [rodeo.name, discipline.name]);

  useEffect(() => {
    document.body.classList.toggle("dark", state.theme !== "light");
  }, [state.theme]);

  useEffect(() => { refocus(nameRef); }, []);

  // Le champ nom suit le compétiteur en cours (sélection ici ou sur un autre poste).
  useEffect(() => {
    if (editingId) return;
    setName(current?.name ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, current?.name]);

  // Changer de rodéo ou de discipline annule une modification en cours.
  useEffect(() => {
    setEditingId(null);
    setScore("");
  }, [rodeo.id, discipline.id]);

  function resetForm() {
    setScore("");
    setEditingId(null);
    setName(current?.name ?? "");
    refocus(current ? scoreRef : nameRef);
  }

  /**
   * Enregistre un résultat pour la compétition active, remplace l'éventuel
   * résultat précédent du même compétiteur, ajoute à la liste un nom qui n'y
   * figure pas encore et passe au compétiteur suivant.
   */
  function recordResult({ name: entryName, competitorId, raw, parsed, timeHint, time, penalty }) {
    let id = competitorId;
    let nextName = "";
    const next = updateActiveCompetition(state, (comp) => {
      let roster = comp.roster;
      if (!id) {
        const match = roster.find((p) => sameName(p.name, entryName));
        if (match) {
          id = match.id;
        } else {
          id = newId();
          roster = [...roster, { id, name: entryName }];
        }
      }
      const entry = {
        id: newId(),
        name: entryName,
        competitorId: id,
        raw,
        parsed,
        timeHint,
        ...(time != null ? { time, penalty } : {}),
      };
      const entries = [entry, ...comp.entries.filter((e) => e.competitorId !== id)];
      const updated = { ...comp, roster, entries };
      const currentId = nextPendingId(updated, id, entries);
      nextName = roster.find((p) => p.id === currentId)?.name ?? "";
      return { ...updated, currentId };
    });
    push(next);
    // Le champ suit le compétiteur suivant, y compris quand il n'y en a plus
    // (l'effet de synchro ne se redéclenche pas si l'id reste null).
    setName(nextName);
  }

  function submitEntry() {
    if (!canSubmit) return;
    const entryName = name.trim();
    if (editingId) {
      push(updateActiveCompetition(state, (comp) => ({
        ...comp,
        entries: comp.entries.map((e) => {
          if (e.id !== editingId) return e;
          const changedValue = e.raw !== score;
          // Une valeur retapée à la main remplace le détail chrono + pénalité.
          const { time, penalty, ...rest } = e;
          return {
            ...(changedValue ? rest : { ...rest, time, penalty }),
            name: entryName,
            raw: score,
            parsed: scoreParsed,
            timeHint: detectIsTimeString(score),
          };
        }),
      })));
      setEditingId(null);
      setScore("");
      setName(current?.name ?? "");
      refocus(nameRef);
      return;
    }
    recordResult({
      name: entryName,
      competitorId: current && sameName(current.name, entryName) ? current.id : null,
      raw: score,
      parsed: scoreParsed,
      timeHint: detectIsTimeString(score),
    });
    setScore("");
    refocus(nameRef);
  }

  function handleNameKey(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (canSubmit) submitEntry();
      else refocus(scoreRef);
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

  function handleTimerStop(frame) {
    if (!isTimerHost || !armed || pendingRun) return;
    setPendingRun({ seconds: frame.seconds, eye: frame.eye });
  }

  function confirmRun({ competitorId, name: runName, time, penalty, total }) {
    recordResult({
      name: runName,
      competitorId,
      raw: formatScore(total, "time"),
      parsed: total,
      timeHint: false,
      time,
      penalty,
    });
    setPendingRun(null);
    requestAnimationFrame(() => refocus(nameRef));
  }

  function cancelRun() {
    setPendingRun(null);
    requestAnimationFrame(() => refocus(nameRef));
  }

  function selectCompetitor(id) {
    push(updateActiveCompetition(state, { currentId: id }));
    setEditingId(null);
    setScore("");
    requestAnimationFrame(() => refocus(scoreRef));
  }

  function selectNext() {
    const id = nextPendingId(competition, competition.currentId);
    if (id) selectCompetitor(id);
  }

  function quickAdd(newName) {
    push(updateActiveCompetition(state, (comp) => {
      const id = newId();
      return {
        ...comp,
        roster: [...comp.roster, { id, name: newName }],
        currentId: comp.currentId ?? id,
      };
    }));
  }

  function clearAll() {
    setConfirmClearOpen(false);
    push(updateActiveCompetition(state, (comp) => ({
      ...comp,
      entries: [],
      currentId: comp.roster[0]?.id ?? null,
    })));
    requestAnimationFrame(resetForm);
  }

  function remove(id) {
    if (id === editingId) resetForm();
    push(updateActiveCompetition(state, (comp) => ({
      ...comp,
      entries: comp.entries.filter((e) => e.id !== id),
    })));
  }

  function startEdit(id) {
    const entry = competition.entries.find((e) => e.id === id);
    if (!entry) return;
    setEditingId(id);
    setName(entry.name);
    setScore(entry.raw ?? "");
    requestAnimationFrame(() => refocus(scoreRef));
  }

  function openSettings(tab) {
    const url = new URL(window.location.href);
    url.searchParams.set("settings", "1");
    if (typeof tab === "string") url.searchParams.set("tab", tab);
    window.location.href = url.toString();
  }

  function onSelectChange(patch) {
    push({ ...state, ...patch });
    setPendingRun(null);
    // A native <select> popup holds the OS key focus while it is open; hand it
    // back to the name field so the operator can type straight away.
    requestAnimationFrame(() => refocus(nameRef));
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-zinc-950 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100">
      <div className="flex-1 mx-auto w-full max-w-7xl px-6 pt-5 pb-4 space-y-4">

        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src={logo} alt="" className="h-12 w-auto flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold leading-tight truncate">
                {discipline.name}
              </h1>
              <p className="text-xs opacity-60 truncate">{rodeo.name} · Saisie des pointages</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle
              theme={state.theme}
              onChange={(t) => push({ ...state, theme: t })}
            />
            <button
              type="button"
              onClick={openSettings}
              aria-label="Paramètres"
              title="Paramètres"
              className="p-2 rounded-xl hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 cursor-pointer"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>
            <KebabMenu onClearAll={() => setConfirmClearOpen(true)} />
          </div>
        </header>

        {/* Barre de contexte : rodéo + discipline (le mode suit la discipline) */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur px-4 py-3">
          <div className="flex items-center gap-3 min-w-0 md:w-72">
            <Label className="flex-shrink-0">Rodéo</Label>
            <select
              className={`flex-1 ${SELECT_CLASS}`}
              value={rodeo.id}
              onChange={(e) => onSelectChange({ currentRodeoId: e.target.value })}
            >
              {state.rodeos.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Label className="flex-shrink-0">Discipline</Label>
            <select
              className={`flex-1 ${SELECT_CLASS}`}
              value={discipline.id}
              onChange={(e) => onSelectChange({ currentDisciplineId: e.target.value })}
            >
              {state.disciplines.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <button
            type="button"
            onClick={() => openSettings("disciplines")}
            title="Configurer les disciplines"
            className={
              "flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold cursor-pointer " +
              (isTimeMode
                ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                : "bg-violet-500/15 text-violet-700 dark:text-violet-300")
            }
          >
            {isTimeMode ? "Temps · plus bas = meilleur" : "Pointage · plus haut = meilleur"}
            {discipline.penalties.length > 0 && ` · pénalités ${discipline.penalties.map((p) => `+${p}`).join("/")}`}
          </button>
        </div>

        <div className="grid lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-4 lg:sticky lg:top-4">
            <RosterPanel
              competition={competition}
              scoreMode={discipline.scoreMode}
              onSelect={selectCompetitor}
              onNext={selectNext}
              onQuickAdd={quickAdd}
              onEditList={() => openSettings("rodeos")}
            />
          </div>

          <div className="lg:col-span-8 space-y-4 min-w-0">
            {isTimeMode && (
              <LiveTimerPanel
                onStop={handleTimerStop}
                onOpenSettings={() => openSettings("timer")}
                armed={armed}
                onArmedChange={(v) => push({ ...state, timerArmed: v })}
                isTimerHost={isTimerHost}
                competitorName={current?.name}
              />
            )}

            <Card>
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-lg font-semibold">
                  {editingId ? "Modifier le résultat" : isTimeMode ? "Saisie manuelle" : "Saisir le pointage"}
                </h2>
                {editingId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 inline-flex items-center cursor-pointer"
                  >
                    <XMarkIcon className="w-4 h-4 mr-1" />
                    Annuler (Échap)
                  </button>
                ) : (
                  <span className="text-xs opacity-50 hidden sm:inline">Entrée pour valider</span>
                )}
              </div>
              <div className="grid md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5">
                  <Label htmlFor="name">Compétiteur</Label>
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
                    list="roster-names"
                  />
                  <datalist id="roster-names">
                    {competition.roster.map((p) => <option key={p.id} value={p.name} />)}
                  </datalist>
                </div>
                <div className="md:col-span-4">
                  <Label htmlFor="score">{isTimeMode ? "Temps" : "Pointage"}</Label>
                  <TextInput
                    id="score"
                    name="score"
                    ref={scoreRef}
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    onKeyDown={handleScoreKey}
                    placeholder={isTimeMode ? "Ex.: 17.243 ou 00:17.243" : "Ex.: 86.5"}
                    autoComplete="off"
                    inputMode="decimal"
                    enterKeyHint="done"
                    aria-invalid={scoreInvalid || undefined}
                    className={scoreInvalid ? "border-red-500 ring-1 ring-red-500/40 focus:ring-red-500" : ""}
                  />
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
                </div>
              </div>
              {scoreInvalid && (
                <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                  Format invalide. Utilisez un nombre (87.5) ou mm:ss.mmm (00:17.243).
                </div>
              )}
              {typedExisting && (
                <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  {typedCompetitor.name} a déjà un résultat
                  ({formatScore(typedExisting.parsed, entryDisplayMode(typedExisting, discipline.scoreMode))})
                  — il sera remplacé.
                </div>
              )}
              {name.trim() && !typedCompetitor && !editingId && competition.roster.length > 0 && (
                <div className="mt-2 text-xs opacity-60">
                  « {name.trim()} » n'est pas dans la liste — il y sera ajouté.
                </div>
              )}
            </Card>

            <Card>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-lg font-semibold">Résultats</h2>
                <span className="text-xs opacity-60 tabular-nums">
                  {competition.entries.length} résultat{competition.entries.length > 1 ? "s" : ""}
                </span>
              </div>
              <EntriesTable
                key={`${rodeo.id}:${discipline.id}`}
                entries={competition.entries}
                scoreMode={discipline.scoreMode}
                onRemove={remove}
                onEdit={startEdit}
                editingId={editingId}
              />
            </Card>
          </div>
        </div>
      </div>

      <footer className="mt-2 border-t border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-2 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <NetStatusDot status={sync?.netStatus || "local"} />
            <span className="opacity-70">
              Room: <span className="font-mono">{sync?.roomId || "default"}</span>
            </span>
          </div>
          <div className="truncate opacity-70">
            {rodeo.name} · {discipline.name}
          </div>
        </div>
      </footer>

      {pendingRun && (
        <RunResultDialog
          seconds={pendingRun.seconds}
          eye={pendingRun.eye}
          penalties={discipline.penalties}
          roster={competition.roster}
          defaultCompetitorId={competition.currentId}
          entries={competition.entries}
          onConfirm={confirmRun}
          onCancel={cancelRun}
        />
      )}

      <ConfirmDialog
        open={confirmClearOpen}
        title="Effacer les résultats ?"
        message={`Les ${competition.entries.length} résultat${competition.entries.length > 1 ? "s" : ""} de « ${discipline.name} » (${rodeo.name}) seront supprimés. La liste des compétiteurs est conservée. Cette action est irréversible.`}
        confirmLabel="Effacer tout"
        cancelLabel="Annuler"
        onConfirm={clearAll}
        onCancel={() => {
          setConfirmClearOpen(false);
          requestAnimationFrame(() => refocus(nameRef));
        }}
      />
    </div>
  );
}
