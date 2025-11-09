import * as recorder from 'node-record-lpcm16';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { WakeWordDetector } from './WakeWordDetector';
import { SpeechRecognizer } from './SpeechRecognizer';
import { CommandParser } from './CommandParser';
import { ActionRegistry } from './actions/ActionRegistry';
import { CalendarAction } from './actions/CalendarAction';
import { AudioFeedback } from './AudioFeedback';
import type {
  VoiceConfig,
  VoiceEventCallback,
  VoiceEvent,
  ActionContext,
} from './types';

/**
 * Main voice command service
 * Orchestrates wake word detection, speech recognition, and command execution
 */
export class VoiceService {
  private config: VoiceConfig;
  private wakeWordDetector: WakeWordDetector;
  private speechRecognizer: SpeechRecognizer;
  private commandParser: CommandParser;
  private actionRegistry: ActionRegistry;
  private audioFeedback: AudioFeedback;
  private eventCallbacks: VoiceEventCallback[] = [];
  private context: ActionContext | null = null;
  private isProcessingCommand: boolean = false;

  constructor(config?: Partial<VoiceConfig>) {
    // Default configuration
    this.config = {
      wakeWord: config?.wakeWord || 'hey sausage',
      whisperModel: config?.whisperModel || 'base',
      language: config?.language || 'en',
      vadThreshold: config?.vadThreshold || 0.5,
      recordingTimeout: config?.recordingTimeout || 10,
    };

    // Initialize components
    this.speechRecognizer = new SpeechRecognizer(
      this.config.whisperModel,
      this.config.language
    );
    this.commandParser = new CommandParser();
    this.actionRegistry = new ActionRegistry();
    this.audioFeedback = new AudioFeedback();

    // Register default actions
    this.registerDefaultActions();

    // Initialize wake word detector
    this.wakeWordDetector = new WakeWordDetector(
      this.config.wakeWord,
      () => this.onWakeWordDetected(),
      this.config.vadThreshold
    );
  }

  /**
   * Initialize the voice service
   */
  async initialize(userId: string, familyId: string): Promise<void> {
    console.log('🎤 Initializing Voice Service...');

    // Set context for action handlers
    this.context = { userId, familyId };

    // Initialize speech recognizer
    await this.speechRecognizer.initialize();

    console.log('✅ Voice Service initialized');
  }

  /**
   * Start listening for voice commands
   */
  async start(): Promise<void> {
    if (!this.context) {
      throw new Error('Voice service not initialized. Call initialize() first.');
    }

    console.log('🎤 Starting voice command service...');
    await this.wakeWordDetector.start();
    console.log(`✅ Voice service active. Say "${this.config.wakeWord}" to begin.`);
  }

  /**
   * Stop listening
   */
  stop(): void {
    console.log('Stopping voice command service...');
    this.wakeWordDetector.stop();
  }

  /**
   * Handle wake word detection
   */
  private async onWakeWordDetected(): Promise<void> {
    if (this.isProcessingCommand) {
      console.log('Already processing a command, ignoring wake word');
      return;
    }

    this.isProcessingCommand = true;
    this.emitEvent({ type: 'wake_word_detected' });

    try {
      // Play listening sound
      await this.audioFeedback.playListeningStarted();
      this.emitEvent({ type: 'listening_started' });

      // Record command
      const audioFile = await this.recordCommand();

      // Transcribe
      this.emitEvent({ type: 'listening_stopped' });
      const transcript = await this.speechRecognizer.transcribe(audioFile);
      this.emitEvent({ type: 'speech_recognized', transcript });

      // Parse command
      const command = this.commandParser.parse(transcript);
      this.emitEvent({ type: 'command_parsed', command });

      // Execute command
      if (this.context) {
        const result = await this.actionRegistry.executeCommand(command, this.context);
        this.emitEvent({ type: 'command_executed', result });

        // Provide feedback
        if (result.success) {
          await this.audioFeedback.playSuccess();
        } else {
          await this.audioFeedback.playError();
        }
      }

      // Cleanup
      fs.unlinkSync(audioFile);
    } catch (error: any) {
      console.error('Error processing voice command:', error);
      this.emitEvent({ type: 'error', error: error.message });
      await this.audioFeedback.playError();
    } finally {
      this.isProcessingCommand = false;
    }
  }

  /**
   * Record a voice command after wake word
   */
  private async recordCommand(): Promise<string> {
    return new Promise((resolve, reject) => {
      const tempFile = path.join(os.tmpdir(), `voice-command-${Date.now()}.wav`);
      const fileStream = fs.createWriteStream(tempFile);

      const recording = recorder.record({
        sampleRate: 16000,
        channels: 1,
        audioType: 'wav',
        threshold: 0.5,
        silence: '2.0', // Stop after 2 seconds of silence
      });

      const audioStream = recording.stream();
      audioStream.pipe(fileStream);

      // Stop after timeout
      const timeout = setTimeout(() => {
        recording.stop();
      }, this.config.recordingTimeout * 1000);

      fileStream.on('finish', () => {
        clearTimeout(timeout);
        resolve(tempFile);
      });

      audioStream.on('error', (error: Error) => {
        clearTimeout(timeout);
        recording.stop();
        reject(error);
      });
    });
  }

  /**
   * Register an event callback
   */
  on(callback: VoiceEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Unregister an event callback
   */
  off(callback: VoiceEventCallback): void {
    const index = this.eventCallbacks.indexOf(callback);
    if (index > -1) {
      this.eventCallbacks.splice(index, 1);
    }
  }

  /**
   * Emit an event to all callbacks
   */
  private emitEvent(event: VoiceEvent): void {
    console.log('Voice event:', event);
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in voice event callback:', error);
      }
    }
  }

  /**
   * Register default action handlers
   */
  private registerDefaultActions(): void {
    this.actionRegistry.register(new CalendarAction());
  }

  /**
   * Register a custom action handler
   */
  registerAction(handler: any): void {
    this.actionRegistry.register(handler);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): VoiceConfig {
    return { ...this.config };
  }

  /**
   * Check if service is active
   */
  isActive(): boolean {
    return this.wakeWordDetector.isActive();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.stop();
    await this.speechRecognizer.cleanup();
    this.eventCallbacks = [];
    this.context = null;
    console.log('Voice service cleaned up');
  }
}
