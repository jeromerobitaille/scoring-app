const { EventEmitter } = require("node:events");
const { randomUUID } = require("node:crypto");

/**
 * Lit le port « display » d'un chrono FarmTek branché en USB-série.
 * Port JS de timer_viewer/timer_ws.py.
 *
 * Format observé (9600 8N1), ~23 trames/s, 7 caractères + CR :
 *   "  2.812\r"   chrono en marche (ou au repos)
 *   "141.005\r"   chrono arrêté par la cellule 1 sur 41.005
 *    │└──┬─┘
 *    │   └── temps affiché (6 caractères)
 *    └────── numéro de cellule, espace tant que le chrono tourne
 *
 * Événements émis :
 *   "frame"  { eye, time, seconds, state, runId, session, ts }
 *            runId augmente à chaque départ ; session change à chaque lancement
 *            de l'application (runId repart alors de zéro).
 *   "status" { connected, port, error }
 */

const FRAME_LEN = 7;
const FRAME_RE = /^(?<eye>[ \d])(?<time>\s*(?:\d+:)?\d+\.\d+)$/;
const STOPPED_AFTER = 6; // trames identiques avant de considérer le chrono arrêté
const RETRY_MS = 2000;
const MAX_BUFFER = 256;

function toSeconds(t) {
  return t.split(":").reduce((total, part) => total * 60 + parseFloat(part), 0);
}

/** "141.005" -> { eye: 1, time: "41.005", seconds: 41.005 } ou null. */
function parseFrame(text) {
  if (text.length !== FRAME_LEN) return null; // octet perdu, ex. "141.05"
  const m = FRAME_RE.exec(text);
  if (!m) return null;
  const time = m.groups.time.trim();
  const eye = m.groups.eye === " " ? null : Number(m.groups.eye);
  return { eye, time, seconds: Math.round(toSeconds(time) * 1000) / 1000 };
}

/** Déduit l'état du chrono à partir de l'évolution du temps affiché. */
class StateTracker {
  constructor() {
    this.last = null;
    this.same = 0;
    this.state = "unknown";
    // Incrémenté à chaque nouveau départ : permet aux clients de ne traiter
    // qu'une fois l'arrêt d'une course donnée.
    this.runId = 0;
  }

  update(seconds, eye) {
    const prev = this.state;
    if (eye != null) {
      this.state = "stopped"; // le chrono indique la cellule qui l'a arrêté
    } else if (seconds === 0) {
      this.state = "ready";
    } else if (this.last != null && seconds !== this.last) {
      // Temps qui avance, ou qui recule (nouveau départ sans remise à zéro).
      this.state = "running";
      this.same = 0;
    } else if (seconds === this.last) {
      this.same += 1;
      if (this.same >= STOPPED_AFTER) this.state = "stopped";
    }
    if (this.state === "running" && prev !== "running") this.runId += 1;
    this.last = seconds;
    return this.state;
  }
}

function isUsbPort(p) {
  return Boolean(p.vendorId) || /usb/i.test(p.path) || /USB/i.test(p.pnpId || "");
}

/** Sur macOS, /dev/cu.* n'attend pas le signal DCD contrairement à /dev/tty.* */
function preferCallout(path) {
  return path.replace(/^\/dev\/tty\./, "/dev/cu.");
}

async function listPorts() {
  const { SerialPort } = require("serialport");
  const ports = await SerialPort.list();
  return ports.map((p) => ({
    path: preferCallout(p.path),
    manufacturer: p.manufacturer || null,
    usb: isUsbPort(p),
  }));
}

class TimerReader extends EventEmitter {
  constructor() {
    super();
    this.config = { enabled: true, port: "auto", baudRate: 9600 };
    this.port = null;
    this.retryTimer = null;
    this.stopped = true;
    this.session = randomUUID();
    this.tracker = new StateTracker();
    this.buf = "";
    this.lastFrame = null;
    this.status = { connected: false, port: null, error: null };
  }

  setStatus(patch) {
    this.status = { ...this.status, ...patch };
    this.emit("status", this.status);
  }

  start(config) {
    if (config) this.config = { ...this.config, ...config };
    this.stop();
    this.stopped = false;
    if (!this.config.enabled) {
      this.setStatus({ connected: false, port: null, error: null });
      return;
    }
    this.open();
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.retryTimer);
    const port = this.port;
    this.port = null;
    if (port?.isOpen) port.close(() => {});
    if (this.status.connected) this.setStatus({ connected: false });
  }

  scheduleRetry(error) {
    this.setStatus({ connected: false, error });
    if (this.stopped) return;
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => this.open(), RETRY_MS);
  }

  async resolvePath() {
    if (this.config.port && this.config.port !== "auto") return this.config.port;
    const usb = (await listPorts()).filter((p) => p.usb);
    return usb[0]?.path || null;
  }

  async open() {
    if (this.stopped) return;
    let path;
    try {
      path = await this.resolvePath();
    } catch (err) {
      return this.scheduleRetry(`Liste des ports impossible : ${err.message}`);
    }
    if (this.stopped) return;
    if (!path) return this.scheduleRetry("Aucun adaptateur USB-série détecté");

    const { SerialPort } = require("serialport");
    const port = new SerialPort({ path, baudRate: this.config.baudRate, autoOpen: false });
    this.port = port;
    this.buf = "";
    // Nouveau suivi d'état, mais runId reste croissant d'une reconnexion à l'autre.
    const { runId } = this.tracker;
    this.tracker = new StateTracker();
    this.tracker.runId = runId;

    port.on("data", (chunk) => this.onData(chunk));
    port.on("close", () => {
      if (this.port !== port) return;
      this.port = null;
      this.scheduleRetry("Port fermé (câble débranché ?)");
    });
    port.on("error", (err) => {
      if (this.port !== port) return;
      console.error("[timer] erreur série :", err.message);
    });

    port.open((err) => {
      if (this.port !== port) return;
      if (err) {
        this.port = null;
        return this.scheduleRetry(`Ouverture de ${path} impossible : ${err.message}`);
      }
      console.log(`[timer] série ouverte : ${path} @ ${this.config.baudRate}`);
      this.setStatus({ connected: true, port: path, error: null });
    });
  }

  onData(chunk) {
    this.buf += chunk.toString("latin1");
    let cut;
    while ((cut = this.buf.search(/[\r\n]/)) >= 0) {
      const line = this.buf.slice(0, cut);
      this.buf = this.buf.slice(cut + 1);
      if (line.trim()) this.onFrame(line);
    }
    if (this.buf.length > MAX_BUFFER) this.buf = ""; // pas de fin de trame : flux corrompu
  }

  onFrame(text) {
    const p = parseFrame(text);
    if (!p) return;
    const state = this.tracker.update(p.seconds, p.eye);
    this.lastFrame = { ...p, state, runId: this.tracker.runId, session: this.session, ts: Date.now() };
    this.emit("frame", this.lastFrame);
  }
}

module.exports = { TimerReader, listPorts, parseFrame, StateTracker };
