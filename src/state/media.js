/**
 * Téléversement d'images vers le serveur local de l'app (/api/media). Le
 * fichier est stocké dans le dossier de données et servi à tous les écrans.
 */
export async function uploadImage(file) {
  const res = await fetch("/api/media", { method: "POST", headers: { "Content-Type": file.type }, body: file });
  if (!res.ok) throw new Error((await res.text()) || `Téléversement refusé (${res.status})`);
  const { url } = await res.json();
  const size = await imageSize(url);
  return { url, ...size };
}

export function imageSize(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}
