const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { attachHub } = require("./hub.cjs");
const { getLanAddresses } = require("./net.cjs");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".webp": "image/webp",
  ".ico":  "image/x-icon",
  ".otf":  "font/otf",
  ".ttf":  "font/ttf",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".map":  "application/json; charset=utf-8",
};

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const resolved = path.normalize(path.join(root, decoded));
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

function serveFile(res, filePath) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
    res.setHeader("Content-Length", stat.size);
    fs.createReadStream(filePath).pipe(res);
  });
}

const MEDIA_TYPES = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };
const MEDIA_MAX_BYTES = 25 * 1024 * 1024;

/** Reçoit une image (corps brut, Content-Type image/*) et l'enregistre dans mediaDir. */
function receiveMedia(req, res, mediaDir) {
  const type = String(req.headers["content-type"] || "").split(";")[0].trim();
  const ext = MEDIA_TYPES[type];
  if (!ext) { res.statusCode = 415; return res.end("Type d'image non pris en charge"); }
  const chunks = [];
  let size = 0;
  req.on("data", (c) => {
    size += c.length;
    if (size > MEDIA_MAX_BYTES) { res.statusCode = 413; res.end("Image trop volumineuse (25 Mo max)"); req.destroy(); return; }
    chunks.push(c);
  });
  req.on("end", () => {
    if (res.writableEnded) return;
    try {
      fs.mkdirSync(mediaDir, { recursive: true });
      const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      fs.writeFileSync(path.join(mediaDir, name), Buffer.concat(chunks));
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ url: `/media/${name}`, size }));
    } catch (err) {
      res.statusCode = 500;
      res.end(err.message);
    }
  });
}

function createServer({ staticDir, port = 5050, hubPath = "/live-score", store = null, mediaDir = null }) {
  const server = http.createServer((req, res) => {
    if (!req.url) { res.statusCode = 400; return res.end(); }

    // Images téléversées (infographies du canevas) : partagées par tous les écrans.
    if (mediaDir && req.url === "/api/media" && req.method === "POST") {
      return receiveMedia(req, res, mediaDir);
    }
    if (mediaDir && req.url.startsWith("/media/")) {
      const filePath = safeJoin(mediaDir, req.url.slice("/media".length));
      if (!filePath) { res.statusCode = 400; return res.end("Bad request"); }
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      return serveFile(res, filePath);
    }

    if (req.url === "/api/server-info") {
      const addr = server.address();
      const realPort = typeof addr === "object" && addr ? addr.port : port;
      const body = JSON.stringify({
        port: realPort,
        addresses: getLanAddresses(),
      });
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.end(body);
      return;
    }

    let urlPath = req.url.split("?")[0];
    if (urlPath === "/") urlPath = "/index.html";
    const filePath = safeJoin(staticDir, urlPath);
    if (!filePath) { res.statusCode = 400; return res.end("Bad request"); }

    fs.stat(filePath, (err, stat) => {
      if (!err && stat.isFile()) return serveFile(res, filePath);
      // SPA fallback
      serveFile(res, path.join(staticDir, "index.html"));
    });
  });

  const hub = attachHub(server, hubPath, store);

  return new Promise((resolve, reject) => {
    const tryListen = (p) => {
      server.once("error", (err) => {
        if (err.code === "EADDRINUSE" && p !== 0) {
          tryListen(0); // fallback: any available port
        } else {
          reject(err);
        }
      });
      server.listen(p, "0.0.0.0", () => {
        const addr = server.address();
        const actualPort = typeof addr === "object" && addr ? addr.port : p;
        resolve({
          server,
          port: actualPort,
          addresses: getLanAddresses(),
          publishTimer: hub.publishTimer,
        });
      });
    };
    tryListen(port);
  });
}

module.exports = { createServer };
