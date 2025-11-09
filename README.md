# Home Dashboard

A smart family calendar and home dashboard inspired by Skylight Calendar, built with Electron, Svelte 5, and Supabase.

## Features

- 📅 **Multi-View Calendar** - Day, week, month, and agenda views
- 👨‍👩‍👧‍👦 **Family Organization** - Chores, lists, and shared calendars
- 🍽️ **Meal Planning** - Plan meals and auto-generate grocery lists
- 🔄 **Offline-First Sync** - Works without internet, syncs when available
- 🤖 **AI-Powered Magic Import** - Import events from emails, photos, and PDFs
- 🌤️ **Weather Integration** - Location-based forecasts
- 📱 **Web & Desktop Apps** - Access from anywhere

## Architecture

This is a Turborepo monorepo containing:

### Apps

- **`apps/electron`** - Desktop application (Electron + Svelte 5)
- **`apps/web`** - Web application (SvelteKit + Svelte 5)

### Packages

- **`packages/ui`** - Shared Svelte 5 components
- **`packages/database`** - Supabase types, schemas, and queries
- **`packages/sync`** - Offline-first sync engine

## Tech Stack

- **Framework:** Electron, SvelteKit, Svelte 5
- **Backend:** Supabase (PostgreSQL, Realtime, Auth, Storage)
- **Build:** Turborepo, Vite, pnpm
- **Language:** TypeScript
- **Styling:** TailwindCSS

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development servers
pnpm dev
```

### Development Commands

```bash
# Run all apps in development mode
pnpm dev

# Build all apps
pnpm build

# Run linting
pnpm lint

# Run tests
pnpm test

# Format code
pnpm format

# Type check
pnpm type-check
```

## Project Structure

```
home-dashboard/
├── apps/
│   ├── electron/          # Electron desktop app
│   │   ├── src/
│   │   │   ├── main/      # Electron main process
│   │   │   └── renderer/  # Svelte 5 UI
│   │   └── package.json
│   └── web/               # SvelteKit web app
│       ├── src/
│       │   ├── routes/
│       │   └── lib/
│       └── package.json
├── packages/
│   ├── ui/                # Shared Svelte components
│   │   ├── src/
│   │   └── package.json
│   ├── database/          # Supabase integration
│   │   ├── src/
│   │   ├── supabase/
│   │   └── package.json
│   └── sync/              # Sync engine
│       ├── src/
│       └── package.json
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── SKYLIGHT_FUNCTIONALITY.md
```

## Documentation

- [Skylight Functionality Reference](./SKYLIGHT_FUNCTIONALITY.md) - Complete feature documentation
- [Development Roadmap](./DEVELOPMENT_TASKS.md) - Phase-based development plan
- [Architecture Guide](./docs/ARCHITECTURE.md) - Technical architecture (TODO)

## Development Phases

1. **Phase 1: MVP** - Core calendar with basic sync (4-6 weeks)
2. **Phase 2: Family Features** - Multi-user, chores, lists (4-6 weeks)
3. **Phase 3: Advanced** - Meal planning, AI import, rewards (6-8 weeks)
4. **Phase 4: Enhancements** - Voice, notifications, analytics (6-8 weeks)
5. **Phase 5: Integrations** - School, sports, shopping (4-6 weeks)
6. **Phase 6: Polish** - Performance, UX, accessibility (3-4 weeks)

See [SKYLIGHT_FUNCTIONALITY.md](./SKYLIGHT_FUNCTIONALITY.md) for complete feature breakdown.

## Contributing

This is a personal project, but contributions are welcome! Please open an issue first to discuss proposed changes.

## License

MIT

## Acknowledgments

Inspired by [Skylight Calendar](https://myskylight.com/calendar/)
