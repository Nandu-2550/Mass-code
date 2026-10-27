const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Security & Mode Control
  setSecurityMode: (options) => ipcRenderer.invoke('security:set-mode', options),
  verifySupervisorKey: (options) => ipcRenderer.invoke('security:verify-supervisor-key', options),
  onWindowBlur: (callback) => ipcRenderer.on('window-blur-detected', (e, data) => callback(data)),
  onCompetitorCloseAttempted: (callback) => ipcRenderer.on('competitor-close-attempted', () => callback()),

  // Environment & Diagnostics
  getDiagnostics: () => ipcRenderer.invoke('env:get-diagnostics'),

  // Compiler Sandbox Engine
  compileAndEvaluate: (payload) => ipcRenderer.invoke('compiler:compile-and-evaluate', payload),
  onCompilerProgress: (callback) => ipcRenderer.on('compiler:progress', (e, data) => callback(data)),

  // Session & Submission Persistence
  saveSessionSnapshot: (data) => ipcRenderer.invoke('session:save-snapshot', data),
  loadSessionSnapshot: (options) => ipcRenderer.invoke('session:load-snapshot', options),
  saveFinalSubmission: (data) => ipcRenderer.invoke('submission:save-final', data),

  // Contest Management
  getDefaultContest: () => ipcRenderer.invoke('contest:get-default'),
  saveContestConfig: (config) => ipcRenderer.invoke('contest:save', config),
  exportContestDialog: (config) => ipcRenderer.invoke('contest:export-dialog', config),
  importContestDialog: () => ipcRenderer.invoke('contest:import-dialog'),

  // Host Server Controls
  startHostServer: (options) => ipcRenderer.invoke('server:start', options),
  stopHostServer: () => ipcRenderer.invoke('server:stop'),
  getHostServerStatus: () => ipcRenderer.invoke('server:get-status'),

  // Grading Leaderboard
  scanGradingFolder: (folder) => ipcRenderer.invoke('grading:scan-folder', folder),
  exportLeaderboardCsv: (options) => ipcRenderer.invoke('grading:export-csv', options),

  // LAN Remote Sync Bridge
  fetchRemoteContest: (options) => ipcRenderer.invoke('sync:fetch-remote-contest', options),
  pushSubmissionHttp: (options) => ipcRenderer.invoke('sync:push-submission', options)
});
