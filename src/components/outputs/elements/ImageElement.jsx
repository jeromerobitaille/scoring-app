import React, { useEffect, useState } from "react";
import { resolveImageSrc } from "../../../state/assets";
import { cropLayout, useNaturalSize } from "./imageCrop";

const keyedCache = new Map();

/**
 * Charge une image et, si `keyColor` est donné, rend transparents les pixels
 * proches de cette couleur (incrustation faite dans l'app : la sortie peut
 * alors être transparente pour une source navigateur OBS).
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
      const c = canvas.getContext("2d");
      c.drawImage(img, 0, 0);
      const data = c.getImageData(0, 0, canvas.width, canvas.height);
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
      c.putImageData(data, 0, 0);
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

export default function ImageElement({ el }) {
  const url = useKeyedImage(resolveImageSrc(el.src), el.keyColor, el.keyTolerance);
  const natural = useNaturalSize(el.crop ? url : null);
  if (!url) return null;
  if (!el.crop) {
    return (
      <img
        src={url}
        alt=""
        draggable={false}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: el.fit, pointerEvents: "none" }}
      />
    );
  }
  const { box, img } = cropLayout(el, natural);
  return (
    <div style={{ position: "absolute", ...box, overflow: "hidden" }}>
      <img src={url} alt="" draggable={false} style={{ position: "absolute", ...img, maxWidth: "none", pointerEvents: "none" }} />
    </div>
  );
}
