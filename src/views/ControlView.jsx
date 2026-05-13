import React, { useMemo, useRef, useState } from "react";
import useSyncedState from "../state/useSyncedState";
import { detectIsTimeString, parseScore, computeRanking } from "../utils/score";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Label from "../components/ui/Label";
import TextInput from "../components/ui/TextInput";
import EntriesTable from "../components/EntriesTable";
import Top3Preview from "../components/Top3Preview";
import { Cog6ToothIcon } from '@heroicons/react/24/solid'
import { PlusCircleIcon, TrashIcon } from '@heroicons/react/24/outline'
import logo from "../assets/logo.png";


function toTitleCase(str) {
  return str.replace(/\p{L}[\p{L}\p{M}'-]*/gu, (w) =>
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  );
}


export default function ControlView() {
  const [state, push] = useSyncedState();
  const [name, setName] = useState("");
  const [score, setScore] = useState("");
  const nameRef = useRef(null);

  const top3 = useMemo(() => computeRanking(state.entries, state.scoreMode).slice(0, 3), [state]);

  function addEntry() {
    const entry = {
      id: crypto.randomUUID(),
      name: name.trim() || "(sans nom)",
      raw: score,
      parsed: parseScore(score),
      timeHint: detectIsTimeString(score),
    };
    const next = { ...state, entries: [entry, ...state.entries] };
    push(next);
    setName(""); setScore(""); nameRef.current?.focus();
  }

  function clearAll() {
    if (!confirm("Effacer toutes les entrées ?")) return;
    push({ ...state, entries: [] });
  }

  function remove(id) {
    push({ ...state, entries: state.entries.filter((e) => e.id !== id) });
  }

  function openSettings() {
    const url = new URL(window.location.href);
    url.searchParams.set("settings", "1");
    window.location.href = url.toString();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-zinc-950 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center">
            <img src={logo} alt="Rodeo Scoring" className="h-24" />
            <div className="space-y-1 ml-4">
            <h1 className="text-2xl font-bold">Affichage des pointages – Scoring</h1>
            <p className="text-sm opacity-70">Ajoutez des compétiteurs et leurs scores/temps.</p>
          </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={openSettings}>
              <Cog6ToothIcon className="w-5 h-5 inline-block mr-1 -mt-0.5" />
               Paramètres</Button>
            <Button onClick={clearAll} className="bg-red-600 dark:bg-red-600">
              <TrashIcon className="w-5 h-5 inline-block mr-1 -mt-0.5" />
              Tout effacer</Button>
          </div>
        </header>

        <Card>
          <div className="grid md:grid-cols-2 gap-6 justify-items-center items-end">
            <div className="w-full max-w-xl">
              <div className="w-full">
                <Label>Nom de l’événement / discipline</Label>
              </div>
              <select
                className="w-full rounded-2xl border px-4 py-3 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                value={state.eventName || ""}
                onChange={(e) => push({ ...state, eventName: e.target.value })}
              >
                <option value="" disabled>— Choisir une discipline —</option>
                <option value="Monte de chevaux sans selle">Monte de chevaux sans selle</option>
                <option value="Course de sauvetage">Course de sauvetage</option>
                <option value="Prise du veau au lasso">Prise du veau au lasso</option>
                <option value="Monte de chevaux avec selle">Monte de chevaux avec selle</option>
                <option value="Course de barils | Femmes">Course de barils | Femmes</option>
                <option value="Échange de cavaliers">Échange de cavaliers</option>
                <option value="Terrassement du bouvillon">Terrassement du bouvillon</option>
                <option value="Monte de taureaux">Monte de taureaux</option>
              </select>
            </div>

            <div className="w-full max-w-xl">
              <div className="w-full">
                <Label>Mode de classement</Label>
              </div>
              <select
                className="w-full rounded-2xl border px-4 py-3 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                value={state.scoreMode}
                onChange={(e) => push({ ...state, scoreMode: e.target.value })}
              >
                <option value="higher">Mode score (Le plus haut est le meilleur)</option>
                <option value="lower">Mode temps (Le plus bas est le meilleur)</option>
              </select>
            </div>
          </div>
        </Card>


        <Card>
          <h2 className="text-lg font-semibold mb-3">Ajouter une entrée</h2>
          <div className="grid md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-2">
              <Label>Nom du compétiteur</Label>
              <TextInput
                id="name"
                name="name"
                ref={nameRef}
                value={name}
                onChange={(e) => setName(toTitleCase(e.target.value))}
                placeholder="Ex.: Marie Tremblay"
              />

            </div>
            <div className="md:col-span-2">
              <Label>Score / Temps</Label>
              <TextInput
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder={state.scoreMode === "lower" ? "Ex.: 17.243 ou 00:17.243" : "Ex.: 86.5"}
              />
            </div>
            <div>
              <Button  onClick={addEntry} disabled={!name.trim() || !score.trim()}>
                <PlusCircleIcon className="w-5 h-5 inline-block mr-1 -mt-0.5" />
                Ajouter l'entrée</Button>
            </div>
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <h2 className="text-lg font-semibold mb-3">Top 3 (aperçu)</h2>
            <Top3Preview entries={top3} scoreMode={state.scoreMode} eventName={state.eventName} />
          </Card>
          <Card>
            <div className="flex justify-between">
            <h2 className="text-lg font-semibold mb-3">Toutes les entrées</h2>
            </div>
            <EntriesTable entries={state.entries} scoreMode={state.scoreMode} onRemove={remove} />
          </Card>
        </div>
      </div>
    </div>
  );
}
