import logo from "../assets/logo.png";
import bannerLogo from "../assets/banner.jpg";

/** Images embarquées dans l'app, désignées par `asset:<clé>` dans un élément image. */
export const ASSETS = {
  logo: { label: "Logo FWST", url: logo },
  banner: { label: "Logo Festival Western (large)", url: bannerLogo },
};

export function resolveImageSrc(src) {
  if (typeof src !== "string") return "";
  if (src.startsWith("asset:")) return ASSETS[src.slice(6)]?.url ?? "";
  return src;
}
