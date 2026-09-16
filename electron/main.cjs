const { app, BrowserWindow, Menu, shell, dialog, ipcMain, screen } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { autoUpdater } = require("electron-updater");
const { createServer } = require("../server/index.cjs");
const { TimerReader, listPorts } = require("../server/timer.cjs");
const { createStore } = require("../server/persist.cjs");

const isDev = !app.isPackaged;
const DEFAULT_PORT = Number(process.env.FWST_PORT) || 5050;

let mainWindow = null;
let serverInfo = null;
let store = null;
const timer = new TimerReader();

function resolveStaticDir() {
  // In dev: <repo>/dist  (after `vite build`) — main.cjs lives at <repo>/electron
  // In prod packaged: extraResources copies dist/ next to the asar
  if (isDev) {
    return path.join(__dirname, "..", "dist");
  }
  return path.join(process.resourcesPath, "dist");
}

async function startServer() {
  const staticDir = resolveStaticDir();
  store = createStore(app.getPath("userData"));
  try {
    serverInfo = await createServer({ staticDir, port: DEFAULT_PORT, store });
    console.log(`[fwst-scoring] HTTP+WS listening on :${serverInfo.port}`);
  } catch (err) {
    console.error("[fwst-scoring] Failed to start server:", err);
    dialog.showErrorBox(
      "Démarrage impossible",
      `Le serveur local n'a pas pu démarrer.\n\n${err.message || err}`
    );
    app.exit(1);
  }
}

// ── Chrono FarmTek (USB-série) ────────────────────────────────
const TIMER_DEFAULTS = { enabled: true, port: "auto", baudRate: 9600 };

function timerConfigPath() {
  return path.join(app.getPath("userData"), "timer.json");
}

function loadTimerConfig() {
  try {
    const saved = JSON.parse(fs.readFileSync(timerConfigPath(), "utf8"));
    return sanitizeTimerConfig(saved);
  } catch {
    return { ...TIMER_DEFAULTS };
  }
}

function sanitizeTimerConfig(src) {
  const baudRate = Number(src?.baudRate);
  return {
    enabled: src?.enabled ?? TIMER_DEFAULTS.enabled,
    port: typeof src?.port === "string" && src.port ? src.port : TIMER_DEFAULTS.port,
    baudRate: Number.isInteger(baudRate) && baudRate > 0 ? baudRate : TIMER_DEFAULTS.baudRate,
  };
}

