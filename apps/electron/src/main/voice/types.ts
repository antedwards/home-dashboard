/**
 * Voice command system types
 */

// Command intent types
export type CommandIntent =
  | 'CREATE_EVENT'
  | 'CREATE_REMINDER'
  | 'LIST_EVENTS'
  | 'DELETE_EVENT'
  | 'UNKNOWN';

// Parsed command structure
export interface ParsedCommand {
  intent: CommandIntent;
  confidence: number;
  parameters: Record<string, any>;
  rawTranscript: string;
}

// Event parameters extracted from voice
export interface EventParameters {
  title: string;
  date?: Date;
  time?: { hour: number; minute: number };
  endTime?: { hour: number; minute: number };
  duration?: number; // minutes
  location?: string;
  description?: string;
  allDay?: boolean;
}

// Reminder parameters
export interface ReminderParameters {
  title: string;
  time: Date;
  recurring?: 'daily' | 'weekly' | 'monthly';
}

// Action handler interface
export interface ActionHandler {
  readonly name: string;
  readonly intents: CommandIntent[];
  canHandle(command: ParsedCommand): boolean;
  execute(command: ParsedCommand, context: ActionContext): Promise<ActionResult>;
}

// Context passed to action handlers
export interface ActionContext {
  userId: string;
  familyId: string;
  // Add more context as needed
}

// Result from action execution
export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

// Voice service configuration
export interface VoiceConfig {
  wakeWord: string;
  whisperModel: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  language: string;
  vadThreshold: number;
  recordingTimeout: number; // seconds
}

// Voice service events
export type VoiceEvent =
  | { type: 'wake_word_detected' }
  | { type: 'listening_started' }
  | { type: 'listening_stopped' }
  | { type: 'speech_recognized'; transcript: string }
  | { type: 'command_parsed'; command: ParsedCommand }
  | { type: 'command_executed'; result: ActionResult }
  | { type: 'error'; error: string };

export type VoiceEventCallback = (event: VoiceEvent) => void;
