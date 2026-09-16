const { WebSocketServer } = require("ws");

function attachHub(httpServer, path = "/live-score", store = null) {
  const wss = new WebSocketServer({ noServer: true });
  const rooms = new Map();
  // État de chaque room, rechargé du disque au démarrage si un store est fourni.
  const roomState = new Map(Object.entries(store?.load() ?? {}));
  // Clients abonnés au chrono. Le temps défile à ~23 trames/s : il circule sur
  // ce canal à part au lieu de passer par l'état synchronisé (localStorage).
  const timerSubs = new Set();
  let lastTimer = { frame: null, status: null };

  function joinRoom(ws, room) {
    if (!rooms.has(room)) rooms.set(room, new Set());
    rooms.get(room).add(ws);
    ws._room = room;
    if (roomState.has(room)) {
      ws.send(JSON.stringify({ type: "state:full", room, state: roomState.get(room) }));
    } else {
      // Rien encore pour cette room : l'app de bureau peut l'amorcer avec ses données.
      ws.send(JSON.stringify({ type: "state:empty", room }));
    }
  }

  function leaveRoom(ws) {
    const room = ws._room;
    if (!room) return;
    const set = rooms.get(room);
    if (set) {
      set.delete(ws);
      if (set.size === 0) rooms.delete(room);
    }
    ws._room = null;
  }

  function broadcast(room, data, except) {
    const set = rooms.get(room);
    if (!set) return;
    const str = typeof data === "string" ? data : JSON.stringify(data);
    for (const client of set) {
      if (client !== except && client.readyState === 1) client.send(str);
    }
  }

  httpServer.on("upgrade", (req, socket, head) => {
    if (req.url !== path) return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws) => {
    ws.isAlive = true;
    ws.on("pong", () => (ws.isAlive = true));

    ws.on("message", (buf) => {
      let msg = null;
      try { msg = JSON.parse(buf.toString()); } catch { return; }

      if (msg.type === "join" && msg.room) {
        joinRoom(ws, msg.room);
        return;
      }
      if (msg.type === "timer:subscribe") {
        timerSubs.add(ws);
        if (lastTimer.status) ws.send(JSON.stringify({ type: "timer:status", ...lastTimer.status }));
        if (lastTimer.frame) ws.send(JSON.stringify({ type: "timer:frame", ...lastTimer.frame }));
        return;
      }
      if (msg.type === "state:push" && msg.room && msg.state) {
        roomState.set(msg.room, msg.state);
        store?.save(Object.fromEntries(roomState));
        broadcast(msg.room, { type: "state:full", room: msg.room, state: msg.state }, ws);
        return;
      }
    });

    ws.on("close", () => { leaveRoom(ws); timerSubs.delete(ws); });
    ws.on("error", () => { leaveRoom(ws); timerSubs.delete(ws); });
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      try { ws.ping(); } catch {}
    });
  }, 30000);

  httpServer.on("close", () => {
    clearInterval(interval);
    store?.flush();
  });

  function publishTimer(kind, payload) {
    if (kind === "frame") lastTimer.frame = payload;
    if (kind === "status") lastTimer.status = payload;
    const str = JSON.stringify({ type: `timer:${kind}`, ...payload });
    for (const client of timerSubs) {
      if (client.readyState === 1) client.send(str);
    }
  }

  return { wss, publishTimer };
}

module.exports = { attachHub };
