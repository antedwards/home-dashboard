-- Add external_attendees JSONB field to store ALL attendees from synced events
-- This preserves attendee information even if they're not household members
-- The event_attendees junction table is used separately to link household members

ALTER TABLE public.events
ADD COLUMN external_attendees JSONB DEFAULT '[]'::jsonb;

-- Add index for querying external attendees
CREATE INDEX idx_events_external_attendees ON public.events USING GIN (external_attendees);

-- Add comments
COMMENT ON COLUMN public.events.external_attendees IS
  'All attendees from external calendars (CalDAV sync). Array of objects with email, name, partstat. Separate from event_attendees which links to household members.';

-- Example external_attendees structure:
-- [
--   {
--     "email": "john@example.com",
--     "name": "John Doe",
--     "partstat": "accepted"
--   },
--   {
--     "email": "jane@example.com",
--     "name": "Jane Smith",
--     "partstat": "tentative"
--   }
-- ]
