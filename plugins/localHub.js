import { createRequire } from "node:module";
import os from "node:os";

const require = createRequire(import.meta.url);
const { attachHub } = require("../server/hub.cjs");

function getLanAddresses() {
  const nets = os.networkInterfaces();
  const out = [];
  for (const name of Object.keys(nets)) {
    for (const ni of nets[name] || []) {
      if (ni.family === "IPv4" && !ni.internal) {
        out.push({ iface: name, address: ni.address });
      }
    }
  }
  return out;
}

export default function localHubPlugin(path = "/live-score") {
  return {
    name: "vite-local-hub",
    configureServer(server) {
      attachHub(server.httpServer, path);

      server.middlewares.use("/api/server-info", (req, res) => {
        const addr = server.httpServer.address();
        const port = typeof addr === "object" && addr ? addr.port : null;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify({ port, addresses: getLanAddresses() }));
      });
    },
  };
}
