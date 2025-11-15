-- Add essential iCalendar fields to events table for CalDAV sync
-- Streamlined to only include fields critical for sync functionality

-- STATUS field: Track event status (tentative, confirmed, cancelled)
-- CRITICAL: Needed to handle cancelled events from CalDAV
ALTER TABLE events ADD COLUMN IF NOT EXISTS status TEXT
  CHECK (status IN ('tentative', 'confirmed', 'cancelled'))
  DEFAULT 'confirmed';

-- SEQUENCE field: Version number for conflict resolution
-- CRITICAL: Increments each time event is modified, used to detect conflicts
ALTER TABLE events ADD COLUMN IF NOT EXISTS sequence INTEGER DEFAULT 0;

-- UID field: Store the iCalendar UID directly in events table
-- CRITICAL: Required for round-trip sync with CalDAV servers
ALTER TABLE events ADD COLUMN IF NOT EXISTS ical_uid TEXT;

-- DTSTAMP field: When the event was created/modified (per iCal spec)
-- CRITICAL: Used as tiebreaker in conflict resolution when sequences are equal
ALTER TABLE events ADD COLUMN IF NOT EXISTS ical_timestamp TIMESTAMPTZ;

-- Index for ical_uid lookups
CREATE INDEX IF NOT EXISTS idx_events_ical_uid ON events(ical_uid) WHERE ical_uid IS NOT NULL;

-- Index for status (to filter cancelled events)
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- Comments
COMMENT ON COLUMN events.status IS 'Event status: tentative, confirmed, or cancelled (per RFC 5545)';
COMMENT ON COLUMN events.sequence IS 'Revision number, incremented on each modification for conflict resolution';
COMMENT ON COLUMN events.ical_uid IS 'iCalendar UID for external sync with CalDAV servers';
COMMENT ON COLUMN events.ical_timestamp IS 'DTSTAMP - last modification timestamp per iCalendar spec';
