// Audio recording service for capturing microphone input

export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private audioStream: MediaStream | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private audioInput: MediaStreamAudioSourceNode | null = null;
  private isRecording = false;
  private onDataCallback: ((data: ArrayBuffer) => void) | null = null;

  async startRecording() {
    try {
      console.log('Starting audio recording...');

      // Request microphone access only if we don't have it
      if (!this.audioStream) {
        this.audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      }

      // Create or resume AudioContext for PCM processing
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('Created new AudioContext, sample rate:', this.audioContext.sampleRate);
      } else if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('Resumed AudioContext, sample rate:', this.audioContext.sampleRate);
      }

      // Always create fresh audio nodes for each recording session
      // Create audio input from stream
      this.audioInput = this.audioContext.createMediaStreamSource(this.audioStream);

      // Create new script processor for raw PCM data extraction
      const bufferSize = 4096;
      this.scriptNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.scriptNode.onaudioprocess = (event) => {
        if (!this.isRecording) return;

        const inputData = event.inputBuffer.getChannelData(0);
        // Convert Float32Array to Int16Array (PCM16)
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send PCM data as ArrayBuffer
        if (this.onDataCallback) {
          this.onDataCallback(pcmData.buffer);
        }
      };

      // Connect the nodes
      this.audioInput.connect(this.scriptNode);
      this.scriptNode.connect(this.audioContext.destination);

      this.isRecording = true;
      console.log('Audio recording started (PCM16 format)');
      return true;
    } catch (error) {
      console.error('Error starting audio recording:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        alert('Микрофон не доступен. Пожалуйста, разрешите доступ к микрофону.');
      } else {
        alert('Ошибка при запуске записи: ' + error);
      }
      return false;
    }
  }

  stopRecording() {
    console.log('Stopping audio recording...');
    this.isRecording = false;

    // Just disconnect nodes, don't null them out yet
    if (this.scriptNode) {
      this.scriptNode.disconnect();
    }

    if (this.audioInput) {
      this.audioInput.disconnect();
    }

    // Keep the audio stream alive - don't stop tracks
    // This allows us to resume quickly without requesting permissions again

    // Don't close AudioContext, just suspend it so we can resume later
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.suspend();
    }

    console.log('Audio recording paused (keeping stream alive)');
  }

  onData(callback: (data: ArrayBuffer) => void) {
    this.onDataCallback = callback;
  }

  getRecordingState() {
    return this.isRecording;
  }

  // Call this when completely done with recording (e.g., app unmount)
  cleanup() {
    console.log('Cleaning up audio resources...');
    this.isRecording = false;

    if (this.scriptNode) {
      this.scriptNode.disconnect();
      this.scriptNode = null;
    }

    if (this.audioInput) {
      this.audioInput.disconnect();
      this.audioInput = null;
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    console.log('Audio resources cleaned up');
  }
}