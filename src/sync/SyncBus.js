class SyncBus {
  constructor(channelName = "rodeo-scoring") {
    this.channelName = channelName;
    this.listeners = new Set();
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      this.bc = new BroadcastChannel(channelName);
      this.bc.onmessage = (ev) => this.emit(ev.data);
    } else if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === `${channelName}-event` && e.newValue) {
          try { this.emit(JSON.parse(e.newValue)); } catch {}
        }
      });
    }
  }

  post(data) {
    if (this.bc) this.bc.postMessage(data);
    try {
      localStorage.setItem(
        `${this.channelName}-event`,
        JSON.stringify({ ...data, _ts: Date.now() })
      );
    } catch {}
  }

  on(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  emit(data) {
    this.listeners.forEach((cb) => cb(data));
  }
}

export const bus = typeof window !== "undefined" ? new SyncBus() : null;
export default SyncBus;
