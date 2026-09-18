import { useEffect, useState } from "react";

const sizeCache = new Map();

/** Taille naturelle d'une image (pour le recadrage). */
export function useNaturalSize(url) {
  const [size, setSize] = useState(() => sizeCache.get(url) ?? null);
  useEffect(() => {
    if (!url) { setSize(null); return; }
    if (sizeCache.has(url)) { setSize(sizeCache.get(url)); return; }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      const s = { w: img.naturalWidth, h: img.naturalHeight };
      sizeCache.set(url, s);
      if (!cancelled) setSize(s);
    };
    img.src = url;
    return () => { cancelled = true; };
  }, [url]);
  return size;
}

/**
 * Boîte occupée par la zone recadrée d'une image dans un élément, selon
 * l'ajustement (contain / cover / fill), et position de l'image entière
 * dans cette boîte.
 */
export function cropLayout(el, natural) {
  const crop = el.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const cw = (natural?.w ?? el.width) * crop.w;
  const ch = (natural?.h ?? el.height) * crop.h;
  let boxW = el.width;
  let boxH = el.height;
  if (el.fit !== "fill" && cw > 0 && ch > 0) {
    const s = el.fit === "contain" ? Math.min(el.width / cw, el.height / ch) : Math.max(el.width / cw, el.height / ch);
    boxW = cw * s;
    boxH = ch * s;
  }
  const imgW = boxW / crop.w;
  const imgH = boxH / crop.h;
  return {
    box: { left: (el.width - boxW) / 2, top: (el.height - boxH) / 2, width: boxW, height: boxH },
    img: { left: -crop.x * imgW, top: -crop.y * imgH, width: imgW, height: imgH },
  };
}

