const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { app } = require('electron');

class WhisperService {
  constructor() {
    this.modelsPath = path.join(app.getPath('userData'), 'whisper-models');
    this.binPath = path.join(app.getPath('userData'), 'whisper-bin');
    this.currentModel = 'base';
    this.isInitialized = false;
  }

  async initialize() {
    // Create directories
    if (!fs.existsSync(this.modelsPath)) {
      fs.mkdirSync(this.modelsPath, { recursive: true });
    }
    if (!fs.existsSync(this.binPath)) {
      fs.mkdirSync(this.binPath, { recursive: true });
    }

    // Check if whisper binary exists
    const whisperExe = this.getWhisperPath();
    if (!fs.existsSync(whisperExe)) {
      console.log('Whisper binary not found. Please download it.');
      return false;
    }

    // Check if model exists
    const modelPath = this.getModelPath(this.currentModel);
    if (!fs.existsSync(modelPath)) {
      console.log('Whisper model not found. Please download it.');
      return false;
    }

    this.isInitialized = true;
    return true;
  }

  getWhisperPath() {
    return path.join(this.binPath, 'whisper.exe');
  }

  getModelPath(model) {
    return path.join(this.modelsPath, `ggml-${model}.bin`);
  }

  async downloadModel(model = 'base', onProgress = () => {}) {
    const modelUrl = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${model}.bin`;
    const modelPath = this.getModelPath(model);

    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(modelPath);
      
      https.get(modelUrl, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Follow redirect
          https.get(response.headers.location, (redirectResponse) => {
            const total = parseInt(redirectResponse.headers['content-length'], 10);
            let downloaded = 0;

            redirectResponse.on('data', (chunk) => {
              downloaded += chunk.length;
              onProgress(downloaded / total);
            });

            redirectResponse.pipe(file);
            file.on('finish', () => {
              file.close();
              resolve(modelPath);
            });
          });
        } else {
          const total = parseInt(response.headers['content-length'], 10);
          let downloaded = 0;

          response.on('data', (chunk) => {
            downloaded += chunk.length;
            onProgress(downloaded / total);
          });

          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(modelPath);
          });
        }
      }).on('error', (err) => {
        fs.unlink(modelPath, () => {});
        reject(err);
      });
    });
  }

  async transcribe(audioBuffer, language = 'en') {
    // Convert ArrayBuffer to Buffer
    const buffer = Buffer.from(audioBuffer);
    
    // Save to temp file as WAV
    const tempDir = app.getPath('temp');
    const tempWav = path.join(tempDir, `voiceflow-${Date.now()}.wav`);
    const tempOutput = path.join(tempDir, `voiceflow-${Date.now()}.txt`);

    try {
      // Convert webm/audio to WAV using ffmpeg or native conversion
      // For now, we'll save directly and let whisper handle it
      // Note: Whisper.cpp expects 16kHz mono WAV
      
      // Write the audio buffer
      fs.writeFileSync(tempWav, buffer);

      // If whisper.cpp is not available, use fallback
      if (!this.isInitialized) {
        // Fallback: Return placeholder or use alternative
        return {
          success: false,
          text: '',
          error: 'Whisper not initialized. Please download the model and binary.'
        };
      }

      // Run whisper.cpp
      const result = await this.runWhisper(tempWav, tempOutput, language);
      
      // Clean up
      try {
        fs.unlinkSync(tempWav);
        fs.unlinkSync(tempOutput);
      } catch (e) {}

      return result;
    } catch (error) {
      console.error('Transcription error:', error);
      return { success: false, text: '', error: error.message };
    }
  }

  runWhisper(inputPath, outputPath, language) {
    return new Promise((resolve, reject) => {
      const whisperPath = this.getWhisperPath();
      const modelPath = this.getModelPath(this.currentModel);

      const args = [
        '-m', modelPath,
        '-f', inputPath,
        '-otxt',
        '-of', outputPath.replace('.txt', ''),
        '-l', language,
        '-nt' // no timestamps
      ];

      const process = spawn(whisperPath, args);

      let stderr = '';
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const text = fs.readFileSync(outputPath, 'utf-8').trim();
            resolve({ success: true, text });
          } catch (e) {
            resolve({ success: false, text: '', error: 'Could not read output' });
          }
        } else {
          resolve({ success: false, text: '', error: stderr || 'Whisper process failed' });
        }
      });

      process.on('error', (err) => {
        reject(err);
      });
    });
  }

  setModel(model) {
    this.currentModel = model;
  }
}

module.exports = WhisperService;
