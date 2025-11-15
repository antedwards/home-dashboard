-- Calendar sync connections for CalDAV (iCloud, Google, etc.)
CREATE TABLE IF NOT EXISTS caldav_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,  -- Encrypted app-specific password
  server_url TEXT NOT NULL DEFAULT 'https://caldav.icloud.com',
  display_name TEXT,  -- User's display name
  enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,  -- 'success', 'error', 'pending'
  last_sync_error TEXT,
  sync_token TEXT,  -- CalDAV sync-token for efficient incremental syncs
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, email)
);

-- Enable RLS
ALTER TABLE caldav_connections ENABLE ROW LEVEL SECURITY;

-- Users can only see their own connections
CREATE POLICY "Users can view own caldav connections"
  ON caldav_connections FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own connections
CREATE POLICY "Users can insert own caldav connections"
  ON caldav_connections FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own connections
CREATE POLICY "Users can update own caldav connections"
  ON caldav_connections FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own connections
CREATE POLICY "Users can delete own caldav connections"
  ON caldav_connections FOR DELETE
  USING (user_id = auth.uid());

-- Map events to external CalDAV UIDs for sync tracking
CREATE TABLE IF NOT EXISTS caldav_event_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  caldav_connection_id UUID REFERENCES caldav_connections(id) ON DELETE CASCADE NOT NULL,
  external_uid TEXT NOT NULL,  -- CalDAV event UID (unique identifier)
  external_calendar TEXT NOT NULL,  -- Calendar name on external service
  external_url TEXT,  -- CalDAV URL for this event
  etag TEXT,  -- ETag for optimistic locking
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  sync_direction TEXT CHECK (sync_direction IN ('import', 'export', 'bidirectional')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(caldav_connection_id, external_uid)
);

-- Enable RLS
ALTER TABLE caldav_event_mappings ENABLE ROW LEVEL SECURITY;

-- Users can view mappings for their events
CREATE POLICY "Users can view own event mappings"
  ON caldav_event_mappings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = caldav_event_mappings.event_id
      AND events.user_id = auth.uid()
    )
  );

-- Users can insert mappings for their events
CREATE POLICY "Users can insert own event mappings"
  ON caldav_event_mappings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = caldav_event_mappings.event_id
      AND events.user_id = auth.uid()
    )
  );

-- Users can update mappings for their events
CREATE POLICY "Users can update own event mappings"
  ON caldav_event_mappings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = caldav_event_mappings.event_id
      AND events.user_id = auth.uid()
    )
  );

-- Users can delete mappings for their events
CREATE POLICY "Users can delete own event mappings"
  ON caldav_event_mappings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = caldav_event_mappings.event_id
      AND events.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_caldav_connections_user_id ON caldav_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_caldav_connections_family_id ON caldav_connections(family_id);
CREATE INDEX IF NOT EXISTS idx_caldav_connections_enabled ON caldav_connections(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_caldav_event_mappings_event_id ON caldav_event_mappings(event_id);
CREATE INDEX IF NOT EXISTS idx_caldav_event_mappings_connection_id ON caldav_event_mappings(caldav_connection_id);
CREATE INDEX IF NOT EXISTS idx_caldav_event_mappings_external_uid ON caldav_event_mappings(caldav_connection_id, external_uid);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_caldav_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_caldav_connections_updated_at
  BEFORE UPDATE ON caldav_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_caldav_updated_at();

CREATE TRIGGER update_caldav_event_mappings_updated_at
  BEFORE UPDATE ON caldav_event_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_caldav_updated_at();
