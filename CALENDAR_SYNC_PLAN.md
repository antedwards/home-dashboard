# iOS Calendar Sync Implementation Plan

## Overview

This document outlines the implementation of bidirectional calendar syncing between your Home Dashboard and iOS/iCloud calendars using the CalDAV protocol.

## Approach: CalDAV Protocol

**Why CalDAV?**
- ✅ Free (no API costs)
- ✅ Direct connection to iCloud calendars
- ✅ Works with any CalDAV-compatible service (iCloud, Google Calendar, etc.)
- ✅ Bidirectional sync (changes in either direction sync both ways)
- ✅ Established, reliable protocol (RFC 4791)
- ❌ Requires app-specific password per user (one-time setup)

**Alternative considered:**
- Apple Calendar API: Requires $99/year Apple Developer account + complex OAuth
- Third-party services (Nylas): $50-150/month costs

## What You Need to Provide

### For Each Family Member:

1. **Apple ID Email Address**
   - Used for CalDAV authentication

2. **App-Specific Password** (one-time setup per person)
   - Go to https://appleid.apple.com
   - Sign in
   - Go to **Security** → **App-Specific Passwords**
   - Click **Generate Password**
   - Name it "Home Dashboard"
   - Copy the generated password (format: `xxxx-xxxx-xxxx-xxxx`)
   - ⚠️ **Important**: Save this password - you can't view it again!

3. **Calendar Selection** (which calendars to sync)
   - List of calendar names to sync (e.g., "Personal", "Work", "Family")
   - Or sync all calendars by default

### Example Configuration:

```bash
# User 1 (You)
CALDAV_EMAIL_1=you@icloud.com
CALDAV_PASSWORD_1=xxxx-xxxx-xxxx-xxxx
CALDAV_CALENDARS_1=Personal,Family

# User 2 (Partner)
CALDAV_EMAIL_2=partner@icloud.com
CALDAV_PASSWORD_2=yyyy-yyyy-yyyy-yyyy
CALDAV_CALENDARS_2=Personal,Work,Family
```

## Sync Strategy

### Sync Range

**Past Events:**
- **30 days back** from today
- Reasoning: Provides context for recurring events, not overwhelming

**Future Events:**
- **365 days forward** (1 year)
- Reasoning: Covers most long-term planning needs

**Total window:** ~13 months of events

### Sync Frequency

**Initial Sync (first connection):**
- Full sync of all events in range
- ~1-5 minutes depending on event count
- Shows progress: "Syncing 245 events..."

**Ongoing Sync:**
- **Every 15 minutes** (polling)
- Only syncs changed events (based on last-modified timestamps)
- Typically completes in <5 seconds

**Why 15 minutes?**
- Fast enough for family coordination
- Low enough load on iCloud servers (avoids rate limiting)
- Saves battery on wall-mounted Raspberry Pi

**Future Enhancement:**
- CalDAV supports push notifications (webhooks)
- Can reduce to near-instant syncing
- Implement in Phase 2 if needed

### Sync Direction

**Bidirectional:**
- ✅ Home Dashboard → iCloud (events created/updated/deleted in app)
- ✅ iCloud → Home Dashboard (events created/updated/deleted on iPhone)

**Conflict Resolution:**
- **Last-write-wins** based on server timestamps
- Example: If you edit on iPhone and partner edits in app simultaneously:
  - Whichever change happened last (server time) wins
  - Simple, predictable behavior

### What Gets Synced

**Event Fields:**
- ✅ Title
- ✅ Description
- ✅ Start time
- ✅ End time
- ✅ Location
- ✅ All-day flag
- ✅ Recurring events (full RRULE support)
- ✅ Attendees
- ✅ Reminders
- ✅ Calendar color

**Not Synced (yet):**
- ❌ Attachments
- ❌ Travel time
- ❌ Conference call links (Zoom, FaceTime)

## Architecture

### Database Schema (Already Exists!)

