import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
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
 * Handles speech recognition and command execution
 * Audio recording is handled by the renderer process using Web APIs
 */
export class VoiceService {
  private config: VoiceConfig;
  private speechRecognizer: SpeechRecognizer;
  private commandParser: CommandParser;
  private actionRegistry: ActionRegistry;
  private audioFeedback: AudioFeedback;
  private eventCallbacks: VoiceEventCallback[] = [];
  private context: ActionContext | null = null;
  private isProcessingCommand: boolean = false;
  private calendarAction: CalendarAction;
  private isListening: boolean = false;

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
    // Use medium model for accurate command transcription
    this.speechRecognizer = new SpeechRecognizer(
      'medium',
      this.config.language
    );
    this.commandParser = new CommandParser();
    this.actionRegistry = new ActionRegistry();
    this.audioFeedback = new AudioFeedback();
    this.calendarAction = new CalendarAction();

    // Register default actions
    this.registerDefaultActions();
  }

  /**
   * Initialize the voice service
   */
  async initialize(userId: string, familyId: string, accessToken?: string): Promise<void> {
    console.log('🎤 Initializing Voice Service...');

    // Set context for action handlers
    this.context = { userId, familyId };

    // Set access token for API calls
    if (accessToken) {
      this.calendarAction.setAccessToken(accessToken);
    }

    // Initialize speech recognizer (non-blocking if it fails)
    try {
      await this.speechRecognizer.initialize();

      if (!this.speechRecognizer.isReady()) {
        console.warn('⚠️  Voice Service initialized without speech recognition');
      } else {
        console.log('✅ Voice Service initialized with speech recognition');
      }
    } catch (error) {
      console.warn('⚠️  Voice Service initialized without speech recognition:', error);
    }
  }

  /**
   * Start listening for voice commands
   * Note: Actual audio capture is handled by the renderer process
   */
  async start(): Promise<void> {
    if (!this.context) {
      throw new Error('Voice service not initialized. Call initialize() first.');
    }

    console.log('🎤 Voice command service ready');
    this.isListening = true;
  }

  /**
   * Stop listening
   */
  stop(): void {
    console.log('Stopping voice command service...');
    this.isListening = false;
  }

  /**
   * Process audio data from the renderer
   * @param audioBuffer - Raw audio data as Buffer (WAV format from Web Audio API)
   */
  async processAudio(audioBuffer: Buffer): Promise<void> {
    if (!this.isListening || this.isProcessingCommand) {
      console.log('[VoiceService] Ignoring audio - not listening or already processing');
      return;
    }

    this.isProcessingCommand = true;
    this.emitEvent({ type: 'listening_started' });

    try {
      // Save WAV audio to temporary file
      const tempFile = path.join(os.tmpdir(), `voice-command-${Date.now()}.wav`);
      fs.writeFileSync(tempFile, audioBuffer);
      console.log(`[VoiceService] Saved audio to ${tempFile}, size: ${audioBuffer.length} bytes`);

      // Transcribe with Whisper
      this.emitEvent({ type: 'listening_stopped' });
      const transcript = await this.speechRecognizer.transcribe(tempFile);
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

      // Cleanup temp file
      try {
        fs.unlinkSync(tempFile);
      } catch (err) {
        console.warn('[VoiceService] Failed to cleanup temp file:', err);
      }
    } catch (error: any) {
      console.error('[VoiceService] Error processing audio:', error);
      this.emitEvent({ type: 'error', error: error.message });
      await this.audioFeedback.playError();
    } finally {
      this.isProcessingCommand = false;
    }
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
    this.actionRegistry.register(this.calendarAction);
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
    return this.isListening;
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
