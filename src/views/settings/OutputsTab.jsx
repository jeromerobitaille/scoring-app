import React from "react";
import { ArrowTopRightOnSquareIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import Card from "../../components/ui/Card";
import OutputLauncher from "../../components/FullscreenLauncher";
import { bus } from "../../sync/SyncBus";
import { editorUrl, outputUrl } from "../../state/urls";
import { BACKGROUNDS } from "../../state/outputs";

const openEditor = (id) => { window.location.href = editorUrl(id); };

/** Liste des sorties : ouvrir chacune, ou passer à l'éditeur plein écran. */
export default function OutputsTab({ state }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold">Sorties</h2>
          <p className="text-sm opacity-70">
            Tableau, bandeaux LED, canevas OBS… Chaque sortie est composée dans l'éditeur
            plein écran : éléments (texte avec variables, image, carte, tableau, carrousel,
            chrono), états (aucun résultat / en course / résultats) et mise en page libre.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openEditor(null)}
          className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-medium shadow-sm bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:shadow cursor-pointer"
        >
          <PencilSquareIcon className="w-4 h-4" /> Ouvrir l'éditeur
        </button>
      </div>

      <div className="space-y-2">
        {state.outputs.map((o) => (
          <div key={o.id} className="flex items-center gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{o.name}</div>
              <div className="text-xs opacity-60 tabular-nums">
                {o.width} × {o.height} px · {o.elements.length} élément{o.elements.length > 1 ? "s" : ""} · fond : {BACKGROUNDS[o.background]?.label ?? o.background}
              </div>
            </div>
            <button type="button" onClick={() => openEditor(o.id)} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
              <PencilSquareIcon className="w-3.5 h-3.5" /> Modifier
            </button>
            <OutputLauncher
              buildUrl={() => outputUrl(o.id)}
              windowName={`fwst-output-${o.id}`}
              windowFeatures={`noopener,noreferrer,width=${o.width},height=${o.height}`}
              label="Ouvrir"
              icon={ArrowTopRightOnSquareIcon}
              onBeforeLaunch={() => bus?.post({ type: "sync:update", payload: state })}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