Your existing `events` table supports everything needed:

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  family_id UUID REFERENCES families(id),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT false,
  location TEXT,
  calendar_id UUID REFERENCES calendars(id),
  category_id UUID,
  recurrence_rule TEXT,  -- RRULE for recurring events
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**New table needed:**

```sql
-- Track sync state for each user's calendar connection
CREATE TABLE caldav_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  family_id UUID REFERENCES families(id) NOT NULL,
  email TEXT NOT NULL,
  server_url TEXT NOT NULL DEFAULT 'https://caldav.icloud.com',
  last_sync_at TIMESTAMPTZ,
  sync_token TEXT,  -- For efficient incremental syncs
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, email)
);

-- Map events to external CalDAV UIDs
CREATE TABLE caldav_event_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  caldav_connection_id UUID REFERENCES caldav_connections(id) ON DELETE CASCADE,
  external_uid TEXT NOT NULL,  -- CalDAV event UID
  external_calendar TEXT NOT NULL,  -- Calendar name on iCloud
  etag TEXT,  -- For conflict detection
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(caldav_connection_id, external_uid)
);
```

### Sync Service Architecture

```
┌─────────────────┐
│   iPhone        │
│   Calendar      │
└────────┬────────┘
         │ CalDAV Protocol
         │ (HTTPS)
         ↓
┌─────────────────┐
│  iCloud CalDAV  │
│     Server      │
└────────┬────────┘
         │
         │ Every 15 min
         ↓
┌─────────────────┐       ┌──────────────┐
│  Supabase Edge  │←─────→│   Supabase   │
│    Function     │       │   Database   │
│  (CalDAV Sync)  │       └──────────────┘
└────────┬────────┘
         │
         │ Real-time
         ↓
┌─────────────────┐
│  Home Dashboard │
│   (Wall Display)│
└─────────────────┘
```

**Components:**

1. **Supabase Edge Function** (`caldav-sync`)
   - Runs every 15 minutes (cron job)
   - For each user with CalDAV enabled:
     - Connects to iCloud CalDAV server
     - Fetches changed events
     - Updates Supabase database
     - Pushes local changes to iCloud
   - Handles auth with encrypted passwords

2. **CalDAV Client Library**
   - npm package: `tsdav` (TypeScript CalDAV client)
   - Handles CalDAV protocol details
   - Supports iCloud, Google Calendar, etc.

3. **Encryption**
   - CalDAV passwords encrypted in database
   - Uses Supabase Vault or row-level encryption

## Implementation Phases

### Phase 1: Basic CalDAV Sync (Week 1)

**Tasks:**
1. ✅ Create database migrations (new tables)
2. ✅ Install `tsdav` package
3. ✅ Create Supabase Edge Function for sync
4. ✅ Implement CalDAV connection setup UI
5. ✅ Implement one-way sync: iCloud → Home Dashboard
6. ✅ Test with single user

**Deliverable:** Can view iPhone calendar events in Home Dashboard

### Phase 2: Bidirectional Sync (Week 2)

**Tasks:**
1. ✅ Implement sync: Home Dashboard → iCloud
2. ✅ Add conflict resolution (last-write-wins)
3. ✅ Handle recurring events (RRULE)
4. ✅ Test with multiple family members
5. ✅ Add sync status indicators in UI

**Deliverable:** Full bidirectional sync working

### Phase 3: Polish & Reliability (Week 3)

**Tasks:**
1. ✅ Error handling & retry logic
2. ✅ Rate limiting protection
3. ✅ Sync progress indicators
4. ✅ Manual sync trigger button
5. ✅ Connection health monitoring
6. ✅ User notifications for sync errors

**Deliverable:** Production-ready sync

## Security Considerations

### Password Storage

**App-specific passwords will be:**
1. Encrypted using Supabase's encryption (at rest)
2. Only decrypted server-side in Edge Function
3. Never sent to client/browser
4. Stored separately from user's main Apple ID password

**Row-Level Security:**
```sql
-- Users can only see their own CalDAV connections
CREATE POLICY "Users can manage own CalDAV connections"
ON caldav_connections FOR ALL
USING (user_id = auth.uid());
```

