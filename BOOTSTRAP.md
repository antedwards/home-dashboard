# Bootstrap New Home Dashboard Project

This guide shows how to create the project from scratch with the same architecture.

## Quick Start (Use Existing)

If you want to use the current implementation:


```bash
git clone <your-repo>
cd home-dashboard
pnpm install --ignore-scripts
cp apps/web/.env.example apps/web/.env
cp apps/electron/.env.example apps/electron/.env
# Edit .env files with your Supabase credentials
pnpm dev
```

## Create From Scratch

Follow these steps to bootstrap a new monorepo with the same structure.

### 1. Initialize Monorepo

```bash
mkdir home-dashboard
cd home-dashboard

# Initialize root package.json
pnpm init

# Create workspace configuration
cat > pnpm-workspace.yaml << EOF
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# Install Turborepo
pnpm add -D turbo

# Create turbo.json
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**", ".svelte-kit/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "type-check": {
      "dependsOn": ["^type-check"]
    }
  }
}
EOF

# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
build/
dist/
.svelte-kit/
.next/

# Misc
.DS_Store
*.pem
.env
.env.local
.env.*.local

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
Thumbs.db

# Turbo
.turbo/

# Electron
out/
dist-electron/
release/
EOF

# Create directories
mkdir -p apps packages supabase/migrations
```

### 2. Bootstrap Web App (SvelteKit)

```bash
cd apps
pnpm create svelte@latest web
# Choose: SvelteKit demo app, TypeScript, ESLint, Prettier

cd web

# Install dependencies
pnpm add @home-dashboard/ui @home-dashboard/database
pnpm add -D @sveltejs/adapter-auto

# Update package.json
cat > package.json << 'EOF'
{
  "name": "@home-dashboard/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "type-check": "svelte-check --tsconfig ./tsconfig.json"
  },
  "dependencies": {
    "@home-dashboard/database": "workspace:*",
    "@home-dashboard/ui": "workspace:*"
  },
  "devDependencies": {
    "@sveltejs/adapter-auto": "^3.3.1",
    "@sveltejs/kit": "^2.9.0",
    "@sveltejs/vite-plugin-svelte": "^5.0.3",
    "svelte": "^5.2.9",
    "svelte-check": "^4.0.8",
    "typescript": "^5.7.2",
    "vite": "^6.0.3"
  }
}
EOF

# Create .env.example
cat > .env.example << 'EOF'
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
EOF

cd ../..
```

### 3. Bootstrap Electron App

```bash
cd apps

# Create electron directory
mkdir -p electron/src/{main,renderer}

# Create package.json
cat > electron/package.json << 'EOF'
{
  "name": "@home-dashboard/electron",
  "version": "0.1.0",
  "private": true,
  "description": "Home Dashboard - Desktop Application",
  "main": "dist-electron/main.js",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build && electron-builder",
    "preview": "vite preview",
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@home-dashboard/database": "workspace:*",
    "@home-dashboard/ui": "workspace:*",
    "better-sqlite3": "^11.7.0",
    "node-record-lpcm16": "^1.0.1",
    "whisper-node": "^1.1.1"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^5.0.3",
    "@types/better-sqlite3": "^7.6.12",
    "electron": "^33.2.1",
    "electron-builder": "^25.1.8",
    "svelte": "^5.2.9",
    "typescript": "^5.7.2",
    "vite": "^6.0.3",
    "vite-plugin-electron": "^0.29.0",
    "vite-plugin-electron-renderer": "^0.14.6"
  },
  "build": {
    "appId": "com.homedashboard.app",
    "productName": "Home Dashboard",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "dist-electron/**/*"
    ],
    "mac": {
      "category": "public.app-category.productivity",
      "target": ["dmg"]
    },
    "win": {
      "target": ["nsis"]
    },
    "linux": {
      "target": ["AppImage"],
      "category": "Utility"
    }
  }
}
EOF

# Create vite.config.ts
cat > electron/vite.config.ts << 'EOF'
import { defineConfig, loadEnv } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import electron from 'vite-plugin-electron/simple';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      svelte({
        compilerOptions: {
          runes: true,
        },
      }),
      electron({
        main: {
          entry: 'src/main/main.ts',
          vite: {
            build: {
              outDir: 'dist-electron',
              rollupOptions: {
                external: [
                  'electron',
                  'better-sqlite3',
                  'node-record-lpcm16',
                  'whisper-node',
                ],
              },
            },
            define: {
              'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
              'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
            },
          },
        },
        preload: {
          input: 'src/main/preload.ts',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/renderer'),
      },
    },
    server: {
      port: 5173,
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        external: ['crypto', 'fs', 'path', 'os'],
      },
    },
    optimizeDeps: {
      exclude: ['crypto', 'fs', 'path', 'os'],
    },
  };
});
EOF

# Create svelte.config.js
cat > electron/svelte.config.js << 'EOF'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    runes: true
  }
};
EOF

# Create tsconfig.json
cat > electron/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "types": ["svelte", "node"],
    "paths": {
      "@/*": ["./src/renderer/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.svelte"],
  "exclude": ["node_modules"]
}
EOF

# Create .env.example
cat > electron/.env.example << 'EOF'
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Web App URL (for device pairing)
VITE_WEB_APP_URL=http://localhost:5173

# Optional: Development settings
VITE_DEV_MODE=true
EOF

# Create index.html
cat > electron/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Home Dashboard</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/renderer/main.ts"></script>
  </body>
</html>
EOF

cd ../..
```

