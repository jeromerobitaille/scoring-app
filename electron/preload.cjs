const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("fwst", {
  isElectron: true,
  platform: process.platform,
});
