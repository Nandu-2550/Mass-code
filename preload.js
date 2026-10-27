const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Environment Diagnostics
  getDiagnostics: () => ipcRenderer.invoke('env:get-diagnostics'),

  // Lockdown & Cheating Protection
  setLockdownMode: (options) => ipcRenderer.invoke('window:set-lockdown', options),
  onWindowBlur: (callback) => {
    ipcRenderer.on('window-blur-detected', (event, data) => callback(data));
  },
  onWindowFocus: (callback) => {
    ipcRenderer.on('window-focus-detected', (event, data) => callback(data));
  },
  onLockdownCloseAttempted: (callback) => {
    ipcRenderer.on('lockdown-close-attempted', () => callback());
  },

  // Sandbox Compiler & Test Stream
  compileAndEvaluate: (payload) => ipcRenderer.invoke('compiler:compile-and-evaluate', payload),
  onCompilerProgress: (callback) => {
    ipcRenderer.on('compiler:progress-stream', (event, data) => callback(data));
  },

  // Crash Recovery & Snapshots
  saveSessionSnapshot: (data) => ipcRenderer.invoke('session:save-snapshot', data),
  loadSessionSnapshot: (options) => ipcRenderer.invoke('session:load-snapshot', options),
  saveFinalSubmission: (data) => ipcRenderer.invoke('submission:save-final', data),

  // Contest Management & Persistence
  getSampleContest: () => ipcRenderer.invoke('contest:get-sample-contest'),
  saveContestConfig: (config) => ipcRenderer.invoke('contest:save-config', config),
  exportContestDialog: (config) => ipcRenderer.invoke('contest:export-dialog', config),
  importContestDialog: () => ipcRenderer.invoke('contest:import-dialog'),

  // Host HTTP Server
  startServer: (options) => ipcRenderer.invoke('server:start', options),
  stopServer: () => ipcRenderer.invoke('server:stop'),
  getServerStatus: () => ipcRenderer.invoke('server:get-status'),

  // Grading & Leaderboard
  scanGradingFolder: (customFolder) => ipcRenderer.invoke('grading:scan-folder', customFolder),
  exportLeaderboardCsv: (options) => ipcRenderer.invoke('grading:export-csv', options),
  pickGradingFolder: () => ipcRenderer.invoke('grading:pick-folder'),

  // Network Sync Bridge
  pushSubmissionHttp: (options) => ipcRenderer.invoke('sync:push-submission', options),
  fetchRemoteContest: (options) => ipcRenderer.invoke('sync:fetch-remote-contest', options),
  getPendingSubmissions: () => ipcRenderer.invoke('sync:get-pending-submissions')
});