### 4. Create Shared UI Package

```bash
cd packages
mkdir -p ui/src/components ui/src/types ui/src/utils

# Create package.json
cat > ui/package.json << 'EOF'
{
  "name": "@home-dashboard/ui",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts",
    "./utils": "./src/utils/calendar.ts"
  },
  "dependencies": {
    "svelte": "^5.2.9"
  },
  "devDependencies": {
    "typescript": "^5.7.2"
  }
}
EOF

# Create index.ts
cat > ui/src/index.ts << 'EOF'
// Calendar Components
export { default as DayView } from './components/DayView.svelte';
export { default as WeekView } from './components/WeekView.svelte';
export { default as MonthView } from './components/MonthView.svelte';
export { default as EventModal } from './components/EventModal.svelte';
export { default as Modal } from './components/Modal.svelte';

// Form Components
export { default as Button } from './components/Button.svelte';
export { default as Input } from './components/Input.svelte';

// Types
export * from './types';

// Utilities
export * from './utils/calendar';
EOF

# Create types
cat > ui/src/types/index.ts << 'EOF'
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  all_day: boolean;
  location?: string;
  color?: string;
  category?: 'event' | 'birthday' | 'appointment' | 'reminder';
  userId?: string;
}

export type CalendarView = 'day' | 'week' | 'month';
EOF

cd ../..
```

### 5. Create Database Package

```bash
cd packages
mkdir -p database/src

# Create package.json
cat > database/package.json << 'EOF'
{
  "name": "@home-dashboard/database",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./browser": "./src/browser.ts",
    "./types": "./src/types.ts",
    "./client": "./src/client.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.47.10"
  },
  "devDependencies": {
    "typescript": "^5.7.2"
  }
}
EOF

# Create client.ts
cat > database/src/client.ts << 'EOF'
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function createSupabaseClient(
  supabaseUrl: string,
  supabaseAnonKey: string
): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
EOF

# Create types.ts
cat > database/src/types.ts << 'EOF'
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Family {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  family_id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: Date;
  end_time: Date;
  all_day: boolean;
  location?: string;
  color?: string;
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface DeviceToken {
  id: string;
  user_id: string;
  device_id: string;
  device_name?: string;
  device_type: string;
  token_hash: string;
  last_used_at?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface DevicePairingCode {
  id: string;
  code: string;
  user_id?: string;
  expires_at: string;
  used: boolean;
  device_id?: string;
  created_at: string;
}
EOF

# Create index.ts
cat > database/src/index.ts << 'EOF'
export * from './types';
export * from './client';
export * from './queries';
export * from './auth';
EOF

# Create browser.ts
cat > database/src/browser.ts << 'EOF'
// Browser/Renderer-safe exports (no Node.js crypto)
export * from './types';
export * from './client';
export * from './queries';

// Note: Auth functions use Node.js crypto, not exported here
EOF

cd ../..
```

