// AudioWorklet processor - captures raw PCM samples
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isRecording = false;
    
    this.port.onmessage = (e) => {
      if (e.data.command === 'start') {
        this.isRecording = true;
      } else if (e.data.command === 'stop') {
        this.isRecording = false;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0 && this.isRecording) {
      // Send mono channel data (first channel)
      const samples = input[0];
      if (samples && samples.length > 0) {
        // Copy the samples since they'll be reused
        this.port.postMessage({ samples: new Float32Array(samples) });
      }
    }
    return true; // Keep processor alive
  }
}

registerProcessor('audio-processor', AudioProcessor);
