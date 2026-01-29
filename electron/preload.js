const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Recording
  startRecording: () => ipcRenderer.invoke('start-recording'),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  getRecordingState: () => ipcRenderer.invoke('get-recording-state'),
  
  // Transcription - convert ArrayBuffer to Uint8Array for IPC
  transcribeAudio: (audioBuffer) => {
    try {
      // Convert ArrayBuffer to Uint8Array for safe IPC transfer
      const uint8 = new Uint8Array(audioBuffer);
      console.log('Sending audio to main process, size:', uint8.length);
      return ipcRenderer.invoke('transcribe-audio', uint8);
    } catch (error) {
      console.error('transcribeAudio preload error:', error);
      return { success: false, text: '', error: error.message };
    }
  },
  
  // Paste
  pasteText: (text) => ipcRenderer.invoke('paste-text', text),
  
  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  
  // App info
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  
  // Whisper setup
  getWhisperStatus: () => ipcRenderer.invoke('get-whisper-status'),
  openWhisperFolder: () => ipcRenderer.invoke('open-whisper-folder'),
  downloadModel: (model) => ipcRenderer.invoke('download-model', model),
  listModels: () => ipcRenderer.invoke('list-models'),
  deleteModel: (modelId) => ipcRenderer.invoke('delete-model', modelId),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  
  // Event listeners
  onRecordingStarted: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('recording-started', handler);
    return () => ipcRenderer.removeListener('recording-started', handler);
  },
  onRecordingStopped: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('recording-stopped', handler);
    return () => ipcRenderer.removeListener('recording-stopped', handler);
  },
  onOverlayState: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('overlay-state', handler);
    return () => ipcRenderer.removeListener('overlay-state', handler);
  },
  onDownloadProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('download-progress', handler);
    return () => ipcRenderer.removeListener('download-progress', handler);
  }
});
