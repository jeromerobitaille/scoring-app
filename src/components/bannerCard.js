/**
 * Apparence des cartes du bandeau (fond gris translucide, bordure, ombre).
 * Partagée avec l'élément « Chrono » du canevas pour un rendu identique.
 * `unit` = hauteur de référence / 216 px.
 */
export function bannerCardStyle(unit) {
  return {
    borderRadius: Math.round(18 * unit),
    backdropFilter: "blur(6px)",
    background: "rgba(30,30,30,0.6)",
    border: "2px solid rgba(255,255,255,0.15)",
    boxShadow: "0 6px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
  };
}
