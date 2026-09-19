// Capture une page de l'app en PNG : npx electron tests/tools/capture.cjs <url> <w> <h> <out.png> [attente ms]
const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const [url, w, h, out, waitMs] = process.argv.slice(-5);
app.setPath("userData", require("node:path").join(require("node:os").tmpdir(), "fwst-capture-profile"));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: Number(w), height: Number(h), useContentSize: true, webPreferences: { backgroundThrottling: false } });
  await win.loadURL(url);
  await win.webContents.executeJavaScript("document.fonts.ready.then(() => true)");
  await new Promise((r) => setTimeout(r, Number(waitMs) || 1500));
  fs.writeFileSync(out, (await win.webContents.capturePage()).toPNG());
  console.log("écrit", out);
  app.quit();
});
