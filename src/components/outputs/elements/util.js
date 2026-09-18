import { useEffect, useState } from "react";

/** Couleur d'un élément : clé du thème (text, muted, accent…) ou hexa. */
export function resolveColor(value, look, fallback = "#ffffff") {
  if (!value) return fallback;
  if (value in (look?.colors ?? {})) return look.colors[value];
  return value;
}

/** Index de page qui tourne toutes les `ms` millisecondes (0 = figé). */
export function useRotation(pageCount, ms) {
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (pageCount <= 1 || !ms) return;
    const id = setInterval(() => setPage((p) => (p + 1) % pageCount), ms);
    return () => clearInterval(id);
  }, [pageCount, ms]);
  useEffect(() => {
    if (page >= pageCount) setPage(0);
  }, [page, pageCount]);
  return Math.min(page, Math.max(0, pageCount - 1));
}

export function paginate(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
