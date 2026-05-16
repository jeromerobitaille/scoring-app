const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("fwst", {
  isElectron: true,
  platform: process.platform,
  displays: {
    list: () => ipcRenderer.invoke("displays:list"),
  },
  openOnDisplay: (opts) => ipcRenderer.invoke("window:openOnDisplay", opts),
  closeWindow: () => ipcRenderer.invoke("window:closeSelf"),
});
