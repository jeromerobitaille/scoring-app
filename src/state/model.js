/**
 * Modèle rodéo → compétitions (une par discipline) → ordre de passage + résultats.
 *
 * Source de vérité :
 *   disciplines        [{ id, name, scoreMode: "lower"|"higher", penalties: [5, 10, 15],
 *                         armedByDefault, timerTarget: 8 | null }]
 *                      timerTarget : temps à atteindre (ex. 8 s en monte) — le
 *                      chrono change de couleur quand il est atteint.
 *   rodeos             [{ id, name, competitions: { [disciplineId]: Competition } }]
 *   currentRodeoId, currentDisciplineId
 *   pendingRun         { seconds, eye, session, runId } | null — arrivée en
 *                      attente de validation sur le poste du chrono. Les sorties
 *                      gardent ce temps affiché jusqu'à validation / annulation.
 *   timerArmed         chrono armé (partagé : les sorties n'affichent le chrono
 *                      que s'il est armé). Reprend armedByDefault à chaque
 *                      changement de discipline (timerArmedFor mémorise laquelle).
 *
 *   Competition        { roster: [{ id, name }], entries: [Entry], currentId }
 *   Entry              { id, name, competitorId?, raw, parsed, timeHint,
 *                        time?, penalty? }   // time + penalty = parsed (chrono)
 *
 * Miroir de la compétition active, recalculé par normalizeState() à chaque
 * écriture. Les sorties (tableau, bandeaux, canevas) ne lisent que ces champs :
 *   eventName, scoreMode, entries, currentCompetitor (+ timerArmed, timerTarget)
 */

const newId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

export { newId };

export const BARREL_PENALTIES = [5, 10, 15];

// Réglages par défaut à vérifier dans Paramètres → Disciplines.
export const DEFAULT_DISCIPLINES = [
  { name: "Monte de chevaux sans selle", scoreMode: "higher", penalties: [], armedByDefault: true, timerTarget: 8 },
  { name: "Course de sauvetage", scoreMode: "lower", penalties: [], armedByDefault: false },
  { name: "Prise du veau au lasso", scoreMode: "lower", penalties: [], armedByDefault: false },
  { name: "Monte de chevaux avec selle", scoreMode: "higher", penalties: [], armedByDefault: true, timerTarget: 8 },
  { name: "Course de barils | Femmes", scoreMode: "lower", penalties: BARREL_PENALTIES, armedByDefault: true },
  { name: "Échange de cavaliers", scoreMode: "lower", penalties: [], armedByDefault: false },
  { name: "Terrassement du bouvillon", scoreMode: "lower", penalties: [], armedByDefault: false },
  { name: "Monte de taureaux", scoreMode: "higher", penalties: [], armedByDefault: true, timerTarget: 8 },
];

const EMPTY_COMPETITION = Object.freeze({ roster: [], entries: [], currentId: null });

export function parsePenalties(input) {
  const list = Array.isArray(input) ? input : String(input ?? "").split(/[\s,;]+/);
  const out = list
    .map((v) => Number(String(v).replace(",", ".").replace(/^\+/, "")))
    .filter((n) => Number.isFinite(n) && n > 0);
  return [...new Set(out)].sort((a, b) => a - b);
}

export const RIDE_TARGET = 8;

