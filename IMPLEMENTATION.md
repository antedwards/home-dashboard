# Home Dashboard - Complete Implementation Documentation

## Project Overview

A Skylight Family Calendar clone built with Electron, Svelte 5, and Supabase, featuring offline-first architecture, voice commands, and automatic device pairing.

## Technology Stack

### Core Technologies
- **Frontend**: Svelte 5 (Runes API)
- **Web App**: SvelteKit 2
- **Desktop App**: Electron 33
- **Database**: Supabase (PostgreSQL)
- **Build System**: Turborepo (monorepo)
- **Package Manager**: pnpm

### Offline-First Architecture
- **Electron Storage**: SQLite (better-sqlite3) for local data
- **Sync Engine**: Custom sync with Supabase
- **Conflict Resolution**: Last-write-wins with vector clocks
- **Queue System**: Pending operations queue for offline changes

### Voice & AI
- **Speech Recognition**: Whisper AI (offline, local models)
- **Wake Word**: "Hey Sausage"
- **Voice Actions**: Calendar events, chores, lists
- **Audio Recording**: node-record-lpcm16 (SoX on macOS)

## Architecture

### Monorepo Structure

```
home-dashboard/
├── apps/
│   ├── web/                    # SvelteKit web application
│   │   ├── src/
│   │   │   ├── routes/         # SvelteKit routes
│   │   │   │   ├── +layout.svelte
│   │   │   │   ├── +page.svelte (calendar)
│   │   │   │   ├── auth/
│   │   │   │   │   ├── login/+page.svelte
│   │   │   │   │   └── signup/+page.svelte
│   │   │   │   ├── devices/
│   │   │   │   │   ├── +page.svelte (device management)
│   │   │   │   │   └── pair/+page.svelte (automatic pairing)
│   │   │   │   ├── chores/+page.svelte
│   │   │   │   ├── lists/+page.svelte
│   │   │   │   └── meals/+page.svelte
│   │   │   ├── lib/
│   │   │   │   ├── supabase.ts (singleton client)
│   │   │   │   └── stores/
│   │   │   │       └── calendar.svelte.ts
│   │   │   └── app.html
│   │   ├── .env.example
│   │   ├── package.json
│   │   ├── svelte.config.js
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   │
│   └── electron/               # Electron desktop application
│       ├── src/
│       │   ├── main/           # Main process (Node.js)
│       │   │   ├── main.ts     # App initialization, IPC handlers
│       │   │   ├── preload.ts  # Context bridge API
│       │   │   └── voice/      # Voice command system
│       │   │       ├── index.ts
│       │   │       ├── VoiceService.ts
│       │   │       ├── WakeWordDetector.ts
│       │   │       ├── SpeechRecognizer.ts
│       │   │       └── actions/
│       │   │           └── CalendarAction.ts
│       │   │
│       │   └── renderer/       # Renderer process (browser)
│       │       ├── App.svelte  # Main app component
│       │       ├── DevicePairing.svelte
│       │       ├── main.ts     # Entry point
│       │       ├── lib/
│       │       │   └── supabase.ts (singleton client)
│       │       └── stores/
│       │           └── calendar.svelte.ts
│       │
│       ├── .env.example
│       ├── index.html
│       ├── package.json
│       ├── svelte.config.js
│       ├── tsconfig.json
│       └── vite.config.ts
│
├── packages/
│   ├── ui/                     # Shared Svelte 5 components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── DayView.svelte
│   │   │   │   ├── WeekView.svelte
│   │   │   │   ├── MonthView.svelte
│   │   │   │   ├── EventModal.svelte
│   │   │   │   ├── Modal.svelte
│   │   │   │   ├── Button.svelte
│   │   │   │   └── Input.svelte
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   ├── utils/
│   │   │   │   └── calendar.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── database/               # Supabase client & queries
│   │   ├── src/
│   │   │   ├── index.ts        # Main exports (includes crypto)
│   │   │   ├── browser.ts      # Browser-safe exports
│   │   │   ├── client.ts       # Supabase client factory
│   │   │   ├── types.ts        # Database types
│   │   │   ├── schemas.ts      # Validation schemas
│   │   │   ├── queries.ts      # CRUD operations
│   │   │   └── auth.ts         # Device authentication
│   │   └── package.json
│   │
│   └── sync/                   # Offline sync engine (TODO)
│       ├── src/
│       │   ├── index.ts
│       │   ├── SyncEngine.ts
│       │   ├── LocalDatabase.ts (SQLite)
│       │   ├── ConflictResolver.ts
│       │   └── OperationQueue.ts
│       └── package.json
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       └── 002_authentication_devices.sql
│
├── .gitignore
├── package.json                # Root package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.json
```

