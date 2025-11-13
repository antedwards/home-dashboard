import * as path from 'path';
import * as os from 'os';
import { app } from 'electron';
import * as fs from 'fs';

/**
 * Speech recognizer using Whisper for offline transcription
 * Models are bundled with the app in production, or use ~/.cache in development
 */
export class SpeechRecognizer {
  private whisper: any = null;
  private initialized: boolean = false;
  private modelPath: string;

  constructor(
    private model: 'tiny' | 'base' | 'small' | 'medium' | 'large' = 'base',
    private language: string = 'en'
  ) {
    // Determine model path based on environment
    if (app.isPackaged) {
      // Production: use bundled models
      this.modelPath = path.join(process.resourcesPath, 'whisper-models');
    } else {
      // Development: use downloaded models in user cache
      this.modelPath = path.join(os.homedir(), '.cache', 'whisper-node');
    }
  }

  /**
   * Initialize the speech recognizer
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('Initializing Whisper speech recognizer...');
      console.log('Model path:', this.modelPath);

      // Check if models exist
      if (!fs.existsSync(this.modelPath)) {
        throw new Error(`Whisper models not found at ${this.modelPath}. Run "npm run download:models"`);
      }

      // Lazy load whisper-node
      const { whisper } = await import('whisper-node');

      this.whisper = whisper;
      this.initialized = true;

      console.log('✅ Whisper initialized successfully');
    } catch (error: any) {
      console.warn('⚠️  Whisper initialization failed - voice commands will be unavailable');
      console.warn('⚠️  Error:', error.message);
      // Don't throw - allow app to continue without voice features
      this.initialized = false;
    }
  }

  /**
   * Transcribe audio file to text
   */
  async transcribe(audioFilePath: string): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized || !this.whisper) {
      throw new Error('Speech recognizer not available - Whisper needs to be compiled');
    }

    try {
      console.log(`Transcribing audio: ${audioFilePath}`);

      // Transcribe using Whisper
      // Use full path to model file
      const modelFile = path.join(this.modelPath, `ggml-${this.model}.bin`);

      const result = await this.whisper(audioFilePath, {
        modelPath: modelFile,
        whisperOptions: {
          language: this.language,
          word_timestamps: false,
          gen_file_txt: false,
          gen_file_subtitle: false,
          gen_file_vtt: false,
        },
      });

      // Extract text from result
      const transcript = Array.isArray(result)
        ? result.map((r) => r.speech).join(' ')
        : result.speech || '';

      console.log(`📝 Transcript: "${transcript}"`);

      return transcript.trim();
    } catch (error: any) {
      console.error('Transcription error:', error);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  /**
   * Check if recognizer is ready
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Whisper-node doesn't require explicit cleanup
    this.initialized = false;
    console.log('Speech recognizer cleaned up');
  }
}