export function parseTarget(input) {
  const n = Number(String(input ?? "").replace(",", ".").trim());
  return String(input ?? "").trim() !== "" && Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeDiscipline(d) {
  const scoreMode = d?.scoreMode === "lower" ? "lower" : "higher";
  return {
    id: d?.id || newId(),
    name: String(d?.name ?? "").trim() || "Discipline",
    scoreMode,
    penalties: parsePenalties(d?.penalties),
    armedByDefault: Boolean(d?.armedByDefault),
    // Disciplines créées avant ce réglage : 8 s en pointage (montes), rien en temps.
    timerTarget: d?.timerTarget === undefined
      ? (scoreMode === "higher" ? RIDE_TARGET : null)
      : parseTarget(d.timerTarget),
  };
}

function normalizeCompetition(c) {
  const roster = Array.isArray(c?.roster)
    ? c.roster
        .filter((p) => p && String(p.name ?? "").trim())
        .map((p) => ({ id: p.id || newId(), name: String(p.name).trim() }))
    : [];
  const entries = Array.isArray(c?.entries) ? c.entries : [];
  const currentId = roster.some((p) => p.id === c?.currentId) ? c.currentId : null;
  return { roster, entries, currentId };
}

function normalizeRodeo(r, disciplineIds) {
  const competitions = {};
  for (const [id, comp] of Object.entries(r?.competitions ?? {})) {
    if (disciplineIds.has(id)) competitions[id] = normalizeCompetition(comp);
  }
  return {
    id: r?.id || newId(),
    name: String(r?.name ?? "").trim() || "Rodéo",
    competitions,
  };
}

/** Ancien état (eventName + scoreMode + entries à plat) → nouveau modèle. */
function migrate(state) {
  if (Array.isArray(state.disciplines) && Array.isArray(state.rodeos)) return state;

  let disciplines = Array.isArray(state.disciplines)
    ? state.disciplines
    : DEFAULT_DISCIPLINES.map((d) => ({ ...d, id: newId() }));

  let current = disciplines.find((d) => d.name === state.eventName);
  if (!current && state.eventName && state.eventName !== "Rodeo") {
    current = { id: newId(), name: state.eventName, scoreMode: state.scoreMode, penalties: [] };
    disciplines = [...disciplines, current];
  }
  current ??= disciplines[0];

  const rodeo = { id: newId(), name: "Rodéo", competitions: {} };
  if (current && Array.isArray(state.entries) && state.entries.length > 0) {
    rodeo.competitions[current.id] = { roster: [], entries: state.entries, currentId: null };
  }

  return {
    ...state,
    disciplines,
    rodeos: Array.isArray(state.rodeos) ? state.rodeos : [rodeo],
    currentRodeoId: state.currentRodeoId ?? rodeo.id,
    currentDisciplineId: state.currentDisciplineId ?? current?.id ?? null,
  };
}

/** Valide le modèle et recalcule le miroir de la compétition active. */
export function normalizeState(input) {
  const state = migrate(input ?? {});

  const disciplines = (state.disciplines.length ? state.disciplines : DEFAULT_DISCIPLINES)
    .map(normalizeDiscipline);
  const disciplineIds = new Set(disciplines.map((d) => d.id));

  const rodeos = (state.rodeos.length ? state.rodeos : [{ name: "Rodéo" }])
    .map((r) => normalizeRodeo(r, disciplineIds));

  const rodeo = rodeos.find((r) => r.id === state.currentRodeoId) ?? rodeos[0];
  const discipline = disciplines.find((d) => d.id === state.currentDisciplineId) ?? disciplines[0];
  const comp = rodeo.competitions[discipline.id] ?? EMPTY_COMPETITION;
  const current = comp.roster.find((p) => p.id === comp.currentId);

  // Nouvelle discipline → état armé par défaut de celle-ci.
  const timerArmed = state.timerArmedFor === discipline.id
    ? state.timerArmed === true
    : discipline.armedByDefault;
  const sameDiscipline = state.timerArmedFor === discipline.id;
  const pendingRun = sameDiscipline && discipline.scoreMode === "lower" && state.pendingRun
    ? state.pendingRun
    : null;

  return {
    ...state,
    disciplines,
    rodeos,
    currentRodeoId: rodeo.id,
    currentDisciplineId: discipline.id,
    timerArmed,
    timerArmedFor: discipline.id,
    timerTarget: discipline.timerTarget,
    pendingRun,
    eventName: discipline.name,
    scoreMode: discipline.scoreMode,
    entries: comp.entries,
    currentCompetitor: current?.name ?? null,
  };
}

export function getActive(state) {
  const rodeo = state.rodeos.find((r) => r.id === state.currentRodeoId);
  const discipline = state.disciplines.find((d) => d.id === state.currentDisciplineId);
  const competition = rodeo?.competitions[discipline?.id] ?? EMPTY_COMPETITION;
  return { rodeo, discipline, competition };
}

export function getCompetition(state, rodeoId, disciplineId) {
  const rodeo = state.rodeos.find((r) => r.id === rodeoId);
  return rodeo?.competitions[disciplineId] ?? EMPTY_COMPETITION;
}

/** Remplace une compétition (patch objet ou fonction) et renvoie le nouvel état. */
export function updateCompetition(state, rodeoId, disciplineId, patch) {
  return {
    ...state,
    rodeos: state.rodeos.map((r) => {
      if (r.id !== rodeoId) return r;
      const prev = r.competitions[disciplineId] ?? EMPTY_COMPETITION;
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      return { ...r, competitions: { ...r.competitions, [disciplineId]: next } };
    }),
  };
}

export function updateActiveCompetition(state, patch) {
  return updateCompetition(state, state.currentRodeoId, state.currentDisciplineId, patch);
}

/** Premier compétiteur (dans l'ordre de passage) après `fromId` sans résultat. */
export function nextPendingId(competition, fromId, entries = competition.entries) {
  const done = new Set(entries.map((e) => e.competitorId).filter(Boolean));
  const roster = competition.roster;
  const start = roster.findIndex((p) => p.id === fromId);
  for (let i = 1; i <= roster.length; i++) {
    const p = roster[(start + i + roster.length) % roster.length];
    if (p && !done.has(p.id)) return p.id;
  }
  return null;
}

/**
 * Texte (un nom par ligne) → ordre de passage. Réutilise l'id d'un compétiteur
 * déjà présent sous le même nom pour garder le lien avec ses résultats.
 */
export function rosterFromText(text, previous = []) {
  const pool = new Map();
  for (const p of previous) {
    const key = p.name.toLocaleLowerCase("fr");
    if (!pool.has(key)) pool.set(key, []);
    pool.get(key).push(p.id);
  }
  return String(text)
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d+[.)-]\s*/, "").trim()) // « 1. Nom » accepté
    .filter(Boolean)
    .map((name) => {
      const ids = pool.get(name.toLocaleLowerCase("fr"));
      return { id: ids?.shift() ?? newId(), name };
    });
}
