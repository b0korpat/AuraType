const { app, BrowserWindow, globalShortcut, ipcMain, clipboard, screen } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const https = require('https');
const os = require('os');

// Keep references to windows
let mainWindow = null;
let overlayWindow = null;
let isRecording = false;

// Paths
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Whisper configuration
let whisperReady = false;
let currentModel = 'base';

// Settings
let settings = {
  transcriptionMode: 'groq', // 'local' or 'groq'
  groqApiKey: '',
  language: 'auto'
};

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings() {
  try {
    const settingsPath = getSettingsPath();
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      settings = { ...settings, ...JSON.parse(data) };
      console.log('Settings loaded:', { ...settings, groqApiKey: settings.groqApiKey ? '***' : '' });
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

function saveSettings() {
  try {
    const settingsPath = getSettingsPath();
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    console.log('Settings saved');
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

function getWhisperDir() {
  return path.join(app.getPath('userData'), 'whisper');
}

function getModelPath(model = 'base') {
  return path.join(getWhisperDir(), 'models', `ggml-${model}.bin`);
}

function getWhisperExePath() {
  const whisperDir = getWhisperDir();
  // Try whisper-cli.exe first (new name), fallback to main.exe (deprecated)
  const cliPath = path.join(whisperDir, 'bin', 'whisper-cli.exe');
  const mainPath = path.join(whisperDir, 'bin', 'main.exe');
  
  if (fs.existsSync(cliPath)) {
    return cliPath;
  }
  return mainPath;
}

async function initWhisper() {
  const whisperDir = getWhisperDir();
  const modelsDir = path.join(whisperDir, 'models');
  const binDir = path.join(whisperDir, 'bin');

  // Create directories
  [modelsDir, binDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Check if whisper binary exists
  const whisperExe = getWhisperExePath();
  
  // Auto-detect available models (prefer larger/better ones)
  const modelPriority = ['large-v3-turbo', 'large-v3', 'large', 'medium', 'small', 'base', 'tiny'];
  let foundModel = null;
  
  for (const model of modelPriority) {
    const modelPath = getModelPath(model);
    if (fs.existsSync(modelPath)) {
      foundModel = model;
      break;
    }
  }
  
  if (foundModel) {
    currentModel = foundModel;
  }

  console.log('Checking Whisper setup...');
  console.log('  Whisper exe:', whisperExe, '- exists:', fs.existsSync(whisperExe));
  console.log('  Model:', currentModel, '- exists:', foundModel !== null);

  if (fs.existsSync(whisperExe) && foundModel) {
    whisperReady = true;
    console.log('Whisper is ready! Using model:', currentModel);
  } else {
    whisperReady = false;
    console.log('Whisper not ready. Please complete setup.');
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    frame: false,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Grant microphone permissions
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    return permission === 'media';
  });

  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    return callback(permission === 'media');
  });

  // Handle renderer crashes
  mainWindow.webContents.on('crashed', (event) => {
    console.error('Renderer crashed!', event);
  });

  mainWindow.webContents.on('unresponsive', () => {
    console.error('Window unresponsive');
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Render process gone:', details);
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Force app to quit when main window is closed, destroying overlay
    app.quit();
  });
}

function createOverlayWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  overlayWindow = new BrowserWindow({
    width: 300,
    height: 80,
    x: Math.round((width - 300) / 2),
    y: height - 120,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  overlayWindow.setIgnoreMouseEvents(true);
  
  if (isDev) {
    overlayWindow.loadURL('http://localhost:5173/overlay.html');
  } else {
    overlayWindow.loadFile(path.join(__dirname, '../dist/overlay.html'));
  }

  overlayWindow.hide();
}

function showOverlay() {
  if (overlayWindow) {
    overlayWindow.show();
    overlayWindow.webContents.send('overlay-state', { state: 'recording' });
  }
}

function setOverlayProcessing() {
  if (overlayWindow) {
    overlayWindow.webContents.send('overlay-state', { state: 'processing' });
  }
}

function hideOverlay() {
  if (overlayWindow) {
    overlayWindow.webContents.send('overlay-state', { state: 'hidden' });
    setTimeout(() => {
      if (overlayWindow) overlayWindow.hide();
    }, 300);
  }
}

function registerShortcuts() {
  // Use Ctrl+Alt+R for toggle recording (most reliable)
  // And also register Ctrl+` (backtick) as alternative
  
  const shortcuts = [
    'CommandOrControl+Alt+R',
    'CommandOrControl+Shift+Space',
  ];
  
  let registered = false;
  
  for (const shortcut of shortcuts) {
    try {
      const success = globalShortcut.register(shortcut, () => {
        toggleRecording();
      });
      
      if (success) {
        console.log('Shortcut registered:', shortcut);
        registered = true;
        break;
      }
    } catch (e) {
      console.log('Failed to register shortcut:', shortcut, e.message);
    }
  }
  
  if (!registered) {
    console.error('No shortcuts could be registered!');
  }
}

function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

function startRecording() {
  if (isRecording) return;
  
  isRecording = true;
  showOverlay();
  console.log('Recording started');
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('recording-started');
  }
}

function stopRecording() {
  if (!isRecording) return;
  
  isRecording = false;
  setOverlayProcessing(); // Show processing state instead of hiding immediately
  console.log('Recording stopped');
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('recording-stopped');
  }
}

// Transcribe audio using Groq API (ultra-fast cloud)
async function transcribeWithGroq(wavBuffer) {
  console.log('Transcribing with Groq API...');
  
  if (!settings.groqApiKey) {
    return { success: false, text: '', error: 'Groq API key not set. Go to Settings to add your key.' };
  }

  const tempDir = os.tmpdir();
  const wavPath = path.join(tempDir, `voiceflow-groq-${Date.now()}.wav`);
  
  try {
    // Write WAV file temporarily
    fs.writeFileSync(wavPath, wavBuffer);
    
    // Read file for upload
    const fileData = fs.readFileSync(wavPath);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    
    // Build multipart form data
    const fileName = 'audio.wav';
    let body = '';
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    body += `Content-Type: audio/wav\r\n\r\n`;
    
    const bodyStart = Buffer.from(body, 'utf-8');
    
    // Only add language if not 'auto'
    let languagePart = '';
    if (settings.language && settings.language !== 'auto') {
      languagePart = `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${settings.language}\r\n`;
    }
    
    const bodyEnd = Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-large-v3\r\n${languagePart}--${boundary}--\r\n`, 'utf-8');
    
    const fullBody = Buffer.concat([bodyStart, fileData, bodyEnd]);

    return new Promise((resolve) => {
      const options = {
        hostname: 'api.groq.com',
        port: 443,
        path: '/openai/v1/audio/transcriptions',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.groqApiKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': fullBody.length
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          // Clean up temp file
          try { fs.unlinkSync(wavPath); } catch (e) {}
          
          console.log('Groq response status:', res.statusCode);
          console.log('Groq response:', data);
          
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              resolve({ success: true, text: json.text || '' });
            } catch (e) {
              resolve({ success: false, text: '', error: 'Failed to parse Groq response' });
            }
          } else {
            let errorMsg = `Groq API error (${res.statusCode})`;
            try {
              const json = JSON.parse(data);
              errorMsg = json.error?.message || errorMsg;
            } catch (e) {}
            resolve({ success: false, text: '', error: errorMsg });
          }
        });
      });

      req.on('error', (err) => {
        try { fs.unlinkSync(wavPath); } catch (e) {}
        console.error('Groq request error:', err);
        resolve({ success: false, text: '', error: err.message });
      });

      req.write(fullBody);
      req.end();
    });
  } catch (error) {
    try { fs.unlinkSync(wavPath); } catch (e) {}
    console.error('Groq transcription error:', error);
    return { success: false, text: '', error: error.message };
  }
}

// Transcribe audio using Whisper.cpp (local)
async function transcribeAudio(wavData) {
  console.log('transcribeAudio called');
  console.log('  Data type:', Object.prototype.toString.call(wavData));
  console.log('  Data length:', wavData?.length || wavData?.byteLength || 0);
  
  // Handle both Uint8Array and ArrayBuffer
  let buffer;
  if (wavData instanceof Uint8Array) {
    buffer = Buffer.from(wavData);
  } else if (wavData instanceof ArrayBuffer) {
    buffer = Buffer.from(wavData);
  } else if (Buffer.isBuffer(wavData)) {
    buffer = wavData;
  } else {
    console.log('Unknown data type');
    return { success: false, text: '', error: 'Invalid audio data type' };
  }
  
  if (!buffer || buffer.length === 0) {
    console.log('Empty audio buffer received');
    return { success: false, text: '', error: 'No audio data received' };
  }

  console.log('Buffer size:', buffer.length);

  if (!whisperReady) {
    console.log('Whisper not ready');
    return {
      success: false,
      text: '',
      error: 'Whisper not initialized. Please complete setup first.',
      needsSetup: true
    };
  }

  const tempDir = os.tmpdir();
  const wavPath = path.join(tempDir, `voiceflow-${Date.now()}.wav`);
  const outputBase = path.join(tempDir, `voiceflow-out-${Date.now()}`);

  try {
    // Write WAV file
    console.log('Writing WAV file to:', wavPath);
    fs.writeFileSync(wavPath, buffer);
    console.log('WAV file written, size:', fs.statSync(wavPath).size);

    // Run whisper
    const whisperExe = getWhisperExePath();
    const modelPath = getModelPath(currentModel);

    console.log('Running Whisper...');
    console.log('  Exe:', whisperExe);
    console.log('  Model:', modelPath);
    console.log('  Input:', wavPath);

    return new Promise((resolve) => {
      const args = [
        '-m', modelPath,
        '-f', wavPath,
        '-otxt',
        '-of', outputBase,
        '-l', 'auto',  // Auto-detect language (supports Hungarian, English, etc.)
        '-nt' // no timestamps
      ];

      console.log('Whisper args:', args.join(' '));

      const proc = spawn(whisperExe, args);

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log('Whisper stdout:', data.toString());
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log('Whisper stderr:', data.toString());
      });

      proc.on('close', (code) => {
        console.log('Whisper exited with code:', code);
        
        // Clean up input file
        try { fs.unlinkSync(wavPath); } catch (e) {}

        if (code === 0) {
          const txtPath = outputBase + '.txt';
          console.log('Looking for output at:', txtPath);
          
          if (fs.existsSync(txtPath)) {
            const text = fs.readFileSync(txtPath, 'utf-8').trim();
            // console.log('Transcription result:', text); // Privacy: Don't log full text
            try { fs.unlinkSync(txtPath); } catch (e) {}
            resolve({ success: true, text });
          } else {
            console.log('Output file not found');
            resolve({ success: false, text: '', error: 'Output file not created' });
          }
        } else {
          console.log('Whisper failed:', stderr);
          resolve({ success: false, text: '', error: stderr || 'Whisper process failed' });
        }
      });

      proc.on('error', (err) => {
        console.log('Whisper spawn error:', err);
        try { fs.unlinkSync(wavPath); } catch (e) {}
        resolve({ success: false, text: '', error: err.message });
      });
    });
  } catch (error) {
    console.log('Transcription error:', error);
    try { fs.unlinkSync(wavPath); } catch (e) {}
    return { success: false, text: '', error: error.message };
  }
}

// IPC Handlers
ipcMain.handle('get-recording-state', () => isRecording);

ipcMain.handle('start-recording', () => {
  startRecording();
  return true;
});

ipcMain.handle('stop-recording', () => {
  stopRecording();
  return true;
});

ipcMain.handle('paste-text', async (event, text) => {
  // console.log('Pasting text:', text); // Privacy: Don't log full text
  
  // 1. Backup current clipboard
  const clipboardBackup = {
    text: clipboard.readText(),
    html: clipboard.readHTML(),
    image: clipboard.readImage(),
    rtf: clipboard.readRTF(),
    bookmark: clipboard.readBookmark(),
  };

  // 2. Write new text
  clipboard.writeText(text);
  
  // 3. Paste (Simulate Ctrl+V)
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        const ps = spawn('powershell', [
          '-Command',
          `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')`
        ], { windowsHide: true });
        
        ps.on('close', () => {
          console.log('Paste completed');
          hideOverlay();
          
          // 4. Restore original clipboard (after small delay to ensure paste finished)
          setTimeout(() => {
            console.log('Restoring clipboard...');
            if (!clipboardBackup.image.isEmpty()) {
              clipboard.writeImage(clipboardBackup.image);
            } else if (clipboardBackup.html) {
              clipboard.writeHTML(clipboardBackup.html);
            } else if (clipboardBackup.rtf) {
              clipboard.writeRTF(clipboardBackup.rtf);
            } else if (clipboardBackup.bookmark) {
              clipboard.writeBookmark(clipboardBackup.bookmark.title, clipboardBackup.bookmark.url);
            } else {
              clipboard.writeText(clipboardBackup.text);
            }
          }, 500); // 500ms delay to be safe

          resolve(true);
        });
        
        ps.on('error', (err) => {
          console.log('Paste error:', err);
          hideOverlay();
          resolve(false);
        });
      } catch (e) {
        console.error('Paste error:', e);
        hideOverlay();
        resolve(false);
      }
    }, 150);
  });
});

