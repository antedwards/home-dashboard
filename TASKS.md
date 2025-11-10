# Home Dashboard - Task Breakdown

## Project Phases

This document outlines all tasks required to build a complete Skylight Family Calendar alternative with enhanced features.

---

## Phase 0: Bootstrap & Setup ✅

### Repository Setup
- [x] Initialize Turborepo monorepo
- [x] Configure pnpm workspaces
- [x] Set up TypeScript configurations
- [x] Configure ESLint and Prettier
- [x] Create .gitignore files
- [x] Set up turbo.json for build caching

### Package Structure
- [x] Create @home-dashboard/ui package
- [x] Create @home-dashboard/database package
- [x] Create @home-dashboard/sync package (stub)
- [x] Configure package exports and imports
- [x] Set up TypeScript path aliases

### Web App (SvelteKit)
- [x] Initialize SvelteKit project
- [x] Configure Vite for Svelte 5
- [x] Set up routing structure
- [x] Create base layout
- [x] Configure environment variables

### Electron App
- [x] Initialize Electron + Vite project
- [x] Configure vite-plugin-electron
- [x] Set up main and renderer processes
- [x] Configure preload script
- [x] Set up environment variables
- [x] Configure Svelte 5 for renderer

### Supabase Setup
- [x] Initialize Supabase project
- [x] Create migrations folder
- [x] Configure local development (optional)

---

## Phase 1: Core Authentication & Database ✅

### Database Schema
- [x] Create users table
- [x] Create families table
- [x] Create family_members junction table
- [x] Create events table
- [x] Create chores table
- [x] Create lists table
- [x] Create list_items table
- [x] Create meal_plans table
- [x] Create device_pairing_codes table
- [x] Create device_tokens table
- [x] Add indexes for performance
- [x] Set up RLS policies

### Authentication Package
- [x] Create Supabase client factory
- [x] Implement device pairing code generation
- [x] Implement device token creation
- [x] Implement device token verification
- [x] Implement token refresh logic
- [x] Add createDeviceTokenDirect for automatic pairing
- [x] Create browser-safe exports

### Web App Authentication
- [x] Create login page
- [x] Create signup page (admin only)
- [x] Implement session management
- [x] Create device management page
- [x] Create automatic pairing page (/devices/pair)
- [x] Add user profile page (TODO)
- [x] Add logout functionality (TODO)

### Electron Authentication
- [x] Implement device pairing UI
- [x] Add automatic pairing with deep link callback
- [x] Add manual code entry as fallback
- [x] Implement secure token storage (safeStorage)
- [x] Add device info collection (ID, name)
- [x] Implement token verification on startup
- [x] Register homedashboard:// protocol handler
- [x] Handle deep link callbacks (macOS, Windows, Linux)

---

## Phase 2: Calendar Core Features ✅

### UI Components (Shared)
- [x] Create DayView component
- [x] Create WeekView component
- [x] Create MonthView component
- [x] Create EventModal component
- [x] Create Modal component
- [x] Create Button component
- [x] Create Input component
- [ ] Create DatePicker component
- [ ] Create TimePicker component
- [ ] Create ColorPicker component

### Calendar Logic
- [x] Implement calendar date calculations
- [x] Create calendar state store (Svelte 5 runes)
- [x] Implement event CRUD operations
- [x] Add real-time sync via Supabase subscriptions
- [x] Implement date navigation (prev/next/today)
- [x] Implement view switching (day/week/month)
- [ ] Add drag & drop for events
- [ ] Add event resize functionality
- [ ] Add recurring events
- [ ] Add event search/filter

### Web App Calendar
- [x] Create calendar page
- [x] Integrate shared components
- [x] Add navigation controls
- [x] Add view switcher
- [x] Connect to calendar store
- [x] Handle initialization errors
- [x] Add loading states

### Electron Calendar
- [x] Create calendar page
- [x] Integrate shared components
- [x] Add navigation controls
- [x] Add view switcher
- [x] Connect to calendar store
- [x] Handle authentication state
- [ ] Add offline indicator
- [ ] Add sync status

---

## Phase 3: Voice Commands (Electron Only) 🚧

