-- Add iCalendar-specific fields to events table for better CalDAV sync

-- STATUS field: Track event status (tentative, confirmed, cancelled)
ALTER TABLE events ADD COLUMN IF NOT EXISTS status TEXT
  CHECK (status IN ('tentative', 'confirmed', 'cancelled'))
  DEFAULT 'confirmed';

-- SEQUENCE field: Version number for conflict resolution
-- Increments each time event is modified
ALTER TABLE events ADD COLUMN IF NOT EXISTS sequence INTEGER DEFAULT 0;

-- TRANSP field: Transparency - show as busy or free in calendar
ALTER TABLE events ADD COLUMN IF NOT EXISTS transparency TEXT
  CHECK (transparency IN ('opaque', 'transparent'))
  DEFAULT 'opaque';

-- PRIORITY field: 0 (undefined) to 9 (highest)
ALTER TABLE events ADD COLUMN IF NOT EXISTS priority INTEGER
  CHECK (priority >= 0 AND priority <= 9)
  DEFAULT 0;

-- CLASS field: Access classification
ALTER TABLE events ADD COLUMN IF NOT EXISTS classification TEXT
  CHECK (classification IN ('public', 'private', 'confidential'))
  DEFAULT 'public';

-- ORGANIZER field: Email/URI of event organizer
-- Note: We already have user_id, but this stores the external organizer info
ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer TEXT;

-- UID field: Store the iCalendar UID directly in events table
-- This is important for round-trip sync
ALTER TABLE events ADD COLUMN IF NOT EXISTS ical_uid TEXT;

-- DTSTAMP field: When the event was created/modified (per iCal spec)
ALTER TABLE events ADD COLUMN IF NOT EXISTS ical_timestamp TIMESTAMPTZ;

-- Index for ical_uid lookups
CREATE INDEX IF NOT EXISTS idx_events_ical_uid ON events(ical_uid) WHERE ical_uid IS NOT NULL;

-- Index for status (to filter cancelled events)
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- Comments explaining the fields
COMMENT ON COLUMN events.status IS 'Event status: tentative, confirmed, or cancelled (per RFC 5545)';
COMMENT ON COLUMN events.sequence IS 'Revision number, incremented on each modification (per RFC 5545)';
COMMENT ON COLUMN events.transparency IS 'Whether event blocks time (opaque) or not (transparent)';
COMMENT ON COLUMN events.priority IS 'Event priority: 0=undefined, 1=highest, 9=lowest';
COMMENT ON COLUMN events.classification IS 'Access level: public, private, or confidential';
COMMENT ON COLUMN events.organizer IS 'Email or URI of event organizer';
COMMENT ON COLUMN events.ical_uid IS 'iCalendar UID for external sync';
COMMENT ON COLUMN events.ical_timestamp IS 'DTSTAMP - last modification timestamp per iCalendar spec';
