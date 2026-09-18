import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FONTS } from "../../state/look";
import { resolveTemplate } from "../../state/bindings";

const keyedCache = new Map();

/**
 * Charge une image et, si `keyColor` est donné, rend transparents les pixels
 * proches de cette couleur (incrustation faite dans l'app : le canevas peut
 * alors être transparent pour une source navigateur OBS).
 */
function useKeyedImage(src, keyColor, tolerance) {
  const cacheKey = `${src}|${keyColor ?? ""}|${tolerance}`;
  const [url, setUrl] = useState(() => keyedCache.get(cacheKey) ?? (keyColor ? null : src));

  useEffect(() => {
    if (!src) { setUrl(null); return; }
    if (!keyColor) { setUrl(src); return; }
    if (keyedCache.has(cacheKey)) { setUrl(keyedCache.get(cacheKey)); return; }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const px = data.data;
      const kr = parseInt(keyColor.slice(1, 3), 16);
      const kg = parseInt(keyColor.slice(3, 5), 16);
      const kb = parseInt(keyColor.slice(5, 7), 16);
      // Distance RVB normalisée (0 = couleur exacte, 1 = opposée) ; dégradé doux au bord.
      const hard = tolerance;
      const soft = tolerance + 0.12;
      for (let i = 0; i < px.length; i += 4) {
        const d = Math.sqrt(((px[i] - kr) ** 2 + (px[i + 1] - kg) ** 2 + (px[i + 2] - kb) ** 2) / (3 * 255 * 255));
        if (d < hard) px[i + 3] = 0;
        else if (d < soft) px[i + 3] = Math.round(px[i + 3] * ((d - hard) / (soft - hard)));
      }
      ctx.putImageData(data, 0, 0);
      const out = canvas.toDataURL("image/png");
      keyedCache.set(cacheKey, out);
      setUrl(out);
    };
    img.onerror = () => { if (!cancelled) setUrl(src); };
    img.src = src;
    return () => { cancelled = true; };
  }, [src, keyColor, tolerance, cacheKey]);

  return url;
}

function layerStyle(layer, scale = 1) {
  const f = FONTS[layer.font] ?? FONTS.system;
  return {
    fontFamily: f.family,
    fontWeight: layer.bold ? 800 : f.weight,
    textTransform: layer.uppercase || f.uppercase ? "uppercase" : undefined,
    fontSize: Math.round(layer.size * scale),
    letterSpacing: layer.letterSpacing ? `${layer.letterSpacing}em` : undefined,
    color: layer.color,
    textAlign: layer.align,
    lineHeight: 1.05,
  };
}

/**
 * Infographie : une image téléversée (gabarit broadcast) et des calques de
 * texte avec variables ({competitor.name}, {timer}…) positionnés par-dessus.
 */
export default function GraphicElement({ element, ctx }) {
  const imageUrl = useKeyedImage(element.image, element.keyColor, element.keyTolerance);
  const layers = element.layers.map((l) => ({ ...l, value: resolveTemplate(l.text, ctx) }));
  const anyText = layers.some((l) => l.value.trim());
  const visible = !element.hideWhenEmpty || anyText;
  // L'animation d'entrée ne rejoue que si le sujet change (pas à chaque tic du chrono).
  const subject = layers.filter((l) => !/\{(timer|timerOrResult)\}/.test(l.text)).map((l) => l.value).join("|");

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={element.animate ? subject : "static"}
          initial={element.animate ? { opacity: 0, y: 20 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ position: "absolute", inset: 0 }}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              draggable={false}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", pointerEvents: "none" }}
            />
          )}
          {layers.map((l) =>
            l.value.trim() ? (
              <div
                key={l.id}
                style={{
                  position: "absolute",
                  left: l.x,
                  top: l.y,
                  width: l.width,
                  height: l.height,
                  display: "flex",
                  alignItems: l.valign === "top" ? "flex-start" : l.valign === "bottom" ? "flex-end" : "center",
                  justifyContent: l.align === "left" ? "flex-start" : l.align === "right" ? "flex-end" : "center",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textShadow: l.shadow ? "0 2px 8px rgba(0,0,0,0.6)" : undefined,
                  ...layerStyle(l),
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{l.value}</span>
              </div>
            ) : null
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
