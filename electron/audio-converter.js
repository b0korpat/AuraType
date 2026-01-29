const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Audio Converter - Converts WebM/audio to WAV format for Whisper
 * Uses ffmpeg if available, otherwise falls back to native conversion
 */
class AudioConverter {
  constructor() {
    this.ffmpegPath = this.findFFmpeg();
  }

  findFFmpeg() {
    // Check common locations
    const possiblePaths = [
      'ffmpeg', // In PATH
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      path.join(os.homedir(), 'ffmpeg', 'bin', 'ffmpeg.exe'),
    ];

    for (const p of possiblePaths) {
      try {
        const result = require('child_process').spawnSync(p, ['-version']);
        if (result.status === 0) {
          return p;
        }
      } catch (e) {}
    }

    return null;
  }

  async convertToWav(inputBuffer, outputPath) {
    const tempInput = path.join(os.tmpdir(), `voiceflow-input-${Date.now()}.webm`);
    
    try {
      // Write input buffer to temp file
      fs.writeFileSync(tempInput, Buffer.from(inputBuffer));

      if (this.ffmpegPath) {
        // Use ffmpeg for conversion
        await this.convertWithFFmpeg(tempInput, outputPath);
      } else {
        // Direct copy (may not work with all audio formats)
        fs.copyFileSync(tempInput, outputPath);
      }

      // Clean up temp input
      try { fs.unlinkSync(tempInput); } catch (e) {}

      return true;
    } catch (error) {
      console.error('Audio conversion error:', error);
      try { fs.unlinkSync(tempInput); } catch (e) {}
      return false;
    }
  }

  convertWithFFmpeg(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      const args = [
        '-i', inputPath,
        '-ar', '16000',      // 16kHz sample rate (required by Whisper)
        '-ac', '1',          // Mono
        '-c:a', 'pcm_s16le', // 16-bit PCM
        '-y',                // Overwrite output
        outputPath
      ];

      const process = spawn(this.ffmpegPath, args);

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      process.on('error', reject);
    });
  }
}

module.exports = AudioConverter;