### Voice System Core
- [x] Implement VoiceService orchestrator
- [x] Implement WakeWordDetector ("Hey Sausage")
- [x] Integrate Whisper AI for speech recognition
- [x] Add audio recording with node-record-lpcm16
- [x] Implement voice event system
- [x] Add IPC handlers for voice control
- [x] Expose voice API to renderer

### Voice Actions
- [x] Implement CalendarAction (create events)
- [ ] Implement ChoreAction (create/complete chores)
- [ ] Implement ListAction (add items to lists)
- [ ] Implement MealAction (add meal plans)
- [ ] Add command pattern matching
- [ ] Add natural language parsing
- [ ] Add voice feedback (text-to-speech)

### Voice UI
- [x] Add voice status indicator
- [x] Add microphone toggle button
- [x] Show voice transcripts
- [x] Display command results
- [ ] Add voice settings panel
- [ ] Add command history
- [ ] Add voice tutorial/help

### Voice Improvements
- [ ] Improve wake word accuracy
- [ ] Add custom wake word support
- [ ] Support multiple languages
- [ ] Add error recovery
- [ ] Optimize Whisper model selection
- [ ] Add voice activity detection (VAD)

---

## Phase 4: Offline-First Architecture ⚠️ NOT IMPLEMENTED

### SQLite Integration
- [ ] Add better-sqlite3 dependency
- [ ] Create local database schema
- [ ] Implement migration system for local DB
- [ ] Add database initialization on app start
- [ ] Create data access layer for SQLite

### Sync Engine
- [ ] Design sync protocol
- [ ] Implement SyncEngine class
- [ ] Add operation queue for pending changes
- [ ] Implement bidirectional sync (pull/push)
- [ ] Add conflict resolution (last-write-wins)
- [ ] Implement vector clocks for versioning
- [ ] Add background sync worker
- [ ] Handle network reconnection

### Local Storage
- [ ] Implement LocalDatabase class
- [ ] Add CRUD operations for local events
- [ ] Add CRUD operations for local chores
- [ ] Add CRUD operations for local lists
- [ ] Add CRUD operations for local meals
- [ ] Implement local search/filter
- [ ] Add data export/backup

### Optimistic UI
- [ ] Update UI immediately on user action
- [ ] Queue operations for sync
- [ ] Show pending indicator
- [ ] Handle sync failures
- [ ] Implement retry logic
- [ ] Add conflict resolution UI

### Offline Indicators
- [ ] Add network status detection
- [ ] Show offline badge in UI
- [ ] Display sync status
- [ ] Show pending operations count
- [ ] Add "force sync" button
- [ ] Show last sync timestamp

---

## Phase 5: Chores Management

### Database & API
- [ ] Verify chores table schema
- [ ] Add chore queries (CRUD)
- [ ] Add chore assignment logic
- [ ] Add recurring chore support
- [ ] Add chore completion tracking
- [ ] Add chore notifications

### UI Components
- [ ] Create ChoreList component
- [ ] Create ChoreCard component
- [ ] Create ChoreModal component
- [ ] Create ChoreAssignment component
- [ ] Add drag & drop for assignment
- [ ] Add recurring chore UI

### Web App
- [ ] Create /chores page
- [ ] Add chore list view
- [ ] Add create chore form
- [ ] Add edit chore functionality
- [ ] Add complete/uncomplete toggle
- [ ] Add filter by assignee
- [ ] Add filter by status

### Electron App
- [ ] Integrate chore UI
- [ ] Add voice commands for chores
- [ ] Add chore notifications
- [ ] Add offline chore creation
- [ ] Add chore sync

### Features
- [ ] Chore rotation (auto-assign)
- [ ] Chore streaks (gamification)
- [ ] Chore points/rewards
- [ ] Chore reminders
- [ ] Overdue chore highlighting

---

## Phase 6: Lists (Shopping, Todo)

### Database & API
- [ ] Verify lists and list_items tables
- [ ] Add list queries (CRUD)
- [ ] Add list_item queries (CRUD)
- [ ] Add list sharing logic
- [ ] Add real-time list updates
- [ ] Add list templates

### UI Components
- [ ] Create ListSelector component
- [ ] Create ListItems component
- [ ] Create ListItem component
- [ ] Create AddItemInput component
- [ ] Add drag & drop for reordering
- [ ] Add checkable items

