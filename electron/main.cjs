const { app, BrowserWindow, Menu, shell, dialog } = require("electron");
const path = require("node:path");
const { autoUpdater } = require("electron-updater");
const { createServer } = require("../server/index.cjs");

const isDev = !app.isPackaged;
const DEFAULT_PORT = Number(process.env.FWST_PORT) || 5050;

let mainWindow = null;
let serverInfo = null;

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
  try {
    serverInfo = await createServer({ staticDir, port: DEFAULT_PORT });
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
  buildMenu();
  createWindow();
  setupAutoUpdate();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
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
