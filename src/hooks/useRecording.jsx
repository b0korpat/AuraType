import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const RecordingContext = createContext(null);

export function RecordingProvider({ children }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptions, setTranscriptions] = useState([]);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  const audioContextRef = useRef(null);
  const workletNodeRef = useRef(null);
  const streamRef = useRef(null);
  const samplesRef = useRef([]);
  const isRecordingRef = useRef(false);
  const sampleRateRef = useRef(48000);

  const [isLoaded, setIsLoaded] = useState(false);

  // Load transcriptions
  useEffect(() => {
    try {
      const saved = localStorage.getItem('voiceflow-transcriptions');
      if (saved) {
        setTranscriptions(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save transcriptions
  useEffect(() => {
    if (!isLoaded) return;
    
    try {
      localStorage.setItem('voiceflow-transcriptions', JSON.stringify(transcriptions));
    } catch (e) {
      console.error('Save error:', e);
    }
  }, [transcriptions, isLoaded]);

  // Recording event handlers
  useEffect(() => {
    if (!window.electronAPI) {
      console.log('electronAPI not available');
      return;
    }

    console.log('Setting up recording listeners');

    const handleStart = async () => {
      console.log('>>> START event received');
      if (isRecordingRef.current) return;
      
      try {
        isRecordingRef.current = true;
        setIsRecording(true);
        setError(null);
        samplesRef.current = [];

        // Get microphone stream
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            channelCount: 1, 
            sampleRate: 48000,
            echoCancellation: true,
            noiseSuppression: true
          }
        });
        streamRef.current = stream;

        // Create AudioContext
        const audioContext = new AudioContext({ sampleRate: 48000 });
        audioContextRef.current = audioContext;
        sampleRateRef.current = audioContext.sampleRate;
        
        console.log('AudioContext sample rate:', audioContext.sampleRate);

        // Load AudioWorklet
        try {
          await audioContext.audioWorklet.addModule('audio-processor.js');
        } catch (e) {
          console.error('Failed to load audio-processor.js from root, trying relative...', e);
          // Fallback for different environments
          await audioContext.audioWorklet.addModule('./audio-processor.js');
        }
        
        // Create nodes
        const source = audioContext.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
        workletNodeRef.current = workletNode;

        // Collect samples from worklet
        workletNode.port.onmessage = (e) => {
          if (e.data.samples && isRecordingRef.current) {
            samplesRef.current.push(e.data.samples);
          }
        };

        // Connect: source -> worklet
        source.connect(workletNode);
        
        // Tell worklet to start recording
        workletNode.port.postMessage({ command: 'start' });
        
        console.log('AudioWorklet recording started');
      } catch (err) {
        console.error('Start error:', err);
        setError('Microphone error: ' + err.message);
        isRecordingRef.current = false;
        setIsRecording(false);
      }
    };

    const handleStop = async () => {
      console.log('>>> STOP event received');
      if (!isRecordingRef.current) return;
      
      isRecordingRef.current = false;
      setIsRecording(false);

      // Tell worklet to stop
      if (workletNodeRef.current) {
        workletNodeRef.current.port.postMessage({ command: 'stop' });
      }

      // Small delay to ensure last samples arrive
      await new Promise(r => setTimeout(r, 100));

      // Stop stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      // Close audio context
      if (audioContextRef.current) {
        try {
          await audioContextRef.current.close();
        } catch (e) {
          console.log('AudioContext close error:', e);
        }
        audioContextRef.current = null;
      }

      const samples = samplesRef.current;
      const sampleRate = sampleRateRef.current;
      console.log('Collected', samples.length, 'sample chunks at', sampleRate, 'Hz');
      
      if (samples.length === 0) {
        setError('No audio recorded');
        return;
      }

      // Process audio
      await processAudioSamples(samples, sampleRate);
    };

    const unsubStart = window.electronAPI.onRecordingStarted(handleStart);
    const unsubStop = window.electronAPI.onRecordingStopped(handleStop);

    return () => {
      unsubStart?.();
      unsubStop?.();
    };
  }, []);

  const processAudioSamples = async (sampleChunks, srcRate) => {
    setIsProcessing(true);
    setError(null);

    try {
      console.log('Processing', sampleChunks.length, 'chunks');
      
      // Merge all sample chunks into one array
      const totalLength = sampleChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const allSamples = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of sampleChunks) {
        allSamples.set(chunk, offset);
        offset += chunk.length;
      }
      
      console.log('Total samples:', allSamples.length, 'Duration:', allSamples.length / srcRate, 's');

      // Resample to 16kHz and convert to WAV
      const targetRate = 16000;
      const wavBuffer = samplesToWav(allSamples, srcRate, targetRate);
      console.log('WAV buffer size:', wavBuffer.byteLength);

      // Send to Whisper via IPC
      const uint8Array = new Uint8Array(wavBuffer);
      console.log('Sending to Whisper, size:', uint8Array.length);
      
      const result = await window.electronAPI.transcribeAudio(uint8Array);
      console.log('Transcription result:', result);

      if (result?.success && result?.text?.trim()) {
        const text = result.text.trim();
        setTranscriptions(prev => [{
          id: Date.now().toString(),
          text,
          timestamp: new Date().toISOString()
        }, ...prev]);
        setCurrentTranscription(text);
        await window.electronAPI.pasteText(text);
      } else if (result?.error) {
        setError(result.error);
      } else {
        setError('No transcription');
      }
    } catch (err) {
      console.error('Process error:', err);
      setError('Processing failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert Float32 samples to 16kHz mono WAV
  const samplesToWav = (srcSamples, srcRate, targetRate) => {
    // Resample if needed
    let samples;
    if (srcRate !== targetRate) {
      const ratio = srcRate / targetRate;
      const newLen = Math.floor(srcSamples.length / ratio);
      samples = new Float32Array(newLen);
      for (let i = 0; i < newLen; i++) {
        samples[i] = srcSamples[Math.floor(i * ratio)];
      }
    } else {
      samples = srcSamples;
    }

    // Create WAV buffer
    const bufferLen = 44 + samples.length * 2;
    const buffer = new ArrayBuffer(bufferLen);
    const view = new DataView(buffer);

    const writeStr = (off, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(off + i, str.charCodeAt(i));
      }
    };

    // WAV header
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true);  // PCM format
    view.setUint16(22, 1, true);  // mono
    view.setUint32(24, targetRate, true); // sample rate
    view.setUint32(28, targetRate * 2, true); // byte rate
    view.setUint16(32, 2, true);  // block align
    view.setUint16(34, 16, true); // bits per sample
    writeStr(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // Write samples as 16-bit PCM
    let writeOffset = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(writeOffset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      writeOffset += 2;
    }

    return buffer;
  };

  const startRecording = () => window.electronAPI?.startRecording();
  const stopRecording = () => window.electronAPI?.stopRecording();
  const deleteTranscription = (id) => setTranscriptions(prev => prev.filter(t => t.id !== id));
  const clearHistory = () => setTranscriptions([]);
  const copyToClipboard = (text) => window.electronAPI?.copyToClipboard(text);

  return (
    <RecordingContext.Provider value={{
      isRecording,
      isProcessing,
      transcriptions,
      currentTranscription,
      error,
      startRecording,
      stopRecording,
      deleteTranscription,
      clearHistory,
      copyToClipboard
    }}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const context = useContext(RecordingContext);
  if (!context) throw new Error('useRecording must be used within RecordingProvider');
  return context;
}
