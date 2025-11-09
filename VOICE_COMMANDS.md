# Voice Command System

## Overview

The Home Dashboard Electron app includes an **offline voice command system** powered by Whisper AI for speech recognition. Users can create calendar events, set reminders, and perform other actions using natural language voice commands.

## Features

### ✅ Implemented

- **Wake Word Detection**: Listens for "Hey Sausage" (placeholder for "Hey Siri")
- **Offline Speech Recognition**: Uses Whisper AI model (runs completely offline)
- **Calendar Event Creation**: Create events using natural language
- **Audio Feedback**: Success pings and error sounds
- **Extensible Architecture**: Easy to add new command types
- **Real-time Status**: Visual feedback in the UI

### 🎤 Supported Commands

#### Calendar Events

```
"Hey Sausage, create an event called Doctor's Appointment tomorrow at 3pm"
"Hey Sausage, schedule a meeting with the team on Friday at 2:30"
"Hey Sausage, add dinner with Sarah to my calendar tonight at 7"
"Hey Sausage, make an all-day event called Beach Trip on July 15th"
"Hey Sausage, set up a dentist appointment next Tuesday at 10am at the clinic"
```

#### Supported Parameters

- **Title**: Automatically extracted from the command
- **Date**: Tomorrow, today, next Monday, specific dates
- **Time**: 3pm, 14:30, 9 AM
- **Duration**: "for 1 hour", "for 30 minutes"
- **Location**: "at the office", "in the conference room"
- **All-day events**: "all-day"

### 🔮 Future Commands (Extensible)

The system is designed to support additional command types:

- **Reminders**: "Remind me to call mom at 5pm"
- **Lists**: "Add milk to the shopping list"
- **Queries**: "What's on my calendar tomorrow?"
- **Updates**: "Move my 2pm meeting to 3pm"
- **Deletions**: "Cancel my dentist appointment"

## Architecture

### Core Components

```
apps/electron/src/main/voice/
├── VoiceService.ts          # Main orchestrator
├── WakeWordDetector.ts      # Listens for "Hey Sausage"
├── SpeechRecognizer.ts      # Whisper integration
├── CommandParser.ts         # NLP for extracting intent
├── AudioFeedback.ts         # Success/error sounds
├── actions/
│   ├── ActionRegistry.ts    # Extensible action system
│   └── CalendarAction.ts    # Calendar command handler
└── types.ts                 # TypeScript definitions
```

### Data Flow

1. **Wake Word Detection** → Continuous listening for "Hey Sausage"
2. **Recording** → Captures 10 seconds of audio after wake word
3. **Transcription** → Whisper converts audio to text
4. **Parsing** → CommandParser extracts intent and parameters
5. **Execution** → ActionRegistry routes to appropriate handler
6. **Feedback** → Audio ping + visual status update

## Installation & Setup

### Dependencies

The voice system requires these Node.js packages:

```json
{
  "whisper-node": "^1.1.1",        // Whisper AI bindings
  "node-record-lpcm16": "^1.0.1"   // Audio recording
}
```

### System Requirements

