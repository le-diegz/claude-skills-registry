const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('skillsAPI', {
  getInstalledPlugins:  ()     => ipcRenderer.invoke('plugins:get-installed'),
  getKnownMarketplaces: ()     => ipcRenderer.invoke('plugins:get-marketplaces'),
  readSkillMeta:        (opts) => ipcRenderer.invoke('skill:read-meta', opts),
  checkGitHubUpdate:    (opts) => ipcRenderer.invoke('github:check-update', opts),
})
