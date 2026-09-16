const fs = require("node:fs");
const path = require("node:path");

/**
 * Persistance de l'état des rooms sur disque (dossier de données de l'app).
 *
 *   <dir>/state.json                     état courant de toutes les rooms
 *   <dir>/backups/state-AAAA-MM-JJ.json  une copie par jour, les KEEP_DAYS dernières
 *
 * Le navigateur intégré range son localStorage par origine (port compris) :
 * si le port 5050 est pris, l'app démarre sur un autre port et son localStorage
 * est vide. Avec cet état côté serveur, chaque écran le reçoit en se connectant,
 * quel que soit le port.
 */

const KEEP_DAYS = 14;
const WRITE_DELAY_MS = 300;
const BACKUP_RE = /^state-(\d{4}-\d{2}-\d{2})\.json$/;

function writeAtomic(file, text) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function createStore(dir) {
  const file = path.join(dir, "state.json");
  const backupDir = path.join(dir, "backups");
  let timer = null;
  let pending = null;

  function load() {
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      return data && typeof data.rooms === "object" ? data.rooms : {};
    } catch (err) {
      if (err.code !== "ENOENT") console.error("[persist] state.json illisible :", err.message);
      return {};
    }
  }

  function flush() {
    clearTimeout(timer);
    timer = null;
    if (!pending) return;
    const text = JSON.stringify({ savedAt: new Date().toISOString(), rooms: pending });
    pending = null;
    try {
      fs.mkdirSync(backupDir, { recursive: true });
      writeAtomic(file, text);
      writeAtomic(path.join(backupDir, `state-${today()}.json`), text);
      pruneBackups();
    } catch (err) {
      console.error("[persist] écriture impossible :", err.message);
    }
  }

  /** Enregistre (avec un court délai pour regrouper les écritures rapprochées). */
  function save(rooms) {
    pending = rooms;
    if (!timer) timer = setTimeout(flush, WRITE_DELAY_MS);
  }

  function pruneBackups() {
    const old = listBackups().slice(KEEP_DAYS);
    for (const b of old) {
      try { fs.unlinkSync(path.join(backupDir, b.name)); } catch { /* déjà supprimé */ }
    }
  }

  /** Sauvegardes automatiques, la plus récente d'abord. */
  function listBackups() {
    let names = [];
    try { names = fs.readdirSync(backupDir); } catch { return []; }
    return names
      .filter((n) => BACKUP_RE.test(n))
      .map((name) => {
        const stat = fs.statSync(path.join(backupDir, name));
        return { name, date: BACKUP_RE.exec(name)[1], savedAt: stat.mtime.toISOString(), size: stat.size };
      })
      .sort((a, b) => b.name.localeCompare(a.name));
  }

  /** Contenu d'une sauvegarde automatique (nom validé : pas de chemin arbitraire). */
  function readBackup(name) {
    if (!BACKUP_RE.test(String(name))) throw new Error("Nom de sauvegarde invalide");
    return fs.readFileSync(path.join(backupDir, name), "utf8");
  }

  return { load, save, flush, listBackups, readBackup, file, backupDir };
}

module.exports = { createStore };
