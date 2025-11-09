import * as recorder from 'node-record-lpcm16';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SpeechRecognizer } from './SpeechRecognizer';

/**
 * Detects wake words in continuous audio stream
 * Uses Voice Activity Detection + periodic Whisper transcription
 */
export class WakeWordDetector {
  private recording: any = null;
  private isListening: boolean = false;
  private audioChunks: Buffer[] = [];
  private vadInstance: any = null;
  private speechRecognizer: SpeechRecognizer;
  private checkIntervalMs: number = 3000; // Check every 3 seconds
  private lastCheckTime: number = 0;

  constructor(
    private wakeWord: string,
    private onWakeWordDetected: () => void,
    private vadThreshold: number = 0.5
  ) {
    this.speechRecognizer = new SpeechRecognizer('tiny', 'en'); // Use tiny model for wake word
  }

  /**
   * Start listening for wake word
   */
  async start(): Promise<void> {
    if (this.isListening) {
      console.log('Wake word detector already listening');
      return;
    }

    await this.speechRecognizer.initialize();

    console.log(`👂 Listening for wake word: "${this.wakeWord}"`);
    this.isListening = true;
    this.startRecording();
  }

  /**
   * Stop listening
   */
  stop(): void {
    if (!this.isListening) return;

    console.log('Stopping wake word detection');
    this.isListening = false;

    if (this.recording) {
      this.recording.stop();
      this.recording = null;
    }

    this.audioChunks = [];
  }

  /**
   * Start continuous audio recording
   */
  private startRecording(): void {
    try {
      // Start recording audio
      this.recording = recorder.record({
        sampleRate: 16000,
        channels: 1,
        audioType: 'wav',
        threshold: 0.5,
        silence: '3.0',
        recordProgram: 'rec', // Use SoX on Linux
      });

      const audioStream = this.recording.stream();

      // Collect audio chunks
      audioStream.on('data', (chunk: Buffer) => {
        if (!this.isListening) return;

        this.audioChunks.push(chunk);

        // Periodically check for wake word
        const now = Date.now();
        if (now - this.lastCheckTime > this.checkIntervalMs) {
          this.lastCheckTime = now;
          this.checkForWakeWord();
        }
      });

      audioStream.on('error', (error: Error) => {
        console.error('Recording stream error:', error);
        if (this.isListening) {
          // Try to restart
          setTimeout(() => this.startRecording(), 1000);
        }
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      // Fallback: use simpler detection without continuous recording
      this.startFallbackMode();
    }
  }

  /**
   * Check accumulated audio for wake word
   */
  private async checkForWakeWord(): Promise<void> {
    if (this.audioChunks.length === 0) return;

    try {
      // Combine audio chunks
      const audioBuffer = Buffer.concat(this.audioChunks);

      // Keep only last 3 seconds of audio
      const maxBytes = 16000 * 2 * 3; // 16kHz, 16-bit, 3 seconds
      if (audioBuffer.length > maxBytes) {
        this.audioChunks = [audioBuffer.subarray(audioBuffer.length - maxBytes)];
      }

      // Save to temporary file
      const tempFile = path.join(os.tmpdir(), `wake-word-${Date.now()}.wav`);
      fs.writeFileSync(tempFile, audioBuffer);

      // Transcribe
      const transcript = await this.speechRecognizer.transcribe(tempFile);

      // Check for wake word
      if (this.containsWakeWord(transcript)) {
        console.log('🎯 Wake word detected!');
        this.audioChunks = []; // Clear buffer
        this.onWakeWordDetected();
      }

      // Cleanup temp file
      fs.unlinkSync(tempFile);
    } catch (error) {
      console.error('Error checking for wake word:', error);
    }
  }

  /**
   * Check if transcript contains wake word
   */
  private containsWakeWord(transcript: string): boolean {
    const normalized = transcript.toLowerCase().trim();
    const wakeWordNormalized = this.wakeWord.toLowerCase();

    // Direct match
    if (normalized.includes(wakeWordNormalized)) {
      return true;
    }

    // Fuzzy match for common misrecognitions
    // "hey sausage" might be heard as "hay sausage", "a sausage", etc.
    const patterns = [
      /\b(?:hey|hay|hi|a)\s+sausage\b/i,
      /\bsausage\b/i, // Just "sausage" alone
    ];

    return patterns.some((pattern) => pattern.test(normalized));
  }

  /**
   * Fallback mode when continuous recording fails
   * Uses simpler voice activity detection
   */
  private startFallbackMode(): void {
    console.log('Using fallback wake word detection mode');

    // Simple mode: just check periodically with microphone bursts
    const checkPeriodically = async () => {
      if (!this.isListening) return;

      try {
        // Record a short burst
        const tempFile = path.join(os.tmpdir(), `wake-check-${Date.now()}.wav`);

        const rec = recorder.record({
          sampleRate: 16000,
          channels: 1,
          audioType: 'wav',
        });

        const fileStream = fs.createWriteStream(tempFile);
        const audioStream = rec.stream();
        audioStream.pipe(fileStream);

        // Record for 2 seconds
        await new Promise((resolve) => setTimeout(resolve, 2000));
        rec.stop();

        // Transcribe
        const transcript = await this.speechRecognizer.transcribe(tempFile);

        if (this.containsWakeWord(transcript)) {
          console.log('🎯 Wake word detected (fallback mode)!');
          this.onWakeWordDetected();
        }

        // Cleanup
        fs.unlinkSync(tempFile);
      } catch (error) {
        console.error('Fallback check error:', error);
      }

      // Schedule next check
      if (this.isListening) {
        setTimeout(checkPeriodically, 3000);
      }
    };

    checkPeriodically();
  }

  /**
   * Check if detector is active
   */
  isActive(): boolean {
    return this.isListening;
  }
}