### Web App
- [ ] Create /lists page
- [ ] Add list selector/tabs
- [ ] Add shopping list view
- [ ] Add todo list view
- [ ] Add create list functionality
- [ ] Add add item functionality
- [ ] Add check/uncheck items
- [ ] Add delete items
- [ ] Add list templates

### Electron App
- [ ] Integrate lists UI
- [ ] Add voice commands for lists
- [ ] Add "Add to list" from anywhere
- [ ] Add offline list management
- [ ] Add list sync

### Features
- [ ] Common items suggestions
- [ ] Smart categorization
- [ ] Quantity tracking
- [ ] Price tracking (optional)
- [ ] Store location sorting
- [ ] Shared lists (family)
- [ ] List history

---

## Phase 7: Meal Planning

### Database & API
- [ ] Verify meal_plans table
- [ ] Add meal plan queries (CRUD)
- [ ] Add recipe storage (optional)
- [ ] Add ingredient extraction
- [ ] Add meal templates

### UI Components
- [ ] Create MealCalendar component
- [ ] Create MealCard component
- [ ] Create MealModal component
- [ ] Create RecipeInput component
- [ ] Add meal type selector
- [ ] Add drag & drop for planning

### Web App
- [ ] Create /meals page
- [ ] Add weekly meal calendar
- [ ] Add meal plan creation
- [ ] Add recipe input
- [ ] Add meal templates
- [ ] Add grocery list generation
- [ ] Add meal history

### Electron App
- [ ] Integrate meal planning UI
- [ ] Add voice commands for meals
- [ ] Add meal notifications
- [ ] Add offline meal planning
- [ ] Add meal sync

### Features
- [ ] Recipe suggestions (AI)
- [ ] Leftover tracking
- [ ] Dietary restrictions
- [ ] Nutrition info (optional)
- [ ] Meal prep days
- [ ] Shopping list from meals
- [ ] Meal rotation suggestions

---

## Phase 8: Notifications & Reminders

### Web App Notifications
- [ ] Implement service worker
- [ ] Add push notification support
- [ ] Create notification permission UI
- [ ] Add notification preferences
- [ ] Implement notification dispatch

### Electron Notifications
- [ ] Use Electron Notification API
- [ ] Add system tray notifications
- [ ] Add notification sounds
- [ ] Add notification actions
- [ ] Implement Do Not Disturb mode

### Event Reminders
- [ ] Add reminder fields to events
- [ ] Implement reminder scheduling
- [ ] Add default reminder settings
- [ ] Add snooze functionality
- [ ] Add dismiss functionality

### Chore Reminders
- [ ] Add due date reminders
- [ ] Add overdue notifications
- [ ] Add completion confirmations
- [ ] Add daily digest

### Smart Notifications
- [ ] Event conflict warnings
- [ ] Upcoming events summary
- [ ] Chore rotation notifications
- [ ] Meal planning reminders
- [ ] Shopping list reminders

---

## Phase 9: AI Features

### Smart Event Suggestions
- [ ] Analyze calendar patterns
- [ ] Suggest recurring events
- [ ] Detect event conflicts
- [ ] Suggest optimal times
- [ ] Auto-categorize events

### Smart Meal Planning
- [ ] Suggest recipes based on history
- [ ] Rotate favorite meals
- [ ] Balance meal types
- [ ] Consider leftovers
- [ ] Generate weekly meal plan

### Smart Chore Distribution
- [ ] Balance chore workload
- [ ] Consider schedules
- [ ] Rotate assignments
- [ ] Suggest chore bundling
- [ ] Optimize chore timing

### Natural Language Processing
- [ ] Improve voice command parsing
- [ ] Extract dates/times from text
- [ ] Extract event details from text
- [ ] Support multiple formats
- [ ] Handle ambiguity

### AI Assistant
- [ ] Conversational interface
- [ ] Answer questions about schedule
- [ ] Provide suggestions
- [ ] Help with planning
- [ ] Learn from usage patterns

---

## Phase 10: Collaboration Features

### Real-Time Collaboration
- [ ] Show online family members
- [ ] Live cursor positions (optional)
- [ ] Conflict-free editing (CRDT)
- [ ] Real-time event updates
- [ ] Real-time list updates

