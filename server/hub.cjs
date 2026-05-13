const { WebSocketServer } = require("ws");

function attachHub(httpServer, path = "/live-score") {
  const wss = new WebSocketServer({ noServer: true });
  const rooms = new Map();
  const roomState = new Map();

  function joinRoom(ws, room) {
    if (!rooms.has(room)) rooms.set(room, new Set());
    rooms.get(room).add(ws);
    ws._room = room;
    if (roomState.has(room)) {
      ws.send(JSON.stringify({ type: "state:full", room, state: roomState.get(room) }));
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
      if (msg.type === "state:push" && msg.room && msg.state) {
        roomState.set(msg.room, msg.state);
        broadcast(msg.room, { type: "state:full", room: msg.room, state: msg.state }, ws);
        return;
      }
    });

    ws.on("close", () => leaveRoom(ws));
    ws.on("error", () => leaveRoom(ws));
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      try { ws.ping(); } catch {}
    });
  }, 30000);

  httpServer.on("close", () => clearInterval(interval));

  return wss;
}

module.exports = { attachHub };
