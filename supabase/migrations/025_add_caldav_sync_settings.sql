-- Add sync settings to caldav_connections table
-- Allows users to configure which calendars to sync and date ranges

ALTER TABLE public.caldav_connections
ADD COLUMN selected_calendars JSONB DEFAULT '[]'::jsonb,
ADD COLUMN sync_past_days INTEGER DEFAULT 30,
ADD COLUMN sync_future_days INTEGER DEFAULT 365;

-- Add index for querying selected calendars
CREATE INDEX idx_caldav_connections_selected_calendars ON public.caldav_connections USING GIN (selected_calendars);

-- Add comments
COMMENT ON COLUMN public.caldav_connections.selected_calendars IS
  'Array of calendar objects to sync. Format: [{"name": "Family", "url": "https://...", "enabled": true}]';

COMMENT ON COLUMN public.caldav_connections.sync_past_days IS
  'Number of days in the past to sync events from (default 30)';

COMMENT ON COLUMN public.caldav_connections.sync_future_days IS
  'Number of days in the future to sync events from (default 365)';

-- Example selected_calendars structure:
-- [
--   {
--     "name": "Family",
--     "url": "https://caldav.icloud.com/...",
--     "color": "#3b82f6",
--     "enabled": true,
--     "event_count": 31
--   }
-- ]
