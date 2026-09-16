const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("fwst", {
  isElectron: true,
  platform: process.platform,
  displays: {
    list: () => ipcRenderer.invoke("displays:list"),
  },
  openOnDisplay: (opts) => ipcRenderer.invoke("window:openOnDisplay", opts),
  closeWindow: () => ipcRenderer.invoke("window:closeSelf"),
  backup: {
    exportFile: (json, defaultName) => ipcRenderer.invoke("backup:export", { json, defaultName }),
    importFile: () => ipcRenderer.invoke("backup:import"),
    list: () => ipcRenderer.invoke("backup:list"),
    read: (name) => ipcRenderer.invoke("backup:read", name),
    reveal: () => ipcRenderer.invoke("backup:reveal"),
  },
  timer: {
    listPorts: () => ipcRenderer.invoke("timer:listPorts"),
    getConfig: () => ipcRenderer.invoke("timer:getConfig"),
    setConfig: (config) => ipcRenderer.invoke("timer:setConfig", config),
  },
});
