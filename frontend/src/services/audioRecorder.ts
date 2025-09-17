export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private audioStream: MediaStream | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private audioInput: MediaStreamAudioSourceNode | null = null;
  private isRecording = false;
  private onDataCallback: ((data: ArrayBuffer) => void) | null = null;

  async startRecording(): Promise<boolean> {
    try {
      // Get microphone access
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create audio context (use default sample rate to avoid mismatch)
      this.audioContext = new AudioContext();

      // Create audio input from stream
      this.audioInput = this.audioContext.createMediaStreamSource(this.audioStream);

      // Create script processor for capturing audio chunks
      this.scriptNode = this.audioContext.createScriptProcessor(4096, 1, 1);

      // Connect audio pipeline
      this.audioInput.connect(this.scriptNode);
      this.scriptNode.connect(this.audioContext.destination);

      // Process audio chunks
      this.scriptNode.onaudioprocess = (event) => {
        if (!this.isRecording) return;

        const inputData = event.inputBuffer.getChannelData(0);

        // Convert Float32Array to Int16Array (PCM16)
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send PCM16 data to callback
        if (this.onDataCallback) {
          this.onDataCallback(pcmData.buffer);
        }
      };

      this.isRecording = true;
      return true;
    } catch (error) {
      console.error('AudioRecorder: Failed to start recording', error);
      return false;
    }
  }

  stopRecording(): void {
    this.isRecording = false;

    // Cleanup audio nodes
    if (this.scriptNode) {
      this.scriptNode.disconnect();
      this.scriptNode = null;
    }

    if (this.audioInput) {
      this.audioInput.disconnect();
      this.audioInput = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Stop all tracks
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
  }

  onData(callback: (data: ArrayBuffer) => void): void {
    this.onDataCallback = callback;
  }

  isActive(): boolean {
    return this.isRecording;
  }
}