ipcMain.handle('transcribe-audio', async (event, audioData) => {
  try {
    console.log('transcribe-audio IPC received');
    console.log('  Type:', Object.prototype.toString.call(audioData));
    console.log('  Length:', audioData?.length || audioData?.byteLength || 0);
    console.log('  Mode:', settings.transcriptionMode);
    
    // Convert to buffer
    let buffer;
    if (audioData instanceof Uint8Array) {
      buffer = Buffer.from(audioData);
    } else if (audioData instanceof ArrayBuffer) {
      buffer = Buffer.from(audioData);
    } else if (Buffer.isBuffer(audioData)) {
      buffer = audioData;
    } else {
      return { success: false, text: '', error: 'Invalid audio data type' };
    }
    
    // Use Groq or local based on settings
    if (settings.transcriptionMode === 'groq') {
      return await transcribeWithGroq(buffer);
    } else {
      return await transcribeAudio(audioData);
    }
  } catch (error) {
    console.error('transcribe-audio IPC error:', error);
    return { success: false, text: '', error: error.message };
  }
});

ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('get-app-path', () => {
  return app.getPath('userData');
});

ipcMain.handle('get-whisper-status', () => {
  return {
    ready: whisperReady,
    model: currentModel,
    whisperDir: getWhisperDir(),
    modelPath: getModelPath(currentModel),
    exePath: getWhisperExePath()
  };
});

