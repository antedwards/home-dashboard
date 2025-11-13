/**
 * Voice Command System
 * Provides offline voice control for the Home Dashboard
 * Uses Web Audio API for recording (no external dependencies)
 */

export { VoiceService } from './VoiceService';
export { SpeechRecognizer } from './SpeechRecognizer';
export { CommandParser } from './CommandParser';
export { ActionRegistry } from './actions/ActionRegistry';
export { CalendarAction } from './actions/CalendarAction';
export { AudioFeedback } from './AudioFeedback';

export type {
  CommandIntent,
  ParsedCommand,
  EventParameters,
  ReminderParameters,
  ActionHandler,
  ActionContext,
  ActionResult,
  VoiceConfig,
  VoiceEvent,
  VoiceEventCallback,
} from './types';