## Database Schema

### Core Tables

**users** (extends Supabase auth.users)
- id (UUID, references auth.users)
- email (TEXT)
- name (TEXT)
- avatar_url (TEXT)
- color (TEXT) - for calendar color coding
- created_at, updated_at (TIMESTAMPTZ)

**families**
- id (UUID)
- name (TEXT)
- created_by (UUID → users.id)
- created_at, updated_at (TIMESTAMPTZ)

**family_members** (junction table)
- id (UUID)
- family_id (UUID → families.id)
- user_id (UUID → users.id)
- role (TEXT: 'admin', 'member')
- joined_at (TIMESTAMPTZ)

**events** (calendar events)
- id (UUID)
- family_id (UUID → families.id)
- user_id (UUID → users.id)
- title (TEXT)
- description (TEXT)
- start_time (TIMESTAMPTZ)
- end_time (TIMESTAMPTZ)
- all_day (BOOLEAN)
- location (TEXT)
- color (TEXT)
- category (TEXT: 'event', 'birthday', 'appointment', 'reminder')
- created_at, updated_at (TIMESTAMPTZ)

**chores**
- id (UUID)
- family_id (UUID → families.id)
- title (TEXT)
- description (TEXT)
- assigned_to (UUID → users.id)
- due_date (DATE)
- completed (BOOLEAN)
- recurring (TEXT: 'daily', 'weekly', 'monthly')
- created_at, updated_at (TIMESTAMPTZ)

**lists** (shopping lists, todo lists)
- id (UUID)
- family_id (UUID → families.id)
- name (TEXT)
- type (TEXT: 'shopping', 'todo')
- created_by (UUID → users.id)
- created_at, updated_at (TIMESTAMPTZ)

**list_items**
- id (UUID)
- list_id (UUID → lists.id)
- text (TEXT)
- checked (BOOLEAN)
- position (INTEGER)
- created_at, updated_at (TIMESTAMPTZ)

**meal_plans**
- id (UUID)
- family_id (UUID → families.id)
- date (DATE)
- meal_type (TEXT: 'breakfast', 'lunch', 'dinner')
- recipe (TEXT)
- notes (TEXT)
- created_at, updated_at (TIMESTAMPTZ)

### Device Authentication Tables

**device_pairing_codes** (temporary codes for device pairing)
- id (UUID)
- code (TEXT) - Two-word code like "apple-mountain"
- user_id (UUID → users.id)
- expires_at (TIMESTAMPTZ) - 10 minutes expiry
- used (BOOLEAN)
- device_id (UUID)
- created_at (TIMESTAMPTZ)

**device_tokens** (long-lived tokens for Electron)
- id (UUID)
- user_id (UUID → users.id)
- device_id (TEXT) - Unique device identifier
- device_name (TEXT) - e.g., "MacBook Pro (Electron)"
- device_type (TEXT: 'electron', 'ios', 'android')
- token_hash (TEXT) - SHA-256 hash of token
- last_used_at (TIMESTAMPTZ)
- expires_at (TIMESTAMPTZ) - 90 days expiry
- created_at, updated_at (TIMESTAMPTZ)
- UNIQUE(user_id, device_id)

## Key Features Implemented

### 1. Authentication System

**Web App (Admin Only)**
- Signup restricted (admin creates accounts)
- Email/password authentication via Supabase Auth
- Family creation and management
- User profile management

**Electron App (Device Pairing)**
- Automatic device pairing with deep link callback
- Two-word pairing codes as fallback
- Long-lived device tokens (90 days)
- Secure token storage using Electron safeStorage
- Protocol handler: `homedashboard://`