**Audio Recording**:
- Linux: Install SoX (`sudo apt-get install sox`)
- macOS: SoX is pre-installed
- Windows: Install SoX from [sox.sourceforge.net](http://sox.sourceforge.net/)

**Whisper Models**:
- Models auto-download on first use
- Stored in: `~/.home-dashboard/whisper-models/`
- Available models: tiny, base, small, medium, large
- Default: `base` (74MB, good balance of speed/accuracy)

### Installation

```bash
# Install dependencies
pnpm install

# The system will automatically:
# 1. Download the Whisper model on first run
# 2. Initialize the voice service when you authenticate
# 3. Start listening for the wake word
```

## Usage

### In the Electron App

1. **Authenticate** with your device token
2. **Voice button** appears in the header (microphone icon)
3. **Green pulsing** indicates voice commands are active
4. **Say the wake word**: "Hey Sausage"
5. **Wait for beep** (listening started)
6. **Speak your command** clearly
7. **Visual feedback** shows transcription and result

### UI Controls

- **🎤 Button (Green)**: Voice commands active
- **🔇 Button (Gray)**: Voice commands paused
- **Footer Status**: Shows current voice activity

### Status Messages

- `"Say 'Hey Sausage' to give a command"` - Ready
- `"🎤 Listening..."` - Wake word detected
- `"🎤 Speak now..."` - Recording command
- `"⏳ Processing..."` - Transcribing
- `"📝 [transcript]"` - What you said
- `"✅ Created event..."` - Success
- `"❌ Error: ..."` - Failed

## Configuration

### Changing the Wake Word

Update in `apps/electron/src/main/main.ts`:

```typescript
voiceService = new VoiceService({
  wakeWord: 'hey jarvis',  // Change to your preferred phrase
  whisperModel: 'base',
  language: 'en',
});
```

### Whisper Model Selection

Trade-off between speed and accuracy:

- `tiny` (39MB): Fastest, less accurate
- `base` (74MB): **Default** - good balance
- `small` (244MB): More accurate, slower
- `medium` (769MB): Very accurate, much slower
- `large` (1.5GB): Best accuracy, slowest

### Recording Timeout

Adjust in `VoiceConfig`:

```typescript
{
  recordingTimeout: 10,  // seconds (default: 10)
}
```

## Adding Custom Commands

### 1. Define New Intent

In `types.ts`:

```typescript
export type CommandIntent =
  | 'CREATE_EVENT'
  | 'CREATE_REMINDER'  // Add new intent
  | ...
```

### 2. Create Action Handler

Create `apps/electron/src/main/voice/actions/ReminderAction.ts`:

```typescript
import type { ActionHandler, ParsedCommand, ActionContext, ActionResult } from '../types';

export class ReminderAction implements ActionHandler {
  readonly name = 'ReminderAction';
  readonly intents = ['CREATE_REMINDER'];

  canHandle(command: ParsedCommand): boolean {
    return this.intents.includes(command.intent);
  }

  async execute(command: ParsedCommand, context: ActionContext): Promise<ActionResult> {
    // Implement reminder logic
    return {
      success: true,
      message: 'Reminder created!',
    };
  }
}
```

### 3. Register Handler

In `VoiceService.ts`:

```typescript
private registerDefaultActions(): void {
  this.actionRegistry.register(new CalendarAction());
  this.actionRegistry.register(new ReminderAction());  // Add this
}
```

### 4. Update Parser

In `CommandParser.ts`, add detection logic:

```typescript
private detectIntent(transcript: string): CommandIntent {
  if (/\bremind(er)?\b/i.test(transcript)) {
    return 'CREATE_REMINDER';
  }
  // ... other intents
}
```

## Troubleshooting

### Voice commands not working

1. **Check microphone permissions**
   - System Settings → Privacy → Microphone
   - Allow Electron app access

2. **Test audio recording**
   ```bash
   rec test.wav  # Should record from mic
   ```

3. **Check console logs**
   - Open DevTools (Cmd/Ctrl + Shift + I)
   - Look for voice service initialization messages

### Wake word not detected

- **Speak clearly** and at normal volume
- **Reduce background noise**
- Try **different wake word** (some phrases work better)
- Check **VAD threshold** (adjust in WakeWordDetector)

### Whisper model download failed

- **Check internet connection** (first-time only)
- **Check disk space** (models can be large)
- **Manually download** and place in model directory

### Poor transcription accuracy

- **Upgrade model**: Change to `small` or `medium`
- **Reduce background noise**
- **Speak closer to microphone**
- **Adjust language** if not English

## Performance

### Model Comparison

| Model  | Size  | Speed      | Accuracy | Recommended For           |
|--------|-------|------------|----------|---------------------------|
| tiny   | 39MB  | Very Fast  | 70%      | Testing                   |
| base   | 74MB  | Fast       | 85%      | **Default** - Daily use   |
| small  | 244MB | Medium     | 92%      | Better accuracy needed    |
| medium | 769MB | Slow       | 95%      | Professional use          |
| large  | 1.5GB | Very Slow  | 98%      | Maximum accuracy          |

### Resource Usage

- **CPU**: Uses 1-2 cores during transcription
- **Memory**: 200-500MB depending on model
- **Disk**: Model size + 50MB for audio buffers

## Privacy & Security

✅ **Fully Offline**: No data sent to external servers
✅ **Local Processing**: All speech recognition runs on-device
✅ **No Cloud**: Whisper model stored locally
✅ **No Logging**: Audio deleted after processing

## Future Enhancements

### Planned Features

- [ ] Text-to-speech responses
- [ ] Multiple wake words
- [ ] Conversation context (follow-up commands)
- [ ] Custom vocabularies
- [ ] Offline training for personalization
- [ ] Multi-language support
- [ ] Voice profile recognition

### Contribution

To add new features:

1. Implement action handler in `actions/`
2. Update `CommandParser` for new patterns
3. Add tests
4. Update this documentation

## API Reference

### VoiceService

```typescript
class VoiceService {
  async initialize(userId: string, familyId: string): Promise<void>
  async start(): Promise<void>
  stop(): void
  on(callback: VoiceEventCallback): void
  registerAction(handler: ActionHandler): void
  isActive(): boolean
}
```

### Events

```typescript
type VoiceEvent =
  | { type: 'wake_word_detected' }
  | { type: 'listening_started' }
  | { type: 'listening_stopped' }
  | { type: 'speech_recognized'; transcript: string }
  | { type: 'command_parsed'; command: ParsedCommand }
  | { type: 'command_executed'; result: ActionResult }
  | { type: 'error'; error: string }
```

## License

Part of the Home Dashboard project. See root LICENSE file.

## Support

For issues or questions:
- Check the GitHub issues
- Review console logs in DevTools
- Test with different wake words and models
