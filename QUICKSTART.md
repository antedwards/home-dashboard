# Quick Start Guide

Get up and running with Home Dashboard in 5 minutes.

## Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0 (install with `npm install -g pnpm`)
- **Supabase account** (free tier available at https://supabase.com)

## 1. Install Dependencies

```bash
pnpm install
```

## 2. Set Up Supabase

### Create a Supabase Project

1. Go to https://supabase.com
2. Create a new project
3. Wait for the project to be ready (~2 minutes)
4. Go to Project Settings > API
5. Copy your project URL and anon key

### Apply Database Schema

```bash
cd packages/database
# Copy your project URL when prompted
supabase link --project-ref YOUR_PROJECT_REF

# Apply the initial schema
supabase db push
```

## 3. Configure Environment Variables

```bash
# Create environment file
cp .env.example .env.local

# Edit .env.local and add your Supabase credentials
nano .env.local
```

Add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 4. Start Development Servers

### Run Everything (Recommended)

```bash
pnpm dev
```

This starts:
- **Electron app** on http://localhost:5173
- **Web app** on http://localhost:5174

### Run Individual Apps

```bash
# Electron app only
cd apps/electron
pnpm dev

# Web app only
cd apps/web
pnpm dev
```

## 5. Create Your First User

1. Open the web app at http://localhost:5174
2. Click "Sign Up"
3. Enter your email and password
4. Check your email for verification (if enabled)
5. Log in

## 6. Test Offline Sync

### In Electron App:
1. Create a few calendar events
2. Turn off WiFi
3. Create more events (they'll queue)
4. Turn WiFi back on
5. Watch events sync automatically

### In Web App:
1. Open DevTools
2. Go to Network tab
3. Enable "Offline" mode
4. Create events (stored locally)
5. Disable offline mode
6. Watch sync happen

## What's Next?

### Explore the Codebase

- **`apps/electron`** - Desktop application
- **`apps/web`** - Web application
- **`packages/ui`** - Shared Svelte 5 components
- **`packages/database`** - Supabase schemas and queries
- **`packages/sync`** - Offline-first sync engine

### Read the Documentation

- [SKYLIGHT_FUNCTIONALITY.md](./SKYLIGHT_FUNCTIONALITY.md) - Complete feature reference
- [DEVELOPMENT_TASKS.md](./DEVELOPMENT_TASKS.md) - Detailed development plan
- [README.md](./README.md) - Project overview

### Start Building

Follow the [DEVELOPMENT_TASKS.md](./DEVELOPMENT_TASKS.md) file to see what features to build next!

### Phase 1 (MVP) - Next Steps:

1. **Calendar Views**
   - Implement day/week/month views
   - Build event card components
   - Add event CRUD operations

2. **Offline Sync**
   - Test sync engine thoroughly
   - Handle conflict resolution
   - Add sync status UI

3. **Google Calendar Integration**
   - Set up OAuth 2.0
   - Implement calendar sync
   - Test with real Google accounts

## Common Issues

### pnpm install fails

```bash
# Clear cache and reinstall
pnpm store prune
rm -rf node_modules
pnpm install
```

### Supabase connection fails

- Check your `.env.local` has correct credentials
- Ensure Supabase project is running
- Check RLS policies are enabled

### Electron app won't start

```bash
# Rebuild native dependencies
cd apps/electron
pnpm rebuild
```

### TypeScript errors

```bash
# Run type check to see all errors
pnpm type-check
```

## Getting Help

- **Issues**: https://github.com/your-username/home-dashboard/issues
- **Discussions**: https://github.com/your-username/home-dashboard/discussions
- **Discord**: [Coming soon]

## Project Structure

```
home-dashboard/
├── apps/
│   ├── electron/          # Desktop app (Electron + Svelte 5)
│   │   ├── src/
│   │   │   ├── main/      # Electron main process
│   │   │   └── renderer/  # Svelte 5 UI
│   │   └── package.json
│   └── web/               # Web app (SvelteKit)
│       ├── src/
│       │   ├── routes/    # SvelteKit routes
│       │   └── lib/       # Shared utilities
│       └── package.json
├── packages/
│   ├── ui/                # Shared Svelte components
│   │   └── src/
│   │       └── components/
│   ├── database/          # Supabase integration
│   │   ├── src/           # Types, queries, schemas
│   │   └── supabase/      # Database migrations
│   └── sync/              # Offline-first sync engine
│       └── src/
├── .env.example           # Example environment variables
├── package.json           # Root package.json
├── pnpm-workspace.yaml    # pnpm workspace config
├── turbo.json             # Turborepo config
└── README.md              # Project documentation
```

## Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes in the appropriate package**
   ```bash
   cd packages/ui  # or apps/electron, etc.
   ```

3. **Run tests**
   ```bash
   pnpm test
   ```

4. **Lint and format**
   ```bash
   pnpm lint
   pnpm format
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "Add my feature"
   git push origin feature/my-feature
   ```

6. **Create pull request**

Happy coding! 🚀