// Settings handlers
ipcMain.handle('get-settings', () => {
  return {
    transcriptionMode: settings.transcriptionMode,
    groqApiKey: settings.groqApiKey,
    language: settings.language,
    hasGroqKey: !!settings.groqApiKey
  };
});

ipcMain.handle('save-settings', (event, newSettings) => {
  settings = { ...settings, ...newSettings };
  saveSettings();
  return { success: true };
});

ipcMain.handle('open-external', (event, url) => {
  require('electron').shell.openExternal(url);
});

ipcMain.handle('copy-to-clipboard', (event, text) => {
  clipboard.writeText(text);
  return true;
});

ipcMain.handle('open-whisper-folder', () => {
  const whisperDir = getWhisperDir();
  if (!fs.existsSync(whisperDir)) {
    fs.mkdirSync(whisperDir, { recursive: true });
  }
  require('electron').shell.openPath(whisperDir);
});

// Download Whisper model
// List installed models
ipcMain.handle('list-models', async () => {
  const modelsDir = path.join(getWhisperDir(), 'models');
  
  if (!fs.existsSync(modelsDir)) {
    return [];
  }
  
  try {
    const files = fs.readdirSync(modelsDir);
    const models = files
      .filter(f => f.startsWith('ggml-') && f.endsWith('.bin'))
      .map(f => {
        const modelId = f.replace('ggml-', '').replace('.bin', '');
        const filePath = path.join(modelsDir, f);
        const stats = fs.statSync(filePath);
        return {
          id: modelId,
          filename: f,
          path: filePath,
          size: stats.size,
          sizeFormatted: formatBytes(stats.size)
        };
      });
    return models;
  } catch (e) {
    console.error('Error listing models:', e);
    return [];
  }
});

