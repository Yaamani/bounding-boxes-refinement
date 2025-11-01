import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  selectImageFolder: () => ipcRenderer.invoke('select-image-folder'),
  selectJsonFolders: () => ipcRenderer.invoke('select-json-folders'),
  selectSaveFile: () => ipcRenderer.invoke('select-save-file'),
  selectOpenFile: () => ipcRenderer.invoke('select-open-file'),
  readDirectory: (dirPath: string) => ipcRenderer.invoke('read-directory', dirPath),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('write-file', filePath, content),
  pathJoin: (...paths: string[]) => ipcRenderer.invoke('path-join', ...paths),
  pathResolve: (...paths: string[]) => ipcRenderer.invoke('path-resolve', ...paths),
  pathDirname: (filePath: string) => ipcRenderer.invoke('path-dirname', filePath)
});