**Pairing Flow**:
1. User clicks "Open Web App for Automatic Pairing" in Electron
2. Browser opens with device info (deviceId, deviceName) in URL params
3. Web app generates device token and redirects to `homedashboard://paired?token=xxx`
4. Electron intercepts deep link and stores token
5. App reloads with user authenticated

### 2. Calendar UI

**Three Views**:
- **Day View**: Hour-by-hour timeline (6 AM - 10 PM)
- **Week View**: 7-day grid with events
- **Month View**: Traditional calendar grid

**Features**:
- Create, edit, delete events
- Drag & drop (TODO)
- Color coding by user
- All-day events
- Event categories (event, birthday, appointment, reminder)
- Real-time sync via Supabase subscriptions

**Components** (packages/ui/src/components/):
- DayView.svelte
- WeekView.svelte
- MonthView.svelte
- EventModal.svelte
- Modal.svelte
- Button.svelte
- Input.svelte

### 3. Voice Command System (Electron Only)

**Architecture**:
- **Wake Word Detection**: "Hey Sausage" (simple keyword matching)
- **Speech Recognition**: Whisper AI (offline, runs locally)
- **Command Processing**: Pattern matching and extraction
- **Audio Recording**: node-record-lpcm16 with SoX

**Voice Actions**:
- **Calendar**: "Add event [title] on [date] at [time]"
- **Chores**: "Add chore [title] for [person]" (TODO)
- **Lists**: "Add [item] to shopping list" (TODO)

**Implementation** (apps/electron/src/main/voice/):
- VoiceService.ts - Main service orchestrator
- WakeWordDetector.ts - Listens for wake word
- SpeechRecognizer.ts - Transcribes with Whisper
- actions/CalendarAction.ts - Calendar command handler

**Models**:
- Uses Whisper base model (~74MB)
- Auto-downloads on first use
- Cached in user data directory

### 4. Offline-First Architecture (Partial)

**Current State**:
- Web app: Online only, uses Supabase directly
- Electron: Online only, uses Supabase directly (NOT IDEAL)

**TODO - Proper Offline Support**:
- Local SQLite database in Electron
- Sync engine for bidirectional sync
- Conflict resolution (last-write-wins with vector clocks)
- Operation queue for offline changes
- Optimistic UI updates

### 5. Shared Component Architecture

**What's Shared** (via @home-dashboard/ui):
- Calendar views (DayView, WeekView, MonthView)
- EventModal component
- Form components (Button, Input)
- Calendar utilities (date formatting, calculations)
- TypeScript types

**What's NOT Shared**:
- SvelteKit routing (web app only)
- Electron IPC handlers (desktop app only)
- Voice commands (desktop app only)
- Authentication UI (different flows)

**How Sharing Works**:
- UI package exports Svelte 5 components
- Both apps import from @home-dashboard/ui
- Components use Svelte 5 Runes ($state, $derived)
- Props and events for customization

### 6. Build System (Turborepo)

**Configuration** (turbo.json):
```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", ".svelte-kit/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Workspace Structure** (pnpm-workspace.yaml):
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Scripts**:
- `pnpm install` - Install all dependencies
- `pnpm dev` - Run all apps in dev mode
- `pnpm build` - Build all packages and apps
- `turbo run dev --filter @home-dashboard/electron` - Run Electron only

## Environment Variables

### Web App (.env)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Electron App (.env)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_WEB_APP_URL=http://localhost:5173
VITE_DEV_MODE=true
```

## Critical Bug Fixes & Decisions

### 1. PostgreSQL UUID Generation
**Problem**: `uuid_generate_v4()` requires uuid-ossp extension
**Solution**: Use `gen_random_uuid()` (Postgres 13+ built-in)

### 2. Turborepo v2 Configuration
**Problem**: Deprecated "pipeline" key
**Solution**: Changed to "tasks" key

### 3. Multiple Supabase Client Instances
**Problem**: GoTrueClient warning in console
**Solution**: Created singleton Supabase client in both apps

### 4. Electron Preload Script Extension
**Problem**: ESM modules need .mjs extension
**Solution**: Changed preload path to `preload.mjs`

### 5. Node.js Crypto in Renderer
**Problem**: Can't use crypto module in renderer process
**Solution**:
- Created browser-safe exports (@home-dashboard/database/browser)
- Moved auth operations to main process via IPC
- Renderer uses IPC to call main process for crypto operations

