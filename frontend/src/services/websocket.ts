// WebSocket service for real-time transcription

export class TranscriptionWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private onMessageCallback: ((data: any) => void) | null = null;
  private onStatusCallback: ((status: string) => void) | null = null;

  constructor(private url: string = 'ws://localhost:8000/ws/transcription') {}

  connect() {
    try {
      console.log('Connecting to WebSocket:', this.url);
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        if (this.onStatusCallback) {
          this.onStatusCallback('connected');
        }
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message:', data);
          if (this.onMessageCallback) {
            this.onMessageCallback(data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        if (this.onStatusCallback) {
          this.onStatusCallback('disconnected');
        }
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (this.onStatusCallback) {
          this.onStatusCallback('error');
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      if (this.onStatusCallback) {
        this.onStatusCallback('error');
      }
    }
  }

  private scheduleReconnect() {
    if (!this.reconnectTimeout) {
      this.reconnectTimeout = setTimeout(() => {
        console.log('Attempting to reconnect...');
        this.connect();
      }, 5000);
    }
  }

  sendAudioData(audioData: ArrayBuffer) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(audioData);
    } else {
      console.warn('WebSocket not connected, cannot send audio data');
    }
  }

  sendMessage(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  onMessage(callback: (data: any) => void) {
    this.onMessageCallback = callback;
  }

  onStatusChange(callback: (status: string) => void) {
    this.onStatusCallback = callback;
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}