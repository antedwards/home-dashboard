/**
 * Voice recorder using Web Audio API
 * Captures audio in the renderer process and sends to main for transcription
 * Produces WAV format audio that Whisper can process
 * Supports continuous recording for wake word detection
 */
export class VoiceRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;
  private isRecording: boolean = false;
  private isContinuousListening: boolean = false;
  private audioBuffers: Float32Array[] = [];
  private continuousBuffers: Float32Array[] = [];
  private sampleRate: number = 16000;
  private checkInterval: NodeJS.Timeout | null = null;
  private onWakeWordCallback: ((audio: ArrayBuffer) => void) | null = null;

  /**
   * Request microphone permission and initialize
   */
  async initialize(): Promise<void> {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: this.sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create audio context
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.stream);

      console.log('✅ Microphone access granted');
    } catch (error) {
      console.error('Failed to get microphone access:', error);
      throw new Error('Microphone permission denied');
    }
  }

  /**
   * Start recording audio
   */
  async startRecording(): Promise<void> {
    if (!this.audioContext || !this.mediaStreamSource) {
      throw new Error('Voice recorder not initialized');
    }

    if (this.isRecording) {
      return;
    }

    this.audioBuffers = [];

    // Create script processor to capture audio data
    // Note: ScriptProcessorNode is deprecated but still widely supported
    // We use it for simplicity; could migrate to AudioWorklet in future
    this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.scriptProcessor.onaudioprocess = (event) => {
      if (!this.isRecording) return;

      const inputData = event.inputBuffer.getChannelData(0);
      this.audioBuffers.push(new Float32Array(inputData));
    };

    // Connect nodes
    this.mediaStreamSource.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);

    this.isRecording = true;
    console.log('🎤 Recording started');
  }

  /**
   * Stop recording and return audio data as WAV format
   */
  async stopRecording(): Promise<ArrayBuffer> {
    if (!this.isRecording) {
      throw new Error('Not recording');
    }

    this.isRecording = false;

    // Disconnect audio nodes
    if (this.scriptProcessor && this.mediaStreamSource) {
      this.mediaStreamSource.disconnect(this.scriptProcessor);
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    // Combine all audio buffers
    const totalLength = this.audioBuffers.reduce((acc, buf) => acc + buf.length, 0);
    const combinedBuffer = new Float32Array(totalLength);
    let offset = 0;
    for (const buffer of this.audioBuffers) {
      combinedBuffer.set(buffer, offset);
      offset += buffer.length;
    }

    // Convert to WAV format
    const wavBuffer = this.encodeWAV(combinedBuffer, this.sampleRate);
    this.audioBuffers = [];

    console.log('🎤 Recording stopped, size:', wavBuffer.byteLength);
    return wavBuffer;
  }

  /**
   * Encode PCM audio data as WAV file
   */
  private encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF'); // ChunkID
    view.setUint32(4, 36 + samples.length * 2, true); // ChunkSize
    writeString(8, 'WAVE'); // Format
    writeString(12, 'fmt '); // Subchunk1ID
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, 1, true); // NumChannels (1 for mono)
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(36, 'data'); // Subchunk2ID
    view.setUint32(40, samples.length * 2, true); // Subchunk2Size

    // Write PCM samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return buffer;
  }

  /**
   * Record for a specific duration
   */
  async recordForDuration(durationMs: number): Promise<ArrayBuffer> {
    await this.startRecording();

    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const audio = await this.stopRecording();
          resolve(audio);
        } catch (error) {
          reject(error);
        }
      }, durationMs);
    });
  }

  /**
   * Record until silence is detected
   * @param silenceDurationMs - How long silence should last to stop recording (default 1500ms)
   * @param maxDurationMs - Maximum recording duration (default 30 seconds)
   * @param silenceThreshold - Volume threshold for silence (default 0.01)
   */
  async recordUntilSilence(
    silenceDurationMs: number = 1500,
    maxDurationMs: number = 30000,
    silenceThreshold: number = 0.01
  ): Promise<ArrayBuffer> {
    if (!this.audioContext || !this.mediaStreamSource) {
      throw new Error('Voice recorder not initialized');
    }

    if (this.isRecording) {
      throw new Error('Already recording');
    }

    return new Promise((resolve, reject) => {
      this.audioBuffers = [];
      let lastSoundTime = Date.now();
      let maxTimeoutId: NodeJS.Timeout;

      // Create script processor
      this.scriptProcessor = this.audioContext!.createScriptProcessor(4096, 1, 1);

      this.scriptProcessor.onaudioprocess = (event) => {
        if (!this.isRecording) return;

        const inputData = event.inputBuffer.getChannelData(0);
        this.audioBuffers.push(new Float32Array(inputData));

        // Calculate RMS (root mean square) volume level
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);

        // Check if there's sound above threshold
        if (rms > silenceThreshold) {
          lastSoundTime = Date.now();
        } else {
          // Check if we've been silent long enough
          const silenceDuration = Date.now() - lastSoundTime;
          if (silenceDuration >= silenceDurationMs) {
            console.log('🔇 Silence detected, stopping recording');
            this.stopAndResolve(resolve);
          }
        }
      };

      // Connect nodes
      this.mediaStreamSource!.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext!.destination);

      this.isRecording = true;
      console.log('🎤 Recording with silence detection...');

      // Maximum duration timeout
      maxTimeoutId = setTimeout(() => {
        console.log('⏱️ Maximum recording duration reached');
        this.stopAndResolve(resolve);
      }, maxDurationMs);

      // Helper to stop and resolve
      const stopAndResolve = async () => {
        clearTimeout(maxTimeoutId);
        try {
          const audio = await this.stopRecording();
          resolve(audio);
        } catch (error) {
          reject(error);
        }
      };

      // Store the helper function for use in onaudioprocess
      (this as any).stopAndResolve = stopAndResolve;
    });
  }

  private async stopAndResolve(resolve: (value: ArrayBuffer) => void): Promise<void> {
    this.isRecording = false;

    // Disconnect audio nodes
    if (this.scriptProcessor && this.mediaStreamSource) {
      this.mediaStreamSource.disconnect(this.scriptProcessor);
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    // Combine all audio buffers
    const totalLength = this.audioBuffers.reduce((acc, buf) => acc + buf.length, 0);
    const combinedBuffer = new Float32Array(totalLength);
    let offset = 0;
    for (const buffer of this.audioBuffers) {
      combinedBuffer.set(buffer, offset);
      offset += buffer.length;
    }

    // Convert to WAV format
    const wavBuffer = this.encodeWAV(combinedBuffer, this.sampleRate);
    this.audioBuffers = [];

    console.log('🎤 Recording stopped, size:', wavBuffer.byteLength);
    resolve(wavBuffer);
  }

  /**
   * Start continuous listening for wake word
   * @param onWakeWord - Callback when wake word is detected with audio buffer
   */
  async startContinuousListening(onWakeWord: (audio: ArrayBuffer) => void): Promise<void> {
    if (!this.audioContext || !this.mediaStreamSource) {
      throw new Error('Voice recorder not initialized');
    }

    if (this.isContinuousListening) {
      return;
    }

    this.onWakeWordCallback = onWakeWord;
    this.continuousBuffers = [];
    this.isContinuousListening = true;

    // Create script processor
    this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.scriptProcessor.onaudioprocess = (event) => {
      if (!this.isContinuousListening) return;

      const inputData = event.inputBuffer.getChannelData(0);
      this.continuousBuffers.push(new Float32Array(inputData));

      // Keep only last 3 seconds of audio (for wake word detection)
      const maxBuffers = Math.ceil((this.sampleRate * 3) / 4096);
      if (this.continuousBuffers.length > maxBuffers) {
        this.continuousBuffers.shift();
      }
    };

    // Connect nodes
    this.mediaStreamSource.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);

    // Check for wake word every 2 seconds
    this.checkInterval = setInterval(() => {
      this.checkForWakeWord();
    }, 2000);

    console.log('🎤 Continuous listening started');
  }

  /**
   * Check current audio buffer for wake word
   */
  private async checkForWakeWord(): Promise<void> {
    if (this.continuousBuffers.length === 0) return;

    // Combine buffers
    const totalLength = this.continuousBuffers.reduce((acc, buf) => acc + buf.length, 0);
    const combinedBuffer = new Float32Array(totalLength);
    let offset = 0;
    for (const buffer of this.continuousBuffers) {
      combinedBuffer.set(buffer, offset);
      offset += buffer.length;
    }

    // Encode as WAV
    const wavBuffer = this.encodeWAV(combinedBuffer, this.sampleRate);

    // Send to callback for wake word detection
    if (this.onWakeWordCallback) {
      this.onWakeWordCallback(wavBuffer);
    }
  }

  /**
   * Stop continuous listening
   */
  stopContinuousListening(): void {
    if (!this.isContinuousListening) return;

    this.isContinuousListening = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (this.scriptProcessor && this.mediaStreamSource) {
      this.mediaStreamSource.disconnect(this.scriptProcessor);
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    this.continuousBuffers = [];
    console.log('🎤 Continuous listening stopped');
  }

  /**
   * Check if currently recording
   */
  get recording(): boolean {
    return this.isRecording;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.scriptProcessor && this.mediaStreamSource) {
      this.mediaStreamSource.disconnect(this.scriptProcessor);
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.audioBuffers = [];
    this.isRecording = false;
  }
}