function startTimer() {
  timer.on("frame", (frame) => serverInfo?.publishTimer("frame", frame));
  timer.on("status", (status) => {
    serverInfo?.publishTimer("status", { ...status, config: timer.config });
  });
  timer.start(loadTimerConfig());
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#0a0a0a",
    title: "FWST Scoring",
    icon: process.platform === "linux"
      ? path.join(__dirname, "..", "build", "icon.png")
      : undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  const url = `http://127.0.0.1:${serverInfo.port}/?net=1&room=default`;
  mainWindow.loadURL(url);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // External links open in default browser
    if (url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost")) {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Safety net: on macOS a native modal (or a native <select> popup) can leave
  // the window looking focused while the web contents no longer holds the OS
  // key focus — keystrokes then go nowhere and the app looks frozen for input.
  // Re-asserting focus on the web contents whenever the window is activated
  // makes that state recoverable without restarting the app.
  mainWindow.on("focus", () => {
    try { mainWindow.webContents.focus(); } catch {}
  });
  mainWindow.on("show", () => {
    try { mainWindow.webContents.focus(); } catch {}
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

function buildMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    }] : []),
    {
      label: "Fichier",
      submenu: [isMac ? { role: "close" } : { role: "quit" }],
    },
    {
      label: "Édition",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "Affichage",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Fenêtre",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac ? [
          { type: "separator" },
          { role: "front" },
        ] : [
          { role: "close" },
        ]),
      ],
    },
    {
      role: "help",
      submenu: [
        {
          label: "Ouvrir dans le navigateur",
          click: () => {
            if (serverInfo) {
              shell.openExternal(`http://127.0.0.1:${serverInfo.port}/?net=1&room=default`);
            }
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Track auxiliary fullscreen windows so they can be closed on quit
const auxWindows = new Set();

function describeDisplay(d, idx, primaryId) {
  const isPrimary = d.id === primaryId;
  const dim = `${d.bounds.width}×${d.bounds.height}`;
  const name = d.label || (isPrimary ? "Écran principal" : `Écran ${idx + 1}`);
  return {
    id: d.id,
    label: `${name} — ${dim}${isPrimary ? " (principal)" : ""}`,
    bounds: d.bounds,
    workArea: d.workArea,
    isPrimary,
    scaleFactor: d.scaleFactor,
  };
}

function setupIpc() {
  ipcMain.handle("displays:list", () => {
    const all = screen.getAllDisplays();
    const primaryId = screen.getPrimaryDisplay().id;
    return all.map((d, i) => describeDisplay(d, i, primaryId));
  });

  ipcMain.handle("window:openOnDisplay", (_event, args) => {
    if (!serverInfo) return { ok: false, error: "server-not-ready" };
    const { url, displayId } = args || {};
    if (!url) return { ok: false, error: "missing-url" };

    const all = screen.getAllDisplays();
    const target = all.find((d) => d.id === displayId) || screen.getPrimaryDisplay();

    const finalUrl = url.includes("fs=") ? url : `${url}${url.includes("?") ? "&" : "?"}fs=1`;

    const win = new BrowserWindow({
      x: target.bounds.x,
      y: target.bounds.y,
      width: target.bounds.width,
      height: target.bounds.height,
      frame: false,
      fullscreen: true,
      backgroundColor: "#000000",
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        preload: path.join(__dirname, "preload.cjs"),
      },
    });

    win.setMenuBarVisibility(false);
    win.loadURL(finalUrl);
    auxWindows.add(win);
    win.on("closed", () => auxWindows.delete(win));

    return { ok: true, displayId: target.id };
  });

  ipcMain.handle("timer:listPorts", () => listPorts());
  ipcMain.handle("timer:getConfig", () => ({ config: timer.config, status: timer.status }));
  ipcMain.handle("timer:setConfig", (_event, next) => {
    const config = sanitizeTimerConfig({ ...timer.config, ...next });
    try {
      fs.writeFileSync(timerConfigPath(), JSON.stringify(config, null, 2));
    } catch (err) {
      console.error("[timer] config non enregistrée :", err.message);
    }
    timer.start(config);
    return { config: timer.config, status: timer.status };
  });

  // ── Sauvegardes ──────────────────────────────────────────────
  // Les dialogues natifs prennent le focus clavier du système : on le rend à la
  // page ensuite (même précaution que pour les dialogues de mise à jour).
  const refocus = (event) => {
    try { event.sender.focus(); } catch { /* fenêtre fermée */ }
  };

  ipcMain.handle("backup:export", async (event, { json, defaultName }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: "Exporter une sauvegarde",
      defaultPath: path.join(app.getPath("documents"), defaultName || "fwst-sauvegarde.json"),
      filters: [{ name: "Sauvegarde FWST", extensions: ["json"] }],
    });
    refocus(event);
    if (canceled || !filePath) return { ok: false, canceled: true };
    try {
      fs.writeFileSync(filePath, json);
      return { ok: true, path: filePath };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("backup:import", async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: "Importer une sauvegarde",
      defaultPath: app.getPath("documents"),
      filters: [{ name: "Sauvegarde FWST", extensions: ["json"] }],
      properties: ["openFile"],
    });
    refocus(event);
    if (canceled || !filePaths?.[0]) return { ok: false, canceled: true };
    try {
      return { ok: true, text: fs.readFileSync(filePaths[0], "utf8"), path: filePaths[0] };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("backup:list", () => store?.listBackups() ?? []);
  ipcMain.handle("backup:read", (_event, name) => {
    try {
      return { ok: true, text: store.readBackup(name) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle("backup:reveal", async () => {
    if (!store) return { ok: false };
    fs.mkdirSync(store.backupDir, { recursive: true });
    const error = await shell.openPath(store.backupDir);
    return { ok: !error, error };
  });

  ipcMain.handle("window:closeSelf", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && win !== mainWindow) win.close();
    return { ok: true };
  });
}

function setupAutoUpdate() {
  if (isDev) return;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", async (info) => {
    if (!mainWindow) return;
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Mise à jour disponible",
      message: `FWST Scoring ${info.version} est disponible.`,
      detail: "Voulez-vous la télécharger maintenant ? Le téléchargement se fait en arrière-plan et n'interrompra pas votre travail.",
      buttons: ["Télécharger", "Plus tard"],
      defaultId: 0,
      cancelId: 1,
    });
    try { mainWindow.webContents.focus(); } catch {}
    if (response === 0) {
      autoUpdater.downloadUpdate().catch((err) => {
        console.error("[fwst-scoring] downloadUpdate failed:", err);
      });
    }
  });

  autoUpdater.on("update-downloaded", async () => {
    if (!mainWindow) return;
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Mise à jour prête",
      message: "La mise à jour a été téléchargée.",
      detail: "Redémarrer maintenant pour l'installer ? Sinon, elle s'installera au prochain démarrage.",
      buttons: ["Redémarrer maintenant", "Plus tard"],
      defaultId: 0,
      cancelId: 1,
    });
    try { mainWindow.webContents.focus(); } catch {}
    if (response === 0) autoUpdater.quitAndInstall();
  });

  autoUpdater.on("error", (err) => {
    console.error("[fwst-scoring] Auto-update error:", err?.message || err);
  });

  autoUpdater.checkForUpdates().catch((err) => {
    console.error("[fwst-scoring] checkForUpdates failed:", err?.message || err);
  });
}

app.whenReady().then(async () => {
  await startServer();
  startTimer();
  setupIpc();
  buildMenu();
  createWindow();
  setupAutoUpdate();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  timer.stop();
  store?.flush();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Single instance lock — second launch focuses existing window
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
