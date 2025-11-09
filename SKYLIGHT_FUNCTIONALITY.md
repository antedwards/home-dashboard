# Skylight Family Calendar - Complete Functionality Documentation

> **Purpose:** Comprehensive reference for recreating Skylight Calendar functionality using Electron, Svelte 5, and Supabase

---

## Table of Contents

1. [Core Calendar Features](#1-core-calendar-features-free)
2. [Family Organization Features](#2-family-organization-features-free)
3. [Premium Features](#3-premium-features-plus-plan)
4. [Mobile App Capabilities](#4-mobile-app-capabilities)
5. [Device Specifications](#5-device-specifications)
6. [Technical Architecture Requirements](#6-technical-architecture-requirements)
7. [External APIs & Integrations](#7-external-apis--integrations)
8. [Additional Features & Enhancements](#8-additional-features--enhancements)
9. [Development Phases](#9-development-phases)

---

## 1. Core Calendar Features (Free)

### Calendar Syncing & Integration

- **Two-way sync** with Google Calendar (only Google supports bidirectional)
- **One-way sync** with:
  - Apple Calendar (CalDAV)
  - Microsoft Outlook
  - iCal feeds
  - Cozi
  - Yahoo Calendar
- **Real-time automatic updates** across all devices
- **Multiple calendar views:**
  - Day view
  - Week view
  - Month view
  - Schedule/Agenda view
- **Color-coding system:**
  - By person
  - By category
  - By activity type
  - Custom color assignment

### Event Management

- **Add/Edit/Delete events:**
  - From device touchscreen
  - From mobile app (remote access)
  - Real-time sync between all devices
- **Event properties:**
  - Title
  - Date and time
  - All-day events
  - Time-specific events
  - Recurring events (daily, weekly, monthly)
  - Location
  - Description/notes
  - Category/profile assignment
  - Color coding
- **Smart features:**
  - Location-based weather forecasts
  - Weather forecast at event time and location
  - Conflict detection (suggested enhancement)
  - Travel time calculation (suggested enhancement)

### Display & Views

- **Calendar views:**
  - Day view - detailed hourly breakdown
  - Week view - 7-day overview
  - Month view - traditional calendar grid
  - Schedule/agenda view - chronological list
- **Weather integration:**
  - Current location forecast
  - Event-specific location forecasts
  - Weather at event time
- **Visual design:**
  - Color-coded events
  - Clear typography for readability
  - Touch-optimized interface
  - Anti-glare display support

---

## 2. Family Organization Features (Free)

### Chore Chart System

- **Chore management:**
  - Create custom chores for each family member
  - Interactive checklists on device
  - Daily routine tracking
  - Color-coded by person
  - Repeating chores (daily, weekly, monthly)
- **Accessibility:**
  - Touch to mark complete
  - Visual progress tracking
  - Kid-friendly interface
- **Controls:**
  - Parental lock to prevent editing
  - Remote management via mobile app
  - Real-time sync across devices

### Lists Management

- **Multiple list types:**
  - Grocery lists
  - To-do lists
  - Shopping lists
  - General task lists
  - Custom list categories
- **Features:**
  - Create/edit/delete items
  - Check off completed items
  - Real-time sync between app and device
  - Shared access for all family members
- **Integrations:**
  - Auto-populate from meal plans
  - Barcode scanner (suggested enhancement)
  - Voice input (suggested enhancement)

---

## 3. Premium Features (Plus Plan)

**Subscription Cost:** $39-79/year depending on model

### Meal Planning

- **Meal scheduling:**
  - Breakfast planning
  - Lunch planning
  - Dinner planning
  - Snack planning
  - Weekly/monthly meal calendar view
- **Recipe management:**
  - Import recipes from URLs
  - Import recipes from photos
  - Import recipes from PDFs
  - Recipe storage and organization
  - Dietary preference filters
  - Nutrition information (optional)
- **Grocery integration:**
  - Automatic grocery list generation from recipes
  - Ingredient quantity calculation
  - **Direct Instacart integration:**
    - Send list to Instacart with one tap
    - Order groceries for delivery
  - Alternative grocery service integrations

### Chore Rewards System

- **Gamification:**
  - Star-based reward tracking
  - Points per completed chore
  - Progress visualization
  - Customizable rewards
  - Motivation system for kids
- **Tracking:**
  - Individual progress per family member
  - Reward milestones
  - Achievement history
- **Redemption:**
  - Custom reward definitions
  - Parental approval system
  - Reward completion tracking

### Sidekick AI Assistant

**"Magic Import" functionality:**
- **Convert to calendar events:**
  - Email forwarding → auto-create events
  - Photos of schedules → structured events
  - PDFs (school schedules, sports schedules) → events
  - Paper schedules (via photo) → events
  - Screenshots → events
- **Meal planning assistance:**
  - Generate meal plans based on dietary needs
  - Suggest recipes based on preferences
  - Smart recipe recommendations
- **Smart features:**
  - OCR (Optical Character Recognition)
  - Natural language processing
  - Date/time extraction
  - Location detection
  - Automatic categorization

### Photo Screensaver

- **Display modes:**
  - Photo slideshow when calendar not in use
  - Video playback support
  - Single photo static display
  - Custom graphic display
- **Photo management:**
  - Upload from mobile app
  - Select specific photos
  - Create multiple albums
  - Rotation settings
  - Transition effects
- **Privacy:**
  - Family-only access
  - Secure cloud storage
  - Easy photo removal

---

## 4. Mobile App Capabilities

### Remote Event Management

- **Full CRUD operations:**
  - Create events from anywhere
  - Edit existing events
  - Delete events
  - Real-time sync (instant updates)
  - Minimal latency (< 1 second)
- **Event properties:**
  - All properties available on device
  - Rich text descriptions
  - Photo attachments
  - Location with map integration

### Chore & List Management

- **Remote chore management:**
  - Add chores on-the-go
  - Edit chore details
  - View completion status
  - Approve reward redemptions
- **List management:**
  - Add items to any list
  - Voice-to-text input
  - Barcode scanning (suggested)
  - Reorder items
  - Share lists externally

### Magic Import

- **Email forwarding:**
  - Forward emails to unique address
  - Auto-extract event details
  - Confirmation notifications
- **Photo import:**
  - Take photo of paper schedule
  - OCR extracts events
  - Review before adding
- **Document upload:**
  - Upload PDFs
  - Process schedules automatically
  - Bulk event creation

### Sharing & Collaboration

- **Multi-user access:**
  - Invite family members (email/link)
  - Role-based permissions:
    - Admin (full access)
    - Family member (standard access)
    - Child (limited access)
    - Guest (view-only)
- **Profiles:**
  - Individual user profiles
  - Personal color assignment
  - Notification preferences
  - Privacy settings
- **Device linking:**
  - Sync multiple physical calendars
  - Cross-room synchronization
  - Cross-household linking (for co-parents)
  - Master/slave device configuration

### Platform Support

- **iOS app:**
  - Native iOS application
  - Widget support
  - Siri integration (suggested)
  - Apple Watch companion (suggested)
- **Android app:**
  - Native Android application
  - Widget support
  - Google Assistant integration (suggested)
  - Wear OS companion (suggested)

---

## 5. Device Specifications

### Available Models

**10-inch Model:**
- Compact size for smaller spaces
- HD display
- Standard features

**15-inch Model (Standard):**
- **Display:** 1920x1080 Full HD
- **Screen type:** IPS touchscreen
- **Features:** Anti-glare coating
- **Orientation:** Portrait only
- **Mounting:** Wall-mountable
- Most popular consumer model

**27-inch Calendar Max:**
- **Display:** 2560x1440 QHD resolution
- **Pixels:** ~3.7 million total pixels
- **Refresh rate:** 60 Hz
- **Screen type:** IPS touchscreen
- **Dimensions:** 26⅛" x 16" x 1½"
- **Weight:** 25 lbs (11.34 kg)
- **Storage:** 32GB internal
- **Features:** Anti-glare, portrait or landscape mounting
- **Cost:** $599.99 (device) + $79/year (Plus Plan for premium features)

### Hardware Features

- **Connectivity:** WiFi (2.4GHz and 5GHz)
- **Touchscreen:** Capacitive multi-touch
- **Storage:** Local caching for offline access
- **Privacy:** No camera, no microphone
- **Power:** Wall-powered (AC adapter)
- **Updates:** Automatic firmware updates
- **Mounting:** Wall mount kit included

### Software Features

- **Parental controls:**
  - Lock mode to prevent editing
  - PIN protection
  - Child-safe interface
- **Auto-updates:**
  - Firmware updates
  - Feature updates
  - Security patches
- **Accessibility:**
  - Large touch targets
  - High contrast mode
  - Adjustable brightness

---

## 6. Technical Architecture Requirements

### Electron Desktop App

**Core responsibilities:**
- Render calendar display (main window)
- Handle touchscreen input
- Offline-first data storage
- Background sync when online
- Auto-update system
- System tray integration

**Key features:**
- **Offline functionality:**
  - Local SQLite database
  - Cache all calendar data
  - Queue changes for sync
  - Conflict resolution
- **Display renderer:**
  - Hardware-accelerated rendering
  - Smooth animations
  - Touch gesture support
  - Multi-view state management
- **Sync engine:**
  - Background sync worker
  - Retry logic with exponential backoff
  - Conflict detection and resolution
  - Delta syncing (only changed data)

**Technology stack:**
- Electron (main + renderer)
- Vite (build tool)
- Svelte 5 (renderer UI framework)
- SQLite (local database)
- better-sqlite3 (Node.js SQLite driver)

### Svelte 5 Frontend (Shared Components)

**Component library needs:**
- **Calendar components:**
  - Day view grid
  - Week view grid
  - Month view grid
  - Schedule/agenda list
  - Event cards
  - Drag-and-drop event editing
  - Touch gesture handling
  - Color-coding system
  - Mini calendar picker

- **Organization components:**
  - Chore chart checklist
  - Interactive checkboxes
  - Progress bars
  - Reward tracker
  - Star/point counter

- **List components:**
  - Editable list items
  - Checkbox lists
  - Drag-to-reorder
  - Swipe-to-delete
  - Category filters

- **Meal planning components:**
  - Meal calendar grid
  - Recipe cards
  - Ingredient lists
  - Grocery list generator
  - Recipe detail view

- **Media components:**
  - Photo slideshow viewer
  - Video player
  - Image uploader
  - Photo gallery

- **Form components:**
  - Event editor
  - Chore editor
  - List editor
  - Recipe editor
  - Date/time pickers
  - Color pickers
  - User profile editor

**State management:**
- Svelte 5 runes ($state, $derived, $effect)
- Context API for shared state
- Stores for global state
- Optimistic UI updates

### SvelteKit Web App

**Core responsibilities:**
- Mobile-responsive companion app
- Remote event management
- Photo uploads
- Magic Import processing
- User authentication
- Social sharing

**Routes needed:**
- `/` - Dashboard
- `/calendar` - Calendar views
- `/events/new` - Quick add event
- `/events/[id]` - Event detail
- `/chores` - Chore management
- `/lists` - List management
- `/meals` - Meal planning
- `/photos` - Photo upload
- `/import` - Magic Import
- `/settings` - User settings
- `/family` - Family member management
- `/auth/login` - Authentication
- `/auth/signup` - Registration

**Features:**
- Server-side rendering (SSR)
- Progressive Web App (PWA)
- Offline support via service workers
- Push notifications
- Image optimization
- API routes for mobile app

### Supabase Backend

**Database schema:**

**Tables:**
- `users` - User accounts
- `families` - Family groups
- `family_members` - User-family relationships
- `calendars` - Calendar instances (devices)
- `events` - Calendar events
- `event_recurrence` - Recurring event rules
- `chores` - Chore definitions
- `chore_completions` - Chore completion tracking
- `rewards` - Reward definitions
- `reward_redemptions` - Reward redemption history
- `lists` - List containers
- `list_items` - Individual list items
- `meals` - Meal plans
- `recipes` - Recipe storage
- `recipe_ingredients` - Recipe ingredients
- `photos` - Photo metadata
- `calendar_syncs` - External calendar sync status
- `import_jobs` - Magic Import processing queue
- `device_registrations` - Electron device tracking

**Features needed:**
- **Real-time subscriptions:**
  - Listen to event changes
  - Listen to chore completions
  - Listen to list updates
  - Push updates to all connected clients

- **Row-level security (RLS):**
  - Family-based access control
  - User role permissions
  - Secure data isolation

- **Storage:**
  - Photo storage (Supabase Storage)
  - Recipe images
  - User avatars
  - Document uploads for Magic Import

- **Edge functions:**
  - Magic Import OCR processing
  - Recipe scraping
  - Calendar webhook handlers
  - Push notification service
  - Image optimization

**Auth:**
- Email/password authentication
- OAuth providers (Google, Apple)
- Magic link sign-in
- Session management
- Multi-device support

### Shared Package: Database Types

**Purpose:** Shared TypeScript types for database schema

**Exports:**
- Database types (auto-generated from Supabase)
- Query builders
- Type-safe API helpers
- Validation schemas (Zod)

### Shared Package: Sync Engine

**Purpose:** Offline-first sync logic shared between Electron and web

**Features:**
- **Sync strategies:**
  - Last-write-wins
  - Operational transformation
  - CRDTs for list items

- **Conflict resolution:**
  - Detect conflicts
  - Automatic resolution rules
  - Manual resolution UI

- **Queue management:**
  - Pending changes queue
  - Retry logic
  - Error handling
  - Network status detection

- **Delta sync:**
  - Only sync changed data
  - Timestamp-based diffing
  - Efficient bandwidth usage

---

## 7. External APIs & Integrations

### Calendar Integration APIs

**Google Calendar API:**
- OAuth2 authentication
- Two-way sync (read + write)
- Webhook support for real-time updates
- Event CRUD operations
- Recurring event support
- Free tier: 1,000,000 queries/day

**Microsoft Graph API (Outlook):**
- OAuth2 authentication
- One-way sync (read only recommended)
- Event webhooks
- Calendar API endpoints
- Free tier: Available with Microsoft account

**Apple Calendar (CalDAV):**
- CalDAV protocol
- iCloud authentication
- One-way sync (read only)
- Standard caldav client libraries
- Free with Apple ID

**iCal Feed Support:**
- Standard ICS format parsing
- Public calendar URLs
- One-way sync (read only)
- Polling for updates
- Libraries: ical.js, node-ical

### Weather APIs

**OpenWeatherMap:**
- Current weather
- 5-day forecast
- Location-based queries
- Free tier: 1,000 calls/day
- API key required

**Weather.gov (US only):**
- Free government API
- No API key required
- Current conditions + forecasts
- Grid-based location system

**Alternative: WeatherAPI.com:**
- Current + forecast
- Historical data
- Free tier: 1,000,000 calls/month

### AI/ML Services for Magic Import

**OpenAI API:**
- GPT-4 Vision for image OCR
- Text extraction from photos
- Structured data extraction
- Event detail parsing
- Cost: ~$0.01-0.03 per image

**Anthropic Claude API:**
- Claude 3 Opus/Sonnet vision models
- PDF parsing
- Schedule extraction
- Natural language date parsing
- Cost: ~$0.015 per image

**Google Cloud Vision API:**
- OCR (text detection)
- Document text extraction
- Free tier: 1,000 images/month
- Cost: $1.50 per 1,000 images after

**Tesseract OCR (Open Source):**
- Free and local
- Good accuracy for printed text
- No API costs
- Can run on server or client

### Recipe Services

**Recipe scrapers:**
- recipe-scrapers (Python library)
- Extract from 100+ recipe sites
- Ingredient parsing
- Nutrition info extraction

**Spoonacular API:**
- Recipe search
- Ingredient analysis
- Meal planning
- Nutrition data
- Free tier: 150 requests/day
- Paid: $0.002 per request

**Edamam Recipe API:**
- Recipe search
- Nutrition analysis
- Dietary filters
- Free tier: 10,000 calls/month

### Grocery Integration

**Instacart API:**
- Note: Limited public API access
- Partnership required for deep integration
- Alternative: Web scraping or manual integration

**Grocy (Open Source):**
- Self-hosted grocery management
- Barcode database
- Inventory tracking
- Free and open source

**Open Food Facts API:**
- Product database
- Barcode lookup
- Nutrition data
- Free and open

### Optional Integrations

**Voice Assistants:**
- Amazon Alexa Skills Kit
- Google Assistant Actions
- Apple SiriKit (iOS shortcuts)

**Smart Home:**
- IFTTT integration
- Home Assistant
- Matter/Thread protocol

**School/Sports:**
- Google Classroom API
- Canvas LMS API
- TeamSnap API (sports schedules)

---

## 8. Additional Features & Enhancements

### Features Skylight Lacks (Opportunities)

#### Communication Features

1. **Family Messaging:**
   - Leave notes for each other on calendar
   - @mention family members
   - Quick message board
   - Voice messages

2. **Video Messages:**
   - Record short video clips
   - Leave video notes for family
   - Birthday/special occasion messages

#### Smart Automation

3. **Voice Control:**
   - Amazon Alexa integration
   - Google Assistant support
   - "Add event via voice"
   - "What's on my calendar today?"
   - Voice-to-text for lists

4. **Smart Suggestions:**
   - AI-powered scheduling suggestions
   - Learn from patterns
   - Suggest optimal event times
   - "You usually grocery shop on Sundays"

5. **Conflict Detection:**
   - Warn about overlapping events
   - Double-booking alerts
   - Suggest alternative times

6. **Travel Time Calculation:**
   - Auto-add buffer time between events
   - Google Maps integration
   - Real-time traffic awareness
   - "Leave by" notifications

#### Tracking & Analytics

7. **Time Tracking:**
   - How long tasks actually take
   - Time estimates vs actuals
   - Productivity insights

8. **Habit Tracking:**
   - Daily habit streaks
   - Pattern recognition
   - Visual streak indicators
   - Completion percentages
   - Monthly/yearly statistics

9. **Analytics Dashboard:**
   - Family activity heatmaps
   - Most productive times
   - Chore completion rates
   - Goal achievement tracking

#### Financial Features

10. **Bill Reminders:**
    - Recurring bill tracking
    - Payment due dates
    - Budget tracking
    - Expense categorization

11. **Allowance Tracking:**
    - Link chores to payments
    - Automatic allowance calculation
    - Payment history
    - Savings goals

12. **Budget Integration:**
    - Track spending vs budget
    - Grocery budget tracking
    - Category-based budgets

#### Health & Wellness

13. **Medication Reminders:**
    - Daily medication schedules
    - Prescription refill reminders
    - Dosage tracking
    - Multiple family member support

14. **Healthcare Tracking:**
    - Doctor appointments
    - Vaccination schedules
    - Health insurance reminders
    - Medical history notes

15. **Fitness Integration:**
    - Workout schedules
    - Fitness goal tracking
    - Sports practice schedules
    - Activity challenges

#### Pet & Home Care

16. **Pet Care:**
    - Vet appointments
    - Feeding schedules
    - Medication reminders
    - Grooming appointments
    - Pet care tasks

17. **Home Maintenance:**
    - Seasonal maintenance reminders
    - Appliance service schedules
    - Filter replacement reminders
    - Garden/lawn care schedules

#### Social & Events

18. **Birthday/Anniversary Database:**
    - Auto-recurring important dates
    - Gift idea tracking
    - Countdown timers
    - Age calculation
    - Gift budget tracking

19. **School Integration:**
    - Auto-import school calendars
    - Homework tracking
    - Test/quiz reminders
    - School event integration
    - Report card dates

20. **Sports Team Schedules:**
    - Auto-import from league websites
    - Game schedules
    - Practice schedules
    - Carpool coordination
    - Snack duty rotation

21. **Carpool Coordination:**
    - Who's driving when
    - Pick-up/drop-off times
    - Route optimization
    - Passenger tracking

#### Enhanced UX Features

22. **Notifications:**
    - Push reminders to phones
    - Customizable notification times
    - Smart notification timing
    - Do-not-disturb schedules
    - Notification grouping

23. **Dark Mode:**
    - Automatic day/night mode
    - Manual toggle
    - Reduced eye strain
    - Ambient light sensor integration

24. **Focus Mode:**
    - Show only today's essentials
    - Hide completed items
    - Minimal distraction view
    - "What's next?" quick view

25. **Print to Calendar:**
    - Print weekly schedules
    - PDF export
    - Print monthly view
    - Custom print layouts

26. **Calendar Templates:**
    - Pre-made schedules for common routines
    - Morning routine templates
    - After-school routine
    - Bedtime routine
    - Weekly meal plan templates

27. **Custom Widgets:**
    - Modular dashboard
    - Configurable layout
    - Widget marketplace
    - Third-party widget support

#### Data & Portability

28. **Import/Export:**
    - Backup and restore data
    - Export to ICS format
    - Data portability
    - Migration tools

29. **Offline Mode:**
    - Full functionality without WiFi
    - Local data storage
    - Sync when connection restored
    - Offline indicator

#### Shopping & Inventory

30. **Barcode Scanner:**
    - Add groceries by scanning
    - Pantry inventory tracking
    - Expiration date tracking
    - Reorder alerts

31. **Leftover Tracking:**
    - Reduce food waste
    - "Use by" date tracking
    - Meal suggestions from leftovers

32. **Pantry Management:**
    - Inventory tracking
    - Stock levels
    - Shopping suggestions
    - Recipe recommendations based on inventory

#### Advanced Integrations

33. **Gas Price/Traffic Integration:**
    - Plan errands efficiently
    - Route optimization
    - Gas price comparison
    - Best time to travel

34. **Shared Shopping Lists:**
    - Real-time collaborative editing
    - Multiple editors simultaneously
    - Live cursor tracking
    - Conflict-free editing (CRDTs)

35. **Multi-Calendar View:**
    - Overlay multiple calendars
    - Toggle individual calendars
    - Color-coded by calendar source
    - Separate personal vs family calendars

36. **Time Zones:**
    - Multi-timezone support
    - Auto-adjust for DST
    - Travel mode
    - Remote family member timezones

37. **Recurring Task Templates:**
    - Custom recurrence patterns
    - "Every 2nd Tuesday"
    - "Last Friday of month"
    - "Weekdays only"

38. **Location-Based Reminders:**
    - "When you arrive at grocery store"
    - Geofencing
    - Proximity alerts

39. **Collaborative Event Planning:**
    - Poll for best time
    - RSVP tracking
    - Guest management
    - Event invitations

40. **Integration Hub:**
    - Zapier integration
    - IFTTT support
    - Webhook support
    - API for third-party apps

---

## 9. Development Phases

### Phase 1: MVP (Minimum Viable Product)

**Goal:** Basic functional calendar with core features

**Duration:** 4-6 weeks

#### Core Features:

**Calendar Display:**
- ✅ Day view
- ✅ Week view
- ✅ Month view
- ✅ Event display with color-coding
- ✅ Touch-optimized UI

**Event Management:**
- ✅ Create events (device + web app)
- ✅ Edit events
- ✅ Delete events
- ✅ Event details (title, date, time, description)
- ✅ All-day events
- ✅ Time-specific events

**Sync & Data:**
- ✅ Supabase backend setup
- ✅ Real-time sync between devices
- ✅ User authentication (email/password)
- ✅ Multi-device support
- ✅ Basic offline support (read-only)

**Calendar Integration:**
- ✅ Google Calendar OAuth
- ✅ Google Calendar sync (one-way read)
- ✅ Sync status indicators

**Web App:**
- ✅ Responsive mobile interface
- ✅ Event CRUD operations
- ✅ Calendar view (week/month)
- ✅ Quick-add event

**Electron App:**
- ✅ Basic window setup
- ✅ Calendar display
- ✅ Touch input handling
- ✅ System tray integration

**Technical:**
- ✅ Turborepo monorepo setup
- ✅ Shared component library (basic)
- ✅ Database schema v1
- ✅ TypeScript configuration
- ✅ Build and deploy pipeline

**Testing:**
- ✅ Basic unit tests
- ✅ E2E tests for critical paths
- ✅ Manual QA checklist

---

### Phase 2: Family Features

**Goal:** Multi-user support, chores, lists, and enhanced calendar features

**Duration:** 4-6 weeks

#### Features:

**Multi-User & Sharing:**
- ✅ Family group creation
- ✅ Invite family members
- ✅ User profiles with avatars
- ✅ Per-person color coding
- ✅ Individual user settings
- ✅ Role-based permissions (admin, member, child)

**Chore Chart:**
- ✅ Create chores
- ✅ Assign to family members
- ✅ Recurring chores (daily, weekly, monthly)
- ✅ Interactive checklist on device
- ✅ Mark complete via touch
- ✅ Chore history tracking
- ✅ Parental lock mode

**Lists:**
- ✅ Create multiple lists
- ✅ Grocery lists
- ✅ To-do lists
- ✅ Custom list types
- ✅ Add/edit/delete items
- ✅ Check off items
- ✅ Reorder items (drag-drop)
- ✅ Share lists with family
- ✅ Real-time collaborative editing

**Enhanced Calendar:**
- ✅ Recurring events (daily, weekly, monthly, custom)
- ✅ Event categories
- ✅ Location field
- ✅ Schedule/agenda view
- ✅ Mini calendar picker
- ✅ Event search
- ✅ Filter by person/category

**Weather Integration:**
- ✅ Current weather display
- ✅ 5-day forecast
- ✅ Location-based weather
- ✅ Weather icons/graphics

**Photo Screensaver:**
- ✅ Photo upload from web app
- ✅ Slideshow mode
- ✅ Photo management (add/delete)
- ✅ Transition effects
- ✅ Auto-activate after inactivity
- ✅ Touch to wake

**Sync Enhancements:**
- ✅ Two-way Google Calendar sync
- ✅ Conflict resolution
- ✅ Offline mode with queue
- ✅ Background sync worker

**Testing:**
- ✅ Multi-user testing
- ✅ Real-time sync testing
- ✅ Offline functionality testing
- ✅ Performance benchmarks

---

### Phase 3: Advanced Features

**Goal:** Meal planning, AI features, additional calendar integrations

**Duration:** 6-8 weeks

#### Features:

**Meal Planning:**
- ✅ Meal calendar (breakfast, lunch, dinner, snacks)
- ✅ Recipe database
- ✅ Add recipes manually
- ✅ Recipe detail view
- ✅ Ingredient lists
- ✅ Assign meals to calendar days
- ✅ Weekly meal plan view
- ✅ Recipe search and filtering

**Grocery Integration:**
- ✅ Auto-generate grocery list from meal plan
- ✅ Ingredient quantity calculation
- ✅ Combine duplicate ingredients
- ✅ Categorize by grocery aisle
- ✅ Export list (email, print, share)

**Recipe Import:**
- ✅ Import from URL (recipe scraping)
- ✅ Parse recipe websites
- ✅ Extract ingredients
- ✅ Extract instructions
- ✅ Save photos
- ✅ Manual recipe entry form

**Magic Import (AI-Powered):**
- ✅ Email forwarding system
- ✅ Upload PDF documents
- ✅ Upload photos of schedules
- ✅ OCR text extraction
- ✅ AI-powered event extraction
- ✅ Date/time parsing
- ✅ Location detection
- ✅ Review before import
- ✅ Bulk event creation

**Chore Rewards:**
- ✅ Star/point system
- ✅ Points per chore
- ✅ Reward definitions
- ✅ Reward milestones
- ✅ Progress tracking
- ✅ Reward redemption flow
- ✅ Parental approval
- ✅ Reward history

**Additional Calendar Integrations:**
- ✅ Apple Calendar (CalDAV)
- ✅ Microsoft Outlook
- ✅ iCal feed support
- ✅ Multiple calendar accounts per user
- ✅ Calendar selection/filtering

**Device Linking:**
- ✅ Link multiple Electron devices
- ✅ Master/slave configuration
- ✅ Cross-household linking
- ✅ Sync settings between devices

**Notifications:**
- ✅ Push notifications (web)
- ✅ Event reminders
- ✅ Chore reminders
- ✅ Custom notification times
- ✅ Notification settings per user

**Testing:**
- ✅ AI import accuracy testing
- ✅ Recipe scraping reliability
- ✅ Load testing (large calendars)
- ✅ Security audit

---

### Phase 4: Enhancements & Polish

**Goal:** Advanced features, optimizations, quality-of-life improvements

**Duration:** 6-8 weeks

#### Features:

**Voice Control:**
- ✅ Amazon Alexa skill
- ✅ Google Assistant action
- ✅ Voice commands (add event, read schedule)
- ✅ Voice-to-text for lists
- ✅ Siri shortcuts (iOS)

**Advanced Notifications:**
- ✅ Smart notification timing
- ✅ Do-not-disturb schedules
- ✅ Notification grouping
- ✅ Digest notifications
- ✅ Desktop notifications (Electron)

**Habit Tracking:**
- ✅ Define habits
- ✅ Daily check-ins
- ✅ Streak tracking
- ✅ Visual streak indicators
- ✅ Habit analytics
- ✅ Goal setting

**Time Tracking:**
- ✅ Event time estimates
- ✅ Actual time tracking
- ✅ Time analytics
- ✅ Productivity insights
- ✅ Time reports

**Bill Reminders:**
- ✅ Recurring bill tracking
- ✅ Payment due dates
- ✅ Bill categories
- ✅ Payment history
- ✅ Budget alerts

**Birthday/Anniversary Tracking:**
- ✅ Birthday database
- ✅ Auto-recurring dates
- ✅ Age calculation
- ✅ Countdown timers
- ✅ Gift idea notes
- ✅ Celebration reminders

**Pet Care Module:**
- ✅ Pet profiles
- ✅ Vet appointments
- ✅ Feeding schedules
- ✅ Medication tracking
- ✅ Grooming reminders

**Medication Reminders:**
- ✅ Medication schedules
- ✅ Dosage tracking
- ✅ Refill reminders
- ✅ Multiple family members
- ✅ Adherence tracking

**Dark Mode:**
- ✅ Dark theme
- ✅ Auto day/night switching
- ✅ Manual toggle
- ✅ Ambient light sensor (if hardware supports)

**Focus Mode:**
- ✅ "Today" focus view
- ✅ "What's next?" widget
- ✅ Hide completed items
- ✅ Minimal distraction mode

**Print & Export:**
- ✅ Print weekly schedule
- ✅ Print monthly calendar
- ✅ PDF export
- ✅ Custom print layouts
- ✅ ICS export

**Calendar Templates:**
- ✅ Morning routine templates
- ✅ After-school routine
- ✅ Meal plan templates
- ✅ Template library
- ✅ Save custom templates

**Conflict Detection:**
- ✅ Overlapping event warnings
- ✅ Double-booking prevention
- ✅ Suggest alternative times
- ✅ Smart scheduling suggestions

**Travel Time:**
- ✅ Google Maps integration
- ✅ Auto-calculate travel time
- ✅ Add buffer between events
- ✅ "Leave by" notifications
- ✅ Real-time traffic

**Testing:**
- ✅ Comprehensive E2E test suite
- ✅ Accessibility audit (WCAG AA)
- ✅ Performance optimization
- ✅ Browser compatibility testing
- ✅ Device compatibility testing

---

### Phase 5: Advanced Integrations & Analytics

**Goal:** Third-party integrations, analytics, power user features

**Duration:** 4-6 weeks

#### Features:

**School Integration:**
- ✅ Google Classroom API
- ✅ Canvas LMS integration
- ✅ Homework tracking
- ✅ Assignment due dates
- ✅ Grade tracking

**Sports Schedules:**
- ✅ TeamSnap integration
- ✅ Auto-import game schedules
- ✅ Practice schedules
- ✅ Team calendar sync
- ✅ Carpool coordination

**Carpool Coordination:**
- ✅ Driver rotation schedules
- ✅ Pick-up/drop-off times
- ✅ Passenger tracking
- ✅ Route optimization
- ✅ Carpool group management

**Barcode Scanner:**
- ✅ Scan groceries to add to list
- ✅ Pantry inventory tracking
- ✅ Product database integration
- ✅ Expiration date tracking

**Pantry Management:**
- ✅ Inventory system
- ✅ Stock level tracking
- ✅ Low stock alerts
- ✅ Recipe suggestions from inventory

**Leftover Tracking:**
- ✅ Track leftovers
- ✅ "Use by" date alerts
- ✅ Reduce food waste
- ✅ Meal suggestions

**Analytics Dashboard:**
- ✅ Family activity heatmaps
- ✅ Chore completion statistics
- ✅ Time usage breakdown
- ✅ Goal achievement tracking
- ✅ Productivity trends
- ✅ Export analytics data

**Allowance System:**
- ✅ Link chores to payments
- ✅ Auto-calculate allowance
- ✅ Payment tracking
- ✅ Savings goals
- ✅ Financial reports

**Budget Integration:**
- ✅ Expense tracking
- ✅ Budget categories
- ✅ Spending vs budget
- ✅ Financial insights

**Location-Based Reminders:**
- ✅ Geofencing
- ✅ "When you arrive" reminders
- ✅ Proximity alerts
- ✅ Location history

**Multi-Timezone Support:**
- ✅ Display multiple time zones
- ✅ Travel mode
- ✅ Auto-adjust for DST
- ✅ Remote family member support

**Collaborative Event Planning:**
- ✅ Time polls (Doodle-style)
- ✅ RSVP tracking
- ✅ Guest management
- ✅ Send invitations
- ✅ Event comments/discussion

**Integration Hub:**
- ✅ Zapier integration
- ✅ IFTTT support
- ✅ Webhooks (outgoing)
- ✅ REST API for third-party apps
- ✅ Developer documentation

**Custom Widgets:**
- ✅ Widget system architecture
- ✅ Configurable dashboard layout
- ✅ Widget marketplace
- ✅ Third-party widget SDK

**Testing:**
- ✅ Integration testing
- ✅ API testing
- ✅ Security penetration testing
- ✅ Scalability testing

---

### Phase 6: Polish & Optimization

**Goal:** Performance, user experience, edge cases

**Duration:** 3-4 weeks

#### Tasks:

**Performance Optimization:**
- ✅ Database query optimization
- ✅ Implement caching strategies
- ✅ Image optimization and lazy loading
- ✅ Code splitting and bundle optimization
- ✅ Reduce initial load time
- ✅ Memory leak detection and fixes

**User Experience:**
- ✅ Animation polish
- ✅ Smooth transitions
- ✅ Loading states
- ✅ Error handling improvements
- ✅ Empty state designs
- ✅ Onboarding flow
- ✅ Interactive tutorials

**Accessibility:**
- ✅ Screen reader support
- ✅ Keyboard navigation
- ✅ ARIA labels
- ✅ Color contrast (WCAG AAA)
- ✅ Focus indicators
- ✅ Text sizing options

**Internationalization (i18n):**
- ✅ Multi-language support
- ✅ Date/time formatting
- ✅ Currency formatting
- ✅ Right-to-left (RTL) layout support
- ✅ Translation management

**Documentation:**
- ✅ User guide
- ✅ Video tutorials
- ✅ FAQ
- ✅ Troubleshooting guide
- ✅ Developer documentation
- ✅ API documentation

**Edge Cases:**
- ✅ Handle large calendars (1000+ events)
- ✅ Handle poor network conditions
- ✅ Handle time zone edge cases
- ✅ Handle daylight saving transitions
- ✅ Handle leap years/days
- ✅ Handle very long event titles
- ✅ Handle special characters

**Security Hardening:**
- ✅ Security audit
- ✅ SQL injection prevention
- ✅ XSS prevention
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Input validation
- ✅ Secure file uploads

**Testing:**
- ✅ 90%+ code coverage
- ✅ Cross-browser testing
- ✅ Mobile device testing
- ✅ Stress testing
- ✅ User acceptance testing (UAT)

---

## Feature Checklist

### Skylight Core Features ✓

- [ ] Calendar Views (Day, Week, Month, Schedule)
- [ ] Event CRUD (Create, Read, Update, Delete)
- [ ] Recurring Events
- [ ] Color Coding
- [ ] Google Calendar Sync (Two-way)
- [ ] Apple Calendar Sync (One-way)
- [ ] Outlook Sync (One-way)
- [ ] iCal Feed Support
- [ ] Chore Charts
- [ ] Chore Rewards (Stars/Points)
- [ ] Lists (Grocery, To-Do, Custom)
- [ ] Meal Planning
- [ ] Recipe Database
- [ ] Recipe Import (URL, Photo, PDF)
- [ ] Grocery List Auto-Generation
- [ ] Instacart Integration
- [ ] Photo Screensaver
- [ ] Weather Integration
- [ ] Mobile App (iOS, Android, PWA)
- [ ] Multi-User/Family Support
- [ ] Device Linking
- [ ] Magic Import (Email, Photo, PDF → Events)
- [ ] Parental Controls
- [ ] Real-Time Sync
- [ ] Offline Mode

### Enhanced Features ✓

- [ ] Voice Control (Alexa, Google Assistant, Siri)
- [ ] Smart Notifications
- [ ] Habit Tracking
- [ ] Time Tracking
- [ ] Bill Reminders
- [ ] Medication Reminders
- [ ] Pet Care Module
- [ ] Birthday/Anniversary Tracking
- [ ] School Integration (Google Classroom, Canvas)
- [ ] Sports Schedule Import
- [ ] Carpool Coordination
- [ ] Barcode Scanner
- [ ] Pantry Management
- [ ] Leftover Tracking
- [ ] Dark Mode
- [ ] Focus Mode
- [ ] Print/Export
- [ ] Calendar Templates
- [ ] Conflict Detection
- [ ] Travel Time Calculation
- [ ] Analytics Dashboard
- [ ] Allowance System
- [ ] Budget Integration
- [ ] Location-Based Reminders
- [ ] Multi-Timezone Support
- [ ] Collaborative Event Planning
- [ ] Integration Hub (Zapier, IFTTT)
- [ ] Custom Widgets
- [ ] Family Messaging
- [ ] Video Messages

---

## Technology Stack Summary

### Frontend

- **Electron:** Desktop application framework
- **Svelte 5:** UI framework with modern runes API
- **SvelteKit:** Web application framework
- **Vite:** Build tool and dev server
- **TypeScript:** Type-safe development
- **TailwindCSS:** Utility-first styling
- **DaisyUI:** Component library (optional)

### Backend

- **Supabase:** Backend-as-a-Service
  - PostgreSQL database
  - Real-time subscriptions
  - Authentication
  - Storage
  - Edge Functions
- **Node.js:** Server runtime (for build tools)

### Data & Sync

- **SQLite:** Local database (Electron)
- **better-sqlite3:** SQLite driver for Node.js
- **IndexedDB:** Browser storage (web app)
- **Supabase Realtime:** Real-time sync

### APIs & Services

- **Google Calendar API**
- **Microsoft Graph API**
- **OpenWeatherMap / WeatherAPI**
- **OpenAI / Anthropic Claude** (Magic Import)
- **Google Cloud Vision** (OCR)
- **Recipe Scrapers**
- **Spoonacular / Edamam** (recipes)

### Dev Tools

- **Turborepo:** Monorepo management
- **pnpm:** Package manager
- **ESLint:** Linting
- **Prettier:** Code formatting
- **Vitest:** Unit testing
- **Playwright:** E2E testing

### Deployment

- **Electron Builder:** Desktop app packaging
- **Vercel / Netlify:** Web app hosting
- **Supabase Cloud:** Backend hosting

---

## Success Metrics

### Phase 1 (MVP)
- Calendar displays correctly on all views
- Events sync in < 2 seconds
- 99% uptime for sync service
- < 500ms UI response time

### Phase 2 (Family Features)
- Support 10+ users per family
- Real-time sync < 1 second
- Offline mode works for 7 days
- Zero data loss during sync conflicts

### Phase 3 (Advanced)
- Magic Import accuracy > 90%
- Recipe import success rate > 85%
- Meal plan creation < 2 minutes

### Phase 4 (Enhancements)
- Voice command accuracy > 95%
- Notification delivery rate > 99%
- User satisfaction score > 4.5/5

### Overall Goals
- 100,000+ active users (Year 1)
- < 5% churn rate
- 4.5+ star app store rating
- < 100ms average API response time
- 99.9% uptime SLA

---

## Risk Assessment

### Technical Risks

1. **Sync Complexity:**
   - Conflict resolution
   - **Mitigation:** Use proven CRDTs, extensive testing

2. **Offline-First Architecture:**
   - Complex state management
   - **Mitigation:** Use established patterns (e.g., PouchDB architecture)

3. **Third-Party API Reliability:**
   - Calendar APIs may change/break
   - **Mitigation:** Abstraction layer, fallback mechanisms

4. **Performance at Scale:**
   - Large calendars (1000+ events)
   - **Mitigation:** Pagination, virtualization, indexing

### Business Risks

1. **API Costs:**
   - AI services can be expensive
   - **Mitigation:** Usage limits, tiered pricing, caching

2. **Competitive Market:**
   - Skylight has first-mover advantage
   - **Mitigation:** Focus on open-source, customization, lower cost

3. **User Adoption:**
   - Hardware purchase barrier
   - **Mitigation:** Web-first approach, tablet support, affordable device

---

## Next Steps

1. **Set up development environment**
2. **Initialize Turborepo monorepo**
3. **Create database schema**
4. **Build Phase 1 MVP**
5. **Beta testing with small group**
6. **Iterate based on feedback**
7. **Scale to Phase 2 and beyond**

---

**Document Version:** 1.0
**Last Updated:** 2025-11-09
**Author:** AI Assistant
**Purpose:** Technical specification for Skylight Calendar recreation