### 6. Svelte 5 Component API
**Problem**: `new Component()` deprecated in Svelte 5
**Solution**: Use `mount(Component, { target })` API

### 7. Environment Variables in Electron Main Process
**Problem**: Vite env vars not available in main process
**Solution**: Use `loadEnv()` and `define` config to inject vars

## Database Functions

### Authentication Functions (packages/database/src/auth.ts)

**createDevicePairingCode(client, expiresInMinutes)**
- Generates two-word pairing code (e.g., "apple-mountain")
- Creates database entry with expiration
- Returns: `{ code, expires_at, user_id }`

**verifyPairingCodeAndCreateToken(client, code, deviceId, deviceName)**
- Verifies pairing code is valid and not expired
- Generates secure 32-byte token
- Stores token hash in device_tokens table
- Marks pairing code as used
- Returns: `{ token, deviceToken }`

**createDeviceTokenDirect(client, deviceId, deviceName)**
- Creates device token without pairing code (for automatic pairing)
- Used in deep link callback flow
- Returns: `{ token, deviceToken }`

**verifyDeviceToken(client, token, deviceId)**
- Validates stored device token on app startup
- Updates last_used_at timestamp
- Checks expiration (90 days)
- Returns: `{ valid, userId, needsRefresh }`

**getDeviceTokens(client)**
- Lists all devices for current user
- Returns: Array of DeviceToken

**revokeDeviceToken(client, tokenId)**
- Removes device from user's account

**extendDeviceToken(client, tokenId, days)**
- Extends expiration date

### Calendar Functions (packages/database/src/queries.ts)

**getEvents(client, familyId, startDate, endDate)**
- Fetches events for date range
- Returns: Array of Event

**createEvent(client, eventData)**
- Creates new calendar event
- Returns: Event

**updateEvent(client, eventId, updates)**
- Updates existing event
- Returns: Event

**deleteEvent(client, eventId)**
- Deletes event

## Electron IPC API

### Exposed to Renderer (apps/electron/src/main/preload.ts)

```typescript
window.electron = {
  // App info
  getVersion: () => Promise<string>
  getPath: (name: string) => Promise<string>
  openExternal: (url: string) => Promise<void>

  // Device authentication
  getDeviceId: () => Promise<string>
  getDeviceName: () => Promise<string>
  storeDeviceToken: (token: string) => Promise<void>
  getDeviceToken: () => Promise<string | null>
  clearDeviceToken: () => Promise<void>

  // Auth operations (run in main process)
  auth: {
    verifyDeviceToken: (token, deviceId) => Promise<{success, result, error}>
    verifyPairingCode: (code, deviceId, deviceName) => Promise<{success, result, error}>
  }

  // Voice commands
  voice: {
    initialize: (userId, familyId) => Promise<{success, error}>
    start: () => Promise<{success, error}>
    stop: () => Promise<{success, error}>
    isActive: () => Promise<boolean>
    getConfig: () => Promise<VoiceConfig>
    updateConfig: (config) => Promise<{success, error}>
    onEvent: (callback) => void
    offEvent: (callback) => void
  }
}
```

## Deployment Considerations

### Web App (SvelteKit)
- Deploy to Vercel, Netlify, or Cloudflare Pages
- Set environment variables in platform dashboard
- Build command: `pnpm build --filter @home-dashboard/web`
- Output: `.svelte-kit/output`

### Electron App
- Build for macOS: `electron-builder --mac`
- Build for Windows: `electron-builder --win`
- Build for Linux: `electron-builder --linux`
- Code signing required for distribution
- Auto-update configuration needed

### Supabase
- Deploy to Supabase cloud or self-hosted
- Run migrations: `supabase db push`
- Configure RLS policies
- Set up realtime subscriptions
- Monitor usage and scaling

## Development Setup

### Prerequisites
- Node.js 18+
- pnpm 8+
- SoX (macOS: pre-installed, Windows: choco install sox)
- Supabase CLI (optional)

### Initial Setup
```bash
# Clone repository
git clone <repo-url>
cd home-dashboard

# Install dependencies
pnpm install

# Set up environment variables
cp apps/web/.env.example apps/web/.env
cp apps/electron/.env.example apps/electron/.env
# Edit .env files with actual values

# Run migrations
cd supabase
supabase db push

# Start development servers
pnpm dev
```

