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
  cestina:   (rel)       => ipcRenderer.invoke('tmsfs:cestina', rel),
  dataRoot:  ()          => ipcRenderer.invoke('tmsfs:dataRoot')
});

// Cartella condivisa col telefono (2026-11-17): percorsi RELATIVI alla cartella scelta dall'utente
// col selettore di sistema; la scelta e i controlli stanno in main.js.
contextBridge.exposeInMainWorld('tmsScambio', {
  cartella: ()          => ipcRenderer.invoke('scambio:cartella'),
  scegli:   ()          => ipcRenderer.invoke('scambio:scegli'),
  scollega: ()          => ipcRenderer.invoke('scambio:scollega'),
  leggi:    (rel)       => ipcRenderer.invoke('scambio:leggi', rel),
  elenca:   (rel)       => ipcRenderer.invoke('scambio:elenca', rel),
  scrivi:   (rel, text) => ipcRenderer.invoke('scambio:scrivi', rel, text),
  togli:    (rel)       => ipcRenderer.invoke('scambio:togli', rel)
});

// Barra della finestra (2026-11-26): su Windows la pagina fa da barra del titolo e dice di che colore
// disegnare i pulsanti di sistema (seguono il tema dell'app)
contextBridge.exposeInMainWorld('tmsFinestra', {
  barra: process.platform === 'win32',
  colori: (color, symbolColor) => ipcRenderer.send('finestra:colori', String(color || ''), String(symbolColor || ''))
});

// File .tms aperto col doppio clic (2026-11-26): il main legge il file e lo passa alla pagina, che lo importa
contextBridge.exposeInMainWorld('tmsFile', {
  onApri: (cb) => ipcRenderer.on('tms-file', (_e, f) => { try { cb(f); } catch (err) {} }),
  chiedi: () => ipcRenderer.send('tms-file-chiedi')
});

// Aggiornamenti con l'interfaccia DELL'APP (dal v1.0.73): il main manda gli eventi
// dell'updater al renderer, che mostra il modale in stile pergamena e risponde.
contextBridge.exposeInMainWorld('tmsUpdate', {
  onEvento: (cb) => ipcRenderer.on('tms-update', (_e, dati) => { try { cb(dati); } catch (err) {} }),
  rispondi: (azione) => ipcRenderer.send('tms-update-azione', String(azione || ''))
});
