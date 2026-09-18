import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { backgroundCss, isElementShown } from "../../state/context";
import TextElement from "./elements/TextElement";
import ImageElement from "./elements/ImageElement";
import CardElement from "./elements/CardElement";
import TableElement from "./elements/TableElement";
import CarouselElement from "./elements/CarouselElement";
import TimerElement from "./elements/TimerElement";

const RENDERERS = {
  text: TextElement,
  image: ImageElement,
  card: CardElement,
  table: TableElement,
  carousel: CarouselElement,
  timer: TimerElement,
};

/** Sujet dont le changement relance l'animation d'entrée. */
function subjectOf(el, ctx) {
  const c = ctx.current?.id ?? "";
  if (el.kind === "text") {
    // Les textes qui suivent le chrono ne rejouent pas l'animation à chaque tic.
    return /\{(timer|timerOrResult)\}/.test(el.text) ? c : `${c}|${el.text}|${ctx.eventName}|${ctx.rodeoName}`;
  }
  return c;
}

function ElementView({ el, ctx }) {
  const Renderer = RENDERERS[el.kind];
  if (!Renderer) return null;
  const shown = isElementShown(el, ctx);
  const box = { position: "absolute", left: el.x, top: el.y, width: el.width, height: el.height, opacity: el.opacity, overflow: "hidden" };

  if (!el.animate) {
    return shown ? (
      <div style={box}>
        <Renderer el={el} ctx={ctx} />
      </div>
    ) : null;
  }
  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          key={subjectOf(el, ctx)}
          initial={{ opacity: 0, y: Math.min(20, el.height / 4) }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={box}
        >
          <Renderer el={el} ctx={ctx} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Scène d'une sortie : tous ses éléments à leur position, dans l'ordre de la
 * liste (le dernier est au-dessus). Purement présentationnel ; sert à la
 * sortie plein écran comme aux aperçus de l'éditeur.
 */
export default function OutputStage({ output, ctx, background, elements = output.elements }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: output.width,
        height: output.height,
        overflow: "hidden",
        background: backgroundCss(background ?? output.background, ctx.look),
      }}
    >
      {elements.map((el) => (
        <ElementView key={el.id} el={el} ctx={ctx} />
      ))}
    </div>
  );
}