### API Limits

**iCloud CalDAV Limits:**
- ~10 requests per minute per user (conservative)
- Our sync: 1 request per 15 minutes = well within limits
- Implements exponential backoff on errors

## User Experience

### Initial Setup Flow (Web App)

1. User goes to **Settings** → **Calendar Sync**
2. Clicks **Connect iCloud Calendar**
3. Enters:
   - Apple ID email
   - App-specific password
   - (Optional) Select which calendars to sync
4. App tests connection immediately
5. Shows "✓ Connected - Syncing..." status
6. Initial sync begins (~1-5 min)
7. Shows progress: "Synced 132 of 245 events..."

### Ongoing Use

**Wall Display:**
- Shows all events from synced calendars
- Color-coded by calendar
- Updates every 15 minutes automatically
- No visible "syncing" indicator (happens in background)

**If Sync Fails:**
- Small notification: "Calendar sync paused - check settings"
- Email notification after 3 consecutive failures
- User can manually retry in settings

### Settings UI

```
Calendar Sync
├─ Connected Calendars
│  ├─ you@icloud.com
│  │  ├─ Status: ✓ Synced 2 minutes ago
│  │  ├─ Calendars: Personal, Family (2 of 5)
│  │  └─ [Disconnect] [Sync Now]
│  └─ [+ Add Another Calendar]
├─ Sync Settings
│  ├─ Frequency: Every 15 minutes
│  └─ Range: 30 days past, 365 days future
└─ Advanced
   ├─ Manual Sync: [Sync All Now]
   └─ View Sync Log
```

## Testing Plan

### Unit Tests
- CalDAV connection/auth
- Event conversion (CalDAV ↔ Database)
- RRULE parsing
- Conflict resolution

### Integration Tests
- Full sync cycle
- Bidirectional sync
- Multiple users
- Error scenarios (network, auth failure, etc.)

### Manual Testing Checklist
- [ ] Create event on iPhone → appears in Home Dashboard
- [ ] Create event in Home Dashboard → appears on iPhone
- [ ] Edit event on iPhone → updates in Home Dashboard
- [ ] Edit event in Home Dashboard → updates on iPhone
- [ ] Delete event on iPhone → deleted in Home Dashboard
- [ ] Delete event in Home Dashboard → deleted on iPhone
- [ ] Create recurring event on iPhone → syncs correctly
- [ ] Modify single instance of recurring event → syncs correctly
- [ ] Test with 2+ family members
- [ ] Test sync after 7 days offline
- [ ] Test invalid password handling
- [ ] Test sync conflict resolution

## Cost Analysis

**Infrastructure:**
- Supabase Edge Functions: Free tier (2M requests/month)
- Our usage: ~96 requests/day per user (15 min intervals)
- 2 users = ~5,760 requests/month = well within free tier

**External APIs:**
- iCloud CalDAV: Free (Apple service)
- No additional costs!

**Total: $0/month** 🎉

## Alternative: Google Calendar

The same implementation works for Google Calendar!

**Just change:**
- Server URL: `https://apidata.googleusercontent.com/caldav/v2/`
- Password: Google app-specific password
- Everything else is identical (CalDAV is a standard)

**Future enhancement:**
- Auto-detect calendar provider from email domain
- Support both iCloud and Google simultaneously

## Next Steps

Ready to implement? Here's what I need from you:

1. **Generate App-Specific Passwords**
   - For your Apple ID
   - For your partner's Apple ID
   - Follow instructions at top of this document

2. **Confirm Sync Settings**
   - Is 30 days back / 365 days forward okay?
   - Is 15-minute sync frequency okay?
   - Any specific calendars to exclude?

3. **Choose First Implementation**
   - Just iCloud for now?
   - Or add Google Calendar support too?

Once you provide the above, I'll:
1. Create database migrations
2. Set up CalDAV sync Edge Function
3. Build settings UI for connection setup
4. Implement full bidirectional sync

Ready to go! 🚀