### 6. Create Sync Package (Stub)

```bash
cd packages
mkdir -p sync/src

cat > sync/package.json << 'EOF'
{
  "name": "@home-dashboard/sync",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@home-dashboard/database": "workspace:*",
    "better-sqlite3": "^11.7.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "typescript": "^5.7.2"
  }
}
EOF

cat > sync/src/index.ts << 'EOF'
// Offline sync engine
// TODO: Implement
export class SyncEngine {
  // ...
}
EOF

cd ../..
```

### 7. Set Up Supabase Migrations

```bash
# Copy migrations from existing project or create new ones
# See IMPLEMENTATION.md for full schema

cat > supabase/migrations/001_initial_schema.sql << 'EOF'
-- See IMPLEMENTATION.md for complete schema
-- This is a stub - copy the full schema from the docs
EOF
```

### 8. Update Root Package.json

```bash
cat > package.json << 'EOF'
{
  "name": "home-dashboard",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check"
  },
  "devDependencies": {
    "turbo": "^2.3.3",
    "@types/node": "^24.10.0",
    "typescript": "^5.7.2"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  },
  "packageManager": "pnpm@8.15.0"
}
EOF
```

### 9. Install Dependencies

```bash
# Install all dependencies
pnpm install

# If Electron postinstall fails, run:
pnpm install --ignore-scripts
```

### 10. Create Environment Files

```bash
# Web app
cp apps/web/.env.example apps/web/.env
# Edit with your Supabase credentials

# Electron app
cp apps/electron/.env.example apps/electron/.env
# Edit with your Supabase credentials
```

### 11. Start Development

```bash
# Start all apps
pnpm dev

# Or start individually
pnpm --filter @home-dashboard/web dev
pnpm --filter @home-dashboard/electron dev
```

## Architecture Decisions

### Why Separate Electron Renderer from SvelteKit?

**SvelteKit is server-side**: It expects Node.js server capabilities (routing, SSR, etc.)
**Electron renderer is browser**: It's a Chromium instance without server features

**Solution**:
- Web app uses SvelteKit (for web deployment)
- Electron uses plain Svelte 5 + Vite (for renderer)
- Both share components via @home-dashboard/ui package

### Code Sharing Strategy

**Shared** (@home-dashboard/ui):
- Svelte 5 components (DayView, WeekView, etc.)
- TypeScript types
- Utilities (calendar calculations, formatters)
- Styles (optional)

**Not Shared**:
- Routing (SvelteKit routes vs Electron single page)
- Authentication UI (different flows)
- IPC handlers (Electron only)
- Voice commands (Electron only)
- Server-side code (web only)

### Offline-First Architecture

**Local Storage** (Electron):
- SQLite database with better-sqlite3
- Stores all data locally
- Fast reads, no network latency

**Sync Engine**:
- Bidirectional sync with Supabase
- Conflict resolution (last-write-wins + vector clocks)
- Operation queue for offline changes
- Background sync worker

**Web App**:
- Online-only (uses Supabase directly)
- Could add service worker for basic caching
- Could use IndexedDB for offline (future)

## Next Steps

1. **Review IMPLEMENTATION.md** for complete feature details
2. **Review TASKS.md** for development roadmap
3. **Copy source code** from existing implementation
4. **Set up Supabase** project and run migrations
5. **Configure environment variables**
6. **Start development**

## Troubleshooting

### Vite not found
```bash
pnpm install --ignore-scripts
```

### Preload script not loading
- Check extension is `.mjs` for ESM modules
- Verify preload config in vite.config.ts
- Check browser console for errors

### Supabase connection issues
- Verify environment variables are set
- Check Supabase project is active
- Test connection in browser console

### Voice commands not working
- Check SoX is installed (macOS: pre-installed)
- Verify microphone permissions
- Check Whisper model downloaded
- View Electron main process logs

## Resources

- Full documentation: IMPLEMENTATION.md
- Task breakdown: TASKS.md
- Repository: (add your repo URL)
