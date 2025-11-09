import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

/**
 * Speech recognizer using Whisper for offline transcription
 */
export class SpeechRecognizer {
  private whisper: any = null;
  private modelPath: string;
  private initialized: boolean = false;

  constructor(
    private model: 'tiny' | 'base' | 'small' | 'medium' | 'large' = 'base',
    private language: string = 'en'
  ) {
    // Store models in app data directory
    const userDataPath = app.getPath('userData');
    this.modelPath = path.join(userDataPath, 'whisper-models');
  }

  /**
   * Initialize the speech recognizer
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('Initializing Whisper speech recognizer...');

      // Ensure model directory exists
      if (!fs.existsSync(this.modelPath)) {
        fs.mkdirSync(this.modelPath, { recursive: true });
      }

      // Lazy load whisper-node (it will download model on first use)
      const { whisper } = await import('whisper-node');

      this.whisper = whisper;
      this.initialized = true;

      console.log('✅ Whisper initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Whisper:', error);
      throw new Error('Failed to initialize speech recognizer');
    }
  }

  /**
   * Transcribe audio file to text
   */
  async transcribe(audioFilePath: string): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log(`Transcribing audio: ${audioFilePath}`);

      // Transcribe using Whisper
      const result = await this.whisper(audioFilePath, {
        modelName: this.model,
        modelPath: this.modelPath,
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