// Delete a model
ipcMain.handle('delete-model', async (event, modelId) => {
  const modelPath = getModelPath(modelId);
  
  if (!fs.existsSync(modelPath)) {
    return { success: false, error: 'Model not found' };
  }
  
  try {
    fs.unlinkSync(modelPath);
    // Re-check whisper status
    await initWhisper();
    return { success: true };
  } catch (e) {
    console.error('Error deleting model:', e);
    return { success: false, error: e.message };
  }
});

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

ipcMain.handle('download-model', async (event, model = 'base') => {
  // Different models are hosted in different locations
  let modelUrl;
  if (model === 'large-v3-turbo' || model === 'large-v3-turbo-q5_0') {
    // Large-v3-turbo is hosted separately
    modelUrl = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${model}.bin`;
  } else {
    modelUrl = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${model}.bin`;
  }
  
  const modelPath = getModelPath(model);
  const modelsDir = path.dirname(modelPath);

  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }

  console.log('Downloading model:', model, 'to:', modelPath);

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(modelPath);
    
    const download = (url) => {
      https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          download(response.headers.location);
          return;
        }

        const total = parseInt(response.headers['content-length'], 10);
        let downloaded = 0;

        response.on('data', (chunk) => {
          downloaded += chunk.length;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-progress', {
              downloaded,
              total,
              percent: Math.round((downloaded / total) * 100)
            });
          }
        });

        response.pipe(file);
        file.on('finish', () => {
          file.close();
          currentModel = model;
          initWhisper();
          console.log('Model downloaded successfully');
          resolve({ success: true, path: modelPath });
        });
      }).on('error', (err) => {
        fs.unlink(modelPath, () => {});
        reject(err);
      });
    };

    download(modelUrl);
  });
});

// App lifecycle
app.whenReady().then(async () => {
  loadSettings();
  await initWhisper();
  createMainWindow();
  createOverlayWindow();
  registerShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.destroy();
  }
  globalShortcut.unregisterAll();
});
