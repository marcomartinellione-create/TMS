// Ponte dati locali (modalità desktop senza cartella collegata) — Piano B HANDOFF §8
// Espone window.tmsFS al renderer: l'app lo usa tramite lo shim localDirHandle()
// (stessa interfaccia degli handle File System Access). Percorsi relativi alla
// radice dati TMS; la risoluzione (userData + seed dell'installer) sta in main.js.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tmsFS', {
  exists:    (rel)       => ipcRenderer.invoke('tmsfs:exists', rel),
  readFile:  (rel)       => ipcRenderer.invoke('tmsfs:readFile', rel),
  writeFile: (rel, text) => ipcRenderer.invoke('tmsfs:writeFile', rel, text),
  mkdir:     (rel)       => ipcRenderer.invoke('tmsfs:mkdir', rel),
  remove:    (rel)       => ipcRenderer.invoke('tmsfs:remove', rel),
  dataRoot:  ()          => ipcRenderer.invoke('tmsfs:dataRoot')
});
