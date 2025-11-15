-- Add metadata JSONB field to events table for storing local customizations
-- that should not be overwritten by CalDAV sync
-- Examples: tags, notes, display preferences, parent-only flags, privacy settings

ALTER TABLE public.events
ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for querying metadata
CREATE INDEX idx_events_metadata ON public.events USING GIN (metadata);

-- Add comments
COMMENT ON COLUMN public.events.metadata IS
  'Local metadata that is preserved during CalDAV sync. Can include: tags, notes, display preferences, parent_only flag, privacy_level, etc.';

-- Example metadata structure:
-- {
--   "tags": ["important", "family"],
--   "notes": "Remember to bring snacks",
--   "parent_only": true,
--   "privacy_level": "private",
--   "display_color_override": "#ff0000",
--   "custom_reminder_times": [15, 60]
-- }