### Comments & Mentions
- [ ] Add comments to events
- [ ] Add comments to chores
- [ ] Implement @mentions
- [ ] Add comment notifications
- [ ] Add comment threading

### Event RSVPs
- [ ] Add RSVP field to events
- [ ] Track attendance status
- [ ] Send RSVP reminders
- [ ] Show RSVP status in UI
- [ ] Add "Maybe" option

### Activity Feed
- [ ] Create activity log table
- [ ] Track all changes
- [ ] Display activity feed
- [ ] Filter by family member
- [ ] Filter by date range
- [ ] Add activity notifications

### Family Settings
- [ ] Add family name/settings
- [ ] Manage family members
- [ ] Set roles and permissions
- [ ] Configure notifications
- [ ] Set display preferences

---

## Phase 11: Mobile Apps

### Technology Decision
- [ ] Evaluate React Native
- [ ] Evaluate Flutter
- [ ] Evaluate Capacitor
- [ ] Choose framework
- [ ] Set up mobile project

### Core Features (iOS)
- [ ] Set up iOS project
- [ ] Implement authentication
- [ ] Create calendar views
- [ ] Add event CRUD
- [ ] Implement offline sync
- [ ] Add push notifications
- [ ] Create widgets
- [ ] Submit to App Store

### Core Features (Android)
- [ ] Set up Android project
- [ ] Implement authentication
- [ ] Create calendar views
- [ ] Add event CRUD
- [ ] Implement offline sync
- [ ] Add push notifications
- [ ] Create widgets
- [ ] Submit to Play Store

### Mobile-Specific Features
- [ ] Camera for photos
- [ ] Share to app
- [ ] Shortcuts/Siri
- [ ] Watch app (optional)
- [ ] Location-based reminders
- [ ] Biometric authentication

---

## Phase 12: Polish & Optimization

### Performance
- [ ] Optimize bundle sizes
- [ ] Implement code splitting
- [ ] Add lazy loading
- [ ] Optimize images
- [ ] Add database indexes
- [ ] Implement caching strategies
- [ ] Profile and optimize rendering

### Accessibility
- [ ] Add ARIA labels
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] High contrast mode
- [ ] Focus indicators
- [ ] Alt text for images
- [ ] WCAG 2.1 AA compliance

### Internationalization
- [ ] Set up i18n framework
- [ ] Extract all strings
- [ ] Add language selector
- [ ] Translate to Spanish
- [ ] Translate to French
- [ ] Translate to German
- [ ] Add RTL support

### Error Handling
- [ ] Add global error boundary
- [ ] Implement error logging
- [ ] Add user-friendly error messages
- [ ] Add retry mechanisms
- [ ] Implement error recovery
- [ ] Add diagnostic tools

### Testing
- [ ] Write unit tests (components)
- [ ] Write integration tests
- [ ] Write E2E tests (Playwright)
- [ ] Add visual regression tests
- [ ] Add performance tests
- [ ] Set up CI/CD pipeline

### Documentation
- [x] Write comprehensive README
- [x] Document API endpoints
- [x] Create user guide
- [ ] Create developer guide
- [ ] Add inline code documentation
- [ ] Create video tutorials
- [ ] Write troubleshooting guide

---

## Phase 13: Deployment & Distribution

### Web App Deployment
- [ ] Choose hosting platform (Vercel/Netlify)
- [ ] Configure build pipeline
- [ ] Set up environment variables
- [ ] Configure custom domain
- [ ] Set up SSL certificates
- [ ] Configure CDN
- [ ] Set up monitoring (Sentry)
- [ ] Set up analytics

### Electron Distribution
- [ ] Set up code signing (macOS)
- [ ] Set up code signing (Windows)
- [ ] Configure auto-updater
- [ ] Create DMG installer (macOS)
- [ ] Create NSIS installer (Windows)
- [ ] Create AppImage (Linux)
- [ ] Set up update server
- [ ] Notarize macOS build
- [ ] Create release pipeline

### Supabase Production
- [ ] Deploy Supabase project
- [ ] Configure production database
- [ ] Set up backups
- [ ] Configure RLS policies
- [ ] Set up monitoring
- [ ] Configure rate limiting
- [ ] Set up database replicas (optional)
- [ ] Configure email templates

