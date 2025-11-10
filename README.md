# Home Dashboard

A modern, offline-first family calendar and organizer inspired by Skylight Calendar. Built with Electron, Svelte 5, and Supabase.

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🎯 Features

### ✅ Implemented
- **Calendar Views**: Day, Week, and Month views with real-time sync
- **Event Management**: Create, edit, and delete calendar events
- **Device Pairing**: Automatic pairing between Electron app and web account via deep links
- **Voice Commands**: Offline speech recognition with Whisper AI ("Hey Sausage")
- **Offline-Ready UI**: Built with offline-first principles (sync engine TODO)
- **Monorepo Architecture**: Shared components between web and desktop apps

### 🚧 In Progress
- Voice command enhancements (chores, lists, meals)
- Offline sync engine with SQLite
- Conflict resolution system

### 📋 Planned
- Chores management with assignment and tracking
- Shopping and todo lists
- Meal planning calendar
- Smart notifications and reminders
- AI-powered suggestions
- Mobile apps (iOS/Android)

## 🏗️ Architecture

```
home-dashboard/
├── apps/
│   ├── web/                    # SvelteKit web application
│   └── electron/               # Electron desktop app
├── packages/
│   ├── ui/                     # Shared Svelte 5 components
│   ├── database/               # Supabase client & queries
│   └── sync/                   # Offline sync engine (TODO)
└── supabase/
    └── migrations/             # Database schema
```

### Tech Stack

- **Frontend**: Svelte 5 with Runes
- **Web Framework**: SvelteKit 2
- **Desktop**: Electron 33
- **Database**: Supabase (PostgreSQL)
- **Build System**: Turborepo
- **Package Manager**: pnpm
- **Voice AI**: Whisper (offline)
- **Local Storage**: SQLite (better-sqlite3)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Supabase project (free tier works)

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd home-dashboard

# Install dependencies
pnpm install --ignore-scripts

# Set up environment variables
cp apps/web/.env.example apps/web/.env
cp apps/electron/.env.example apps/electron/.env
# Edit .env files with your Supabase credentials

# Start development servers
pnpm dev
```

### Web App
- Navigate to http://localhost:5173
- Sign up for an account
- Create a family and start using the calendar

### Electron App
- The desktop app will launch automatically
- Click "Open Web App for Automatic Pairing"
- Log in with your account
- Device pairs automatically via deep link callback
- Start using the calendar and voice commands

## 📚 Documentation

- **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** - Complete technical documentation
- **[TASKS.md](./TASKS.md)** - Detailed task breakdown and roadmap
- **[BOOTSTRAP.md](./BOOTSTRAP.md)** - Guide to creating project from scratch

## 🎤 Voice Commands

The Electron app includes offline voice recognition:

```
"Hey Sausage, add event dinner with friends on Friday at 7 PM"
"Hey Sausage, create event dentist appointment tomorrow at 2 PM"
```

### How It Works
1. Say the wake word: "Hey Sausage"
2. Wait for the listening indicator
3. Speak your command
4. AI processes it locally with Whisper
5. Event is created automatically

## 🔐 Device Pairing

Automatic pairing flow:
1. Open Electron app → Click "Open Web App"
2. Browser opens with device info
3. Web app generates token and redirects to `homedashboard://paired?token=xxx`
4. Electron intercepts and stores token
5. App reloads authenticated

Fallback: Manual two-word pairing code entry

## 🗂️ Database Schema

### Core Tables
- `users` - User accounts (extends Supabase auth)
- `families` - Family groups
- `family_members` - User-family associations
- `events` - Calendar events
- `chores` - Household chores (TODO)
- `lists` - Shopping/todo lists (TODO)
- `meal_plans` - Meal planning (TODO)

### Device Authentication
- `device_pairing_codes` - Temporary 2-word codes
- `device_tokens` - Long-lived device tokens (90 days)

## 🧪 Development

### Run Individual Apps

```bash
# Web app only
pnpm --filter @home-dashboard/web dev

# Electron only
pnpm --filter @home-dashboard/electron dev
```

### Build for Production

```bash
# Build all packages
pnpm build

# Build web app
pnpm --filter @home-dashboard/web build

# Build Electron app
pnpm --filter @home-dashboard/electron build
```

### Database Migrations

```bash
cd supabase
supabase db push
```

## 🐛 Known Issues

- **Web app stuck on spinner**: Run `pnpm install --ignore-scripts` if dependencies fail
- **Electron voice on Linux**: Install SoX manually (`sudo apt install sox`)
- **Offline sync not implemented**: Both apps currently require internet connection

## 🗺️ Roadmap

### Phase 1: Core Features ✅
- [x] Authentication system
- [x] Calendar views and events
- [x] Device pairing
- [x] Voice commands (basic)

### Phase 2: Offline Support 🚧
- [ ] SQLite integration
- [ ] Sync engine
- [ ] Conflict resolution
- [ ] Operation queue

### Phase 3: Extended Features 📋
- [ ] Chores management
- [ ] Shopping/todo lists
- [ ] Meal planning
- [ ] Notifications

### Phase 4: AI & Polish 🔮
- [ ] Smart suggestions
- [ ] Natural language processing
- [ ] Advanced voice commands
- [ ] Mobile apps

See [TASKS.md](./TASKS.md) for detailed breakdown.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines first.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details

## 🙏 Acknowledgments

- **Skylight Calendar** - Inspiration for the project
- **Supabase** - Backend infrastructure
- **Whisper AI** - Offline speech recognition
- **Svelte** - Reactive UI framework
- **Electron** - Cross-platform desktop framework

## 📊 Status

### Current Phase: **Offline Sync Implementation**

**What Works**:
- ✅ Full calendar functionality (online)
- ✅ Device authentication
- ✅ Voice commands for calendar
- ✅ Real-time sync between devices
- ✅ Shared UI components

**What's Missing**:
- ❌ Offline support (critical)
- ❌ Chores UI
- ❌ Lists UI
- ❌ Meal planning UI
- ❌ Notifications
- ❌ Mobile apps

**Next Up**:
1. Implement SQLite storage in Electron
2. Build sync engine for offline support
3. Add conflict resolution
4. Create chores management UI
5. Build lists management UI

---

**Made with ❤️ for families who want a better way to stay organized**