### Running Apps Individually
```bash
# Web app only
pnpm --filter @home-dashboard/web dev

# Electron app only
pnpm --filter @home-dashboard/electron dev
```

## Testing Checklist

### Authentication
- [ ] Web signup creates new user
- [ ] Web login authenticates existing user
- [ ] Electron pairing with automatic callback works
- [ ] Electron pairing with manual code works as fallback
- [ ] Device token persists across restarts
- [ ] Device token expires after 90 days
- [ ] Multiple devices can be paired

### Calendar
- [ ] Day view displays events correctly
- [ ] Week view displays events correctly
- [ ] Month view displays events correctly
- [ ] Create event works in all views
- [ ] Edit event updates correctly
- [ ] Delete event removes from UI
- [ ] Real-time sync shows changes from other devices
- [ ] All-day events display correctly
- [ ] Color coding works per user

### Voice Commands (Electron)
- [ ] Wake word "Hey Sausage" triggers listening
- [ ] Speech recognition transcribes accurately
- [ ] Calendar event creation works via voice
- [ ] Voice status updates in UI
- [ ] Microphone permissions granted
- [ ] Whisper model downloads on first use

### Offline Support (TODO)
- [ ] Events created offline sync when online
- [ ] Events edited offline sync correctly
- [ ] Conflict resolution handles concurrent edits
- [ ] UI shows offline indicator
- [ ] Pending operations queue works
- [ ] Optimistic UI updates work

## Known Issues

1. **Web app spinner**: Dependencies need reinstall on fresh clone
2. **Electron voice on Linux**: SoX not pre-installed, needs manual install
3. **Offline sync**: Not yet implemented, both apps require internet
4. **Conflict resolution**: No strategy for concurrent edits
5. **Voice command accuracy**: Limited natural language understanding
6. **No mobile apps**: Only web and desktop currently

## Future Enhancements

### Phase 1 - Core Functionality
- [ ] Chores management UI
- [ ] Shopping lists UI
- [ ] Meal planning UI
- [ ] Recurring events
- [ ] Event notifications

### Phase 2 - Offline Support
- [ ] SQLite integration in Electron
- [ ] Sync engine implementation
- [ ] Conflict resolution
- [ ] Optimistic UI updates
- [ ] Background sync

### Phase 3 - Enhanced Voice
- [ ] Natural language processing
- [ ] More voice actions (chores, lists, meals)
- [ ] Voice responses (text-to-speech)
- [ ] Multiple language support
- [ ] Custom wake word

### Phase 4 - AI Features
- [ ] Smart event suggestions
- [ ] Meal planning recommendations
- [ ] Chore distribution optimization
- [ ] Calendar conflict detection
- [ ] Automatic categorization

### Phase 5 - Mobile Apps
- [ ] React Native or Flutter app
- [ ] Native iOS/Android builds
- [ ] Push notifications
- [ ] Widget support
- [ ] Share functionality

### Phase 6 - Collaboration
- [ ] Event comments
- [ ] @mentions for family members
- [ ] Event RSVPs
- [ ] Shared shopping lists (real-time)
- [ ] Activity feed

## Performance Considerations

- **Bundle size**: Keep UI package lightweight
- **Real-time subscriptions**: Limit to necessary channels
- **Voice models**: Use smallest Whisper model that works
- **Image optimization**: Compress avatars and photos
- **Database indexes**: Add indexes for common queries
- **Caching**: Use service workers for web app
- **Lazy loading**: Defer voice system initialization

## Security Considerations

- **Device tokens**: SHA-256 hashed in database
- **Pairing codes**: 10-minute expiration
- **RLS policies**: Enforce family-based access control
- **API keys**: Never commit to git
- **Deep links**: Validate token format before storing
- **Voice recordings**: Never uploaded, processed locally
- **Content Security Policy**: Strict CSP for web app

## License

(Add your license here)

## Contributors

(Add contributors here)

## Acknowledgments

- Skylight Family Calendar (inspiration)
- Supabase (backend infrastructure)
- Whisper AI (speech recognition)
- Electron community
- Svelte community