### App Store Distribution (Future)
- [ ] Register Apple Developer account
- [ ] Register Google Play account
- [ ] Create app store listings
- [ ] Design app store assets
- [ ] Submit for review
- [ ] Handle review feedback
- [ ] Launch on stores

---

## Phase 14: Premium Features (Optional)

### Subscription System
- [ ] Design pricing tiers
- [ ] Integrate Stripe/Paddle
- [ ] Add subscription management
- [ ] Implement feature gates
- [ ] Add billing portal
- [ ] Handle subscription webhooks
- [ ] Add trial period

### Premium Features Ideas
- [ ] Unlimited family members
- [ ] Advanced AI features
- [ ] Custom themes
- [ ] Priority support
- [ ] Advanced analytics
- [ ] Data export
- [ ] API access
- [ ] White-label option

---

## Priority Matrix

### Must Have (P0) - MVP
- [x] Authentication (web + electron)
- [x] Calendar (day/week/month views)
- [x] Event CRUD
- [x] Real-time sync
- [x] Device pairing
- [ ] Offline support (basic)

### Should Have (P1) - Launch Ready
- [ ] Chores management
- [ ] Lists (shopping/todo)
- [ ] Meal planning
- [ ] Voice commands (enhanced)
- [ ] Notifications
- [ ] Recurring events

### Nice to Have (P2) - Post-Launch
- [ ] AI features
- [ ] Collaboration features
- [ ] Mobile apps
- [ ] Advanced offline sync
- [ ] Activity feed
- [ ] Comments/mentions

### Future (P3) - Long Term
- [ ] Premium features
- [ ] Advanced AI
- [ ] Extensive integrations
- [ ] White-label
- [ ] Enterprise features

---

## Current Status Summary

### ✅ Completed (Phase 0-2)
- Monorepo setup with Turborepo
- Web app with SvelteKit
- Electron app with voice commands
- Automatic device pairing
- Calendar core features
- Shared UI components
- Database schema and migrations

### 🚧 In Progress (Phase 3)
- Voice command improvements
- Voice action handlers
- Voice UI polish

### ⚠️ Critical Gaps
- **Offline support**: Both apps require internet
- **Chores**: UI not implemented
- **Lists**: UI not implemented
- **Meals**: UI not implemented
- **Notifications**: Not implemented
- **Mobile apps**: Not started

### 📋 Next Steps
1. Complete voice command system
2. Implement offline-first architecture (CRITICAL)
3. Build chores management UI
4. Build lists management UI
5. Build meal planning UI
6. Add notification system
7. Polish and test
8. Deploy to production

---

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow Svelte 5 best practices (Runes)
- Use functional components where possible
- Keep components small and focused
- Write descriptive variable names
- Add JSDoc comments for public APIs

### Git Workflow
- Use conventional commits
- Create feature branches
- Write descriptive PR descriptions
- Squash commits before merging
- Tag releases with semantic versioning

### Testing Strategy
- Write tests for critical paths
- Test authentication flows
- Test CRUD operations
- Test offline sync
- Test voice commands
- Perform manual QA before releases

### Performance Targets
- Web app: Lighthouse score > 90
- Electron: App start < 3s
- Voice: Wake word detection < 500ms
- Calendar: Render 1000 events < 100ms
- Sync: Full sync < 5s

---

## Resources

### Documentation
- Svelte 5: https://svelte-5-preview.vercel.app/
- SvelteKit: https://kit.svelte.dev/
- Electron: https://www.electronjs.org/
- Supabase: https://supabase.com/docs
- Turborepo: https://turbo.build/repo

### Tools
- Whisper AI: https://github.com/openai/whisper
- better-sqlite3: https://github.com/WiseLibs/better-sqlite3
- node-record-lpcm16: https://github.com/gillesdemey/node-record-lpcm16

### Inspiration
- Skylight Calendar: https://www.skylightframe.com/
- Cozi Family Organizer: https://www.cozi.com/
- Google Calendar
- Apple Calendar

---

## Contact & Support

- GitHub Issues: (add link)
- Documentation: (add link)
- Email: (add email)
- Discord: (add invite)
