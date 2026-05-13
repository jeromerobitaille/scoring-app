export default class LocalSocket {
  constructor(url, roomId) {
    this.url = url;       // ex: ws(s)://<host>/live-score
    this.roomId = roomId; // ex: sttite-2025
    this.ws = null;
    this.listeners = new Set();
    this.statusListeners = new Set();
    this._reconnectTimer = null;
    this._closedByUser = false;
    this._lastSentJSON = null;
    this._status = "idle"; // idle | connecting | open | closed
  }
  _setStatus(s) {
    if (this._status === s) return;
    this._status = s;
    this.statusListeners.forEach((cb) => { try { cb(s); } catch {} });
  }
  get status() { return this._status; }

  connect() {
    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) return;
    this._setStatus("connecting");
    this.ws = new WebSocket(this.url);

    this.ws.addEventListener("open", () => {
      this._setStatus("open");
      this.send({ type: "join", room: this.roomId });
    });

    this.ws.addEventListener("message", (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "state:full" && msg.room === this.roomId && msg.state) {
          this.listeners.forEach((cb) => cb(msg.state));
        }
      } catch {}
    });

    this.ws.addEventListener("close", () => {
      this._setStatus("closed");
      if (this._closedByUser) return;
      this.scheduleReconnect();
    });
    this.ws.addEventListener("error", () => {
      this._setStatus("closed");
      if (this._closedByUser) return;
      this.scheduleReconnect();
    });
  }
  scheduleReconnect() {
    clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(() => this.connect(), 1000);
  }
  on(cb) { this.listeners.add(cb); return () => this.listeners.delete(cb); }
  onStatus(cb) { this.statusListeners.add(cb); cb(this._status); return () => this.statusListeners.delete(cb); }
  send(obj) { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(obj)); }
  push(state) {
    const json = JSON.stringify(state);
    if (json === this._lastSentJSON) return;
    this._lastSentJSON = json;
    this.send({ type: "state:push", room: this.roomId, state });
  }
  close() {
    this._closedByUser = true;
    clearTimeout(this._reconnectTimer);
    try { this.ws?.close(); } catch {}
  }
}
