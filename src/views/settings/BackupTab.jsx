import React, { useEffect, useRef, useState } from "react";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArrowUturnLeftIcon,
  FolderOpenIcon,
} from "@heroicons/react/24/outline";
import Card from "../../components/ui/Card";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { normalizeState } from "../../state/model";

const BACKUP_APP = "fwst-scoring";
const BACKUP_FORMAT = 1;

function summarize(state) {
  let competitors = 0;
  let results = 0;
  for (const r of state.rodeos) {
    for (const c of Object.values(r.competitions)) {
      competitors += c.roster.length;
      results += c.entries.length;
    }
  }
  return { rodeos: state.rodeos.length, disciplines: state.disciplines.length, competitors, results };
}

const plural = (n, word) => `${n} ${word}${n > 1 ? "s" : ""}`;

function describe(s) {
  return [
    plural(s.rodeos, "rodéo"),
    plural(s.disciplines, "discipline"),
    plural(s.competitors, "compétiteur"),
    plural(s.results, "résultat"),
  ].join(" · ");
}

const formatDate = (iso) => {
  if (!iso) return "date inconnue";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "date inconnue"
    : d.toLocaleString("fr-CA", { dateStyle: "long", timeStyle: "short" });
};

/**
 * Accepte un fichier exporté ({ app, state }), un state.json de l'app
 * ({ rooms: { default: … } }) ou un état brut. Lève une erreur lisible sinon.
 */
function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde valide (JSON illisible).");
  }
  let raw = null;
  let savedAt = null;
  if (data?.app === BACKUP_APP && data.state) {
    raw = data.state;
    savedAt = data.exportedAt;
  } else if (data?.rooms && typeof data.rooms === "object") {
    raw = data.rooms.default ?? Object.values(data.rooms)[0];
    savedAt = data.savedAt;
  } else if (data && (Array.isArray(data.rodeos) || Array.isArray(data.entries))) {
    raw = data;
  }
  if (!raw || typeof raw !== "object") {
    throw new Error("Ce fichier ne contient pas de données FWST Scoring.");
  }
  const state = { ...normalizeState(raw), pendingRun: null };
  return { state, savedAt, summary: summarize(state) };
}

function downloadInBrowser(json, name) {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function BackupTab({ state, push }) {
  const api = typeof window !== "undefined" ? window.fwst?.backup : null;
  const [message, setMessage] = useState(null); // { kind: "ok" | "error", text }
  const [candidate, setCandidate] = useState(null); // sauvegarde à confirmer
  const [autoBackups, setAutoBackups] = useState([]);
  const fileRef = useRef(null);

  const current = summarize(state);

  function refreshList() {
    api?.list().then(setAutoBackups).catch(() => setAutoBackups([]));
  }
  useEffect(refreshList, [api]);

  async function exportNow() {
    setMessage(null);
    // Heure locale (toISOString donnerait l'heure UTC dans le nom du fichier).
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}h${pad(d.getMinutes())}`;
    const name = `fwst-sauvegarde-${stamp}.json`;
    const json = JSON.stringify(
      {
        app: BACKUP_APP,
        format: BACKUP_FORMAT,
        exportedAt: new Date().toISOString(),
        state: { ...state, pendingRun: null },
      },
      null,
      2
    );
    if (!api) {
      downloadInBrowser(json, name);
      setMessage({ kind: "ok", text: `Sauvegarde téléchargée : ${name}` });
      return;
    }
    const r = await api.exportFile(json, name);
    if (r.ok) setMessage({ kind: "ok", text: `Sauvegarde enregistrée : ${r.path}` });
    else if (!r.canceled) setMessage({ kind: "error", text: `Export impossible : ${r.error}` });
  }

  function propose(text, source) {
    try {
      setCandidate({ ...parseBackup(text), source });
      setMessage(null);
    } catch (err) {
      setMessage({ kind: "error", text: err.message });
    }
  }

  async function importFile() {
    setMessage(null);
    if (!api) {
      fileRef.current?.click();
      return;
    }
    const r = await api.importFile();
    if (r.ok) propose(r.text, r.path);
    else if (!r.canceled) setMessage({ kind: "error", text: `Lecture impossible : ${r.error}` });
  }

  async function onBrowserFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) propose(await file.text(), file.name);
  }

  async function restoreAuto(name) {
    const r = await api.read(name);
    if (r.ok) propose(r.text, `sauvegarde automatique du ${name.slice(6, 16)}`);
    else setMessage({ kind: "error", text: `Lecture impossible : ${r.error}` });
  }

  function confirmRestore() {
    const { state: next, summary } = candidate;
    setCandidate(null);
    push(next);
    setMessage({ kind: "ok", text: `Données restaurées : ${describe(summary)}.` });
    setTimeout(refreshList, 1000); // après l'écriture différée côté serveur
  }

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Sauvegarde</h2>
        <p className="text-sm opacity-70">
          Les données (rodéos, ordres de passage, résultats, réglages) sont enregistrées
          automatiquement sur cet ordinateur et conservées lors des mises à jour. Exportez
          une copie avant un événement, ou pour transférer les données sur un autre ordinateur.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-sm">
        <span className="opacity-60">Données actuelles : </span>
        <span className="font-medium">{describe(current)}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={exportNow}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 cursor-pointer"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          Exporter une sauvegarde
        </button>
        <button
          type="button"
          onClick={importFile}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
        >
          <ArrowUpTrayIcon className="w-4 h-4" />
          Importer une sauvegarde…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={onBrowserFile}
          className="hidden"
        />
      </div>

      {message && (
        <p
          role="status"
          className={`mt-3 text-sm break-all ${
            message.kind === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          {message.text}
        </p>
      )}

      {api && (
        <div className="mt-6">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h3 className="text-sm font-semibold">Sauvegardes automatiques</h3>
            <button
              type="button"
              onClick={() => api.reveal()}
              className="inline-flex items-center gap-1.5 text-xs underline opacity-70 hover:opacity-100 cursor-pointer"
            >
              <FolderOpenIcon className="w-4 h-4" />
              Ouvrir le dossier
            </button>
          </div>
          <p className="text-xs opacity-60 mb-2">
            Une copie par jour d'utilisation, les 14 dernières sont conservées.
          </p>
          {autoBackups.length === 0 ? (
            <p className="text-sm opacity-60 italic">Aucune sauvegarde automatique pour l'instant.</p>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              {autoBackups.map((b) => (
                <li key={b.name} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <span>
                    {new Date(`${b.date}T12:00:00`).toLocaleDateString("fr-CA", { dateStyle: "full" })}
                    <span className="ml-2 text-xs opacity-60">
                      dernière modification {new Date(b.savedAt).toLocaleTimeString("fr-CA", { timeStyle: "short" })}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => restoreAuto(b.name)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
                    Restaurer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!candidate}
        title="Remplacer les données actuelles ?"
        message={
          candidate
            ? `La sauvegarde « ${candidate.source} » (${formatDate(candidate.savedAt)}) contient : ${describe(candidate.summary)}. ` +
              `Elle remplacera toutes les données actuelles (${describe(current)}) sur tous les écrans. ` +
              "Conseil : exportez d'abord les données actuelles."
            : ""
        }
        confirmLabel="Remplacer"
        onConfirm={confirmRestore}
        onCancel={() => setCandidate(null)}
      />
    </Card>
  );
}
