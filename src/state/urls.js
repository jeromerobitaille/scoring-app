/** Adresse d'une sortie, en gardant la connexion (net, room) de la page courante. */
export function outputUrl(id) {
  const url = new URL(window.location.href);
  for (const k of ["settings", "editor", "tab", "display", "banner", "canvas", "bid", "w", "h", "output"]) url.searchParams.delete(k);
  url.searchParams.set("output", id);
  return url.toString();
}

/** Adresse de l'éditeur plein écran, sur une sortie donnée. */
export function editorUrl(outputId) {
  const url = new URL(window.location.href);
  for (const k of ["settings", "tab", "display", "banner", "canvas", "bid", "w", "h", "output"]) url.searchParams.delete(k);
  url.searchParams.set("editor", "1");
  if (outputId) url.searchParams.set("output", outputId);
  return url.toString();
}
