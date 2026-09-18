import React from "react";
import { TrashIcon, DocumentDuplicateIcon, ArrowUpTrayIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { FONTS } from "../../../state/look";
import { VARIABLES } from "../../../state/bindings";
import { ELEMENT_KINDS, OUTPUT_STATES } from "../../../state/outputs";
import { ASSETS } from "../../../state/assets";
import { BTN, BTN_DANGER, ColorSelect, Field, INPUT, NumberField, SMALL, Section, SelectField, Slider, Toggle } from "./inputs";

const FONT_OPTIONS = Object.entries(FONTS).map(([k, f]) => [k, f.label]);
const ALIGN_OPTIONS = [["left", "Gauche"], ["center", "Centré"], ["right", "Droite"]];
const VALIGN_OPTIONS = [["top", "Haut"], ["middle", "Milieu"], ["bottom", "Bas"]];
const sec = (ms) => (ms ? `${Math.round(ms / 1000)} s` : "figé");

function TextProps({ el, set }) {
  return (
    <>
      <Section title="Texte">
        <div className="space-y-1.5">
          <input
            className={INPUT}
            value={el.text}
            onChange={(e) => set({ text: e.target.value })}
            placeholder="Texte avec variables, ex. {competitor.name}"
            aria-label="Texte"
          />
          <select
            className={SMALL}
            value=""
            onChange={(e) => { if (e.target.value) set({ text: `${el.text}{${e.target.value}}` }); }}
            aria-label="Insérer une variable"
          >
            <option value="">+ variable…</option>
            {VARIABLES.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
          </select>
        </div>
        <p className="text-[11px] opacity-60">Variables : {VARIABLES.map((v) => `{${v.key}}`).join(" ")}</p>
      </Section>
      <Section title="Police">
        <div className="grid grid-cols-2 gap-2">
          <SelectField label="Police" value={el.font} onChange={(v) => set({ font: v })} options={FONT_OPTIONS} className="col-span-2" />
          <NumberField label="Taille (px)" value={el.size} onChange={(v) => set({ size: v })} min={6} max={800} />
          <ColorSelect label="Couleur" value={el.color} onChange={(v) => set({ color: v })} />
          <SelectField label="Horizontal" value={el.align} onChange={(v) => set({ align: v })} options={ALIGN_OPTIONS} />
          <SelectField label="Vertical" value={el.valign} onChange={(v) => set({ valign: v })} options={VALIGN_OPTIONS} />
          <NumberField label="Lignes max" value={el.lines} onChange={(v) => set({ lines: v })} min={1} max={6} />
          <NumberField label="Interlettrage (em)" value={el.letterSpacing} onChange={(v) => set({ letterSpacing: v })} min={-0.1} max={1} step={0.01} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Toggle label="Gras" checked={el.bold} onChange={(v) => set({ bold: v })} />
          <Toggle label="Majuscules" checked={el.uppercase} onChange={(v) => set({ uppercase: v })} />
          <Toggle label="Ombre" checked={el.shadow} onChange={(v) => set({ shadow: v })} />
          <Toggle label="Réduire pour tenir sur une ligne" checked={el.autoFit} onChange={(v) => set({ autoFit: v })} />
        </div>
      </Section>
      <Section title="Fond du texte">
        <div className="grid grid-cols-2 gap-2">
          <ColorSelect label="Fond" value={el.background} onChange={(v) => set({ background: v })} allowNone />
          <NumberField label="Opacité du fond" value={el.bgOpacity} onChange={(v) => set({ bgOpacity: v })} min={0} max={1} step={0.05} />
          <NumberField label="Arrondi (px)" value={el.radius} onChange={(v) => set({ radius: v })} min={0} max={999} />
          <NumberField label="Marge intérieure (px)" value={el.padding} onChange={(v) => set({ padding: v })} min={0} max={400} />
        </div>
      </Section>
    </>
  );
}

function ImageProps({ el, set, onPickImage, uploading }) {
  const isAsset = el.src.startsWith("asset:");
  return (
    <Section title="Image">
      <div className="space-y-3">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-2 bg-[repeating-conic-gradient(#8883_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
          {el.src ? (
            <img src={isAsset ? ASSETS[el.src.slice(6)]?.url : el.src} alt="" className="w-full h-auto max-h-40 object-contain rounded-md" />
          ) : (
            <div className="text-xs opacity-60 italic p-3 text-center">Aucune image</div>
          )}
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <SelectField
              label="Source"
              value={isAsset ? el.src : "upload"}
              onChange={(v) => { if (v === "upload") onPickImage(el.id); else set({ src: v }); }}
              options={[...Object.entries(ASSETS).map(([k, a]) => [`asset:${k}`, a.label]), ["upload", "Image téléversée"]]}
            />
            <SelectField label="Ajustement" value={el.fit} onChange={(v) => set({ fit: v })} options={[["contain", "Contenir (proportions)"], ["cover", "Couvrir"], ["fill", "Étirer"]]} />
          </div>
          <button type="button" onClick={() => onPickImage(el.id)} disabled={uploading} className={BTN}>
            <ArrowUpTrayIcon className="w-3.5 h-3.5" /> {uploading ? "Téléversement…" : "Téléverser une image…"}
          </button>
          <Toggle label="Rendre une couleur transparente (incrustation dans l'app)" checked={!!el.keyColor} onChange={(v) => set({ keyColor: v ? "#00ff00" : null })} />
          {el.keyColor && (
            <div className="grid grid-cols-2 gap-2 pl-5">
              <Field label="Couleur à effacer">
                <input type="color" value={el.keyColor} onChange={(e) => set({ keyColor: e.target.value })} className="block w-full h-7 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent cursor-pointer" />
              </Field>
              <Slider label="Tolérance" value={el.keyTolerance} onChange={(v) => set({ keyTolerance: v })} min={0.05} max={0.8} step={0.01} format={(v) => `${Math.round(v * 100)} %`} />
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

function CardProps({ el, set }) {
  return (
    <Section title="Carte">
      <div className="grid grid-cols-2 gap-2">
        <SelectField label="Remplissage" value={el.fill} onChange={(v) => set({ fill: v })} options={[["card", "Carte du thème"], ["background", "Dégradé de fond du thème"], ["custom", "Couleur libre"]]} />
        {el.fill === "custom" && (
          <>
            <Field label="Couleur">
              <input type="color" value={el.color} onChange={(e) => set({ color: e.target.value })} className="block w-full h-7 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent cursor-pointer" />
            </Field>
            <NumberField label="Opacité" value={el.fillOpacity} onChange={(v) => set({ fillOpacity: v })} min={0} max={1} step={0.05} />
          </>
        )}
        <SelectField label="Barre d'accent" value={el.accentBar} onChange={(v) => set({ accentBar: v })} options={[["none", "Aucune"], ["left", "Gauche"], ["top", "Haut"]]} />
        <Field label="Arrondi">
          <div className="flex gap-1">
            <select className={SMALL} value={el.radius == null ? "auto" : "custom"} onChange={(e) => set({ radius: e.target.value === "auto" ? null : 12 })}>
              <option value="auto">Du thème</option>
              <option value="custom">Personnalisé</option>
            </select>
            {el.radius != null && <input type="number" className={`${SMALL} !w-20`} value={el.radius} min={0} max={400} onChange={(e) => set({ radius: Number(e.target.value) || 0 })} />}
          </div>
        </Field>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <Toggle label="Bordure" checked={el.border} onChange={(v) => set({ border: v })} />
        <Toggle label="Ombre" checked={el.shadow} onChange={(v) => set({ shadow: v })} />
      </div>
    </Section>
  );
}

function TableProps({ el, set }) {
  return (
    <Section title="Tableau">
      <div className="grid grid-cols-2 gap-2">
        <Slider label="Rangées par page" value={el.pageSize} onChange={(v) => set({ pageSize: v })} min={1} max={12} step={1} />
        <Slider label="Rotation des pages" value={el.rotationMs} onChange={(v) => set({ rotationMs: v })} min={0} max={20000} step={1000} format={sec} />
        <Slider label="Taille du texte" value={el.fontScale} onChange={(v) => set({ fontScale: v })} min={0.5} max={2} step={0.05} format={(v) => `${v.toFixed(2)}×`} />
        <SelectField label="Style des rangées" value={el.rowStyle} onChange={(v) => set({ rowStyle: v })} options={[["card", "Cartes"], ["line", "Lignes"]]} />
      </div>
      <Field label="Texte quand il n'y a aucun résultat">
        <input className={SMALL} value={el.emptyText} onChange={(e) => set({ emptyText: e.target.value })} />
      </Field>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <Toggle label="Rang" checked={el.showRank} onChange={(v) => set({ showRank: v })} />
        <Toggle label="Ville" checked={el.showHometown} onChange={(v) => set({ showHometown: v })} />
        <Toggle label="Unité (s / pts)" checked={el.showUnit} onChange={(v) => set({ showUnit: v })} />
        <Toggle label="Points de pagination" checked={el.showPagination} onChange={(v) => set({ showPagination: v })} />
      </div>
      <p className="text-[11px] opacity-60">Ligne de coupure, couleurs et polices : onglet Apparence.</p>
    </Section>
  );
}

function CarouselProps({ el, set }) {
  return (
    <Section title="Carrousel">
      <div className="grid grid-cols-2 gap-2">
        <Slider label="Cartes par page" value={el.pageSize} onChange={(v) => set({ pageSize: v })} min={1} max={8} step={1} />
        <Slider label="Rotation" value={el.rotationMs} onChange={(v) => set({ rotationMs: v })} min={1000} max={20000} step={1000} format={sec} />
        <Slider label="Taille du nom" value={el.nameScale} onChange={(v) => set({ nameScale: v })} min={0.6} max={2} step={0.05} format={(v) => `${v.toFixed(2)}×`} />
        <Slider label="Taille du résultat" value={el.scoreScale} onChange={(v) => set({ scoreScale: v })} min={0.6} max={2} step={0.05} format={(v) => `${v.toFixed(2)}×`} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <Toggle label="Ville" checked={el.showHometown} onChange={(v) => set({ showHometown: v })} />
        <Toggle label="Annoncer un nouveau résultat (5 s)" checked={el.flashNew} onChange={(v) => set({ flashNew: v })} />
      </div>
    </Section>
  );
}

function TimerProps({ el, set }) {
  return (
    <Section title="Chrono">
      <div className="grid grid-cols-2 gap-2">
        <Slider label="Taille du temps" value={el.timeScale} onChange={(v) => set({ timeScale: v })} min={0.3} max={2} step={0.05} format={(v) => `${v.toFixed(2)}×`} />
        <SelectField label="Alignement" value={el.align} onChange={(v) => set({ align: v })} options={ALIGN_OPTIONS} />
        <SelectField label="Fond" value={el.fill} onChange={(v) => set({ fill: v })} options={[["none", "Aucun"], ["card", "Carte du thème"], ["black", "Noir, bordure accent"]]} />
        <Toggle label="Nom du compétiteur" checked={el.showName} onChange={(v) => set({ showName: v })} className="self-end pb-1.5" />
      </div>
      <p className="text-[11px] opacity-60">
        Le temps apparaît pendant la course (chrono armé) et reste affiché jusqu'à ce que l'arrivée soit validée ou annulée. Rien n'est dessiné sinon.
      </p>
    </Section>
  );
}

const KIND_PROPS = { text: TextProps, image: ImageProps, card: CardProps, table: TableProps, carousel: CarouselProps, timer: TimerProps };

/** Panneau des propriétés de l'élément sélectionné. */
export default function ElementProperties({ el, output, onChange, onMove, onDuplicate, onRemove, onPickImage, uploading, onDeselect }) {
  const set = (patch) => onChange(el.id, patch);
  const Props = KIND_PROPS[el.kind];
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={el.name}
            onChange={(e) => set({ name: e.target.value })}
            className="text-base font-semibold bg-transparent border-0 border-b border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-zinc-500 focus:outline-none px-0 py-0.5 flex-1 min-w-0"
            aria-label="Nom de l'élément"
          />
          {onDeselect && (
            <button type="button" onClick={onDeselect} className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 cursor-pointer" title="Propriétés de la sortie" aria-label="Désélectionner">
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="text-xs opacity-60">{ELEMENT_KINDS[el.kind].label}</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberField label="X" value={el.x} onChange={(v) => onMove(el.id, { x: v })} min={-output.width} max={output.width} />
        <NumberField label="Y" value={el.y} onChange={(v) => onMove(el.id, { y: v })} min={-output.height} max={output.height} />
        <NumberField label="Largeur" value={el.width} onChange={(v) => onMove(el.id, { width: v })} min={8} max={output.width} />
        <NumberField label="Hauteur" value={el.height} onChange={(v) => onMove(el.id, { height: v })} min={8} max={output.height} />
        <NumberField label="Opacité" value={el.opacity} onChange={(v) => set({ opacity: v })} min={0} max={1} step={0.05} />
        <Toggle label="Visible" checked={el.visible} onChange={(v) => set({ visible: v })} className="self-end pb-1.5" />
      </div>

      <Section title="Affiché dans les états">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {OUTPUT_STATES.map((s) => (
            <Toggle key={s.key} label={s.label} checked={el.states[s.key]} onChange={(v) => set({ states: { ...el.states, [s.key]: v } })} />
          ))}
          <span className="w-px h-4 bg-zinc-300 dark:bg-zinc-700 self-center" />
          <Toggle label="Seulement si un compétiteur est sélectionné" checked={el.needsCompetitor} onChange={(v) => set({ needsCompetitor: v })} />
          <Toggle label="Animer l'entrée quand le sujet change" checked={el.animate} onChange={(v) => set({ animate: v })} />
        </div>
      </Section>

      {Props && <Props el={el} set={set} onPickImage={onPickImage} uploading={uploading} />}

      <div className="flex gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
        <button type="button" onClick={() => onDuplicate(el.id)} className={BTN}><DocumentDuplicateIcon className="w-3.5 h-3.5" /> Dupliquer</button>
        <button type="button" onClick={() => onRemove(el.id)} className={BTN_DANGER}><TrashIcon className="w-3.5 h-3.5" /> Supprimer</button>
      </div>
    </div>
  );
}
