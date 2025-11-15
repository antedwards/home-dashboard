-- Add organizer fields to events table
ALTER TABLE public.events
ADD COLUMN organizer_email TEXT,
ADD COLUMN organizer_name TEXT;

-- Add index for querying events by organizer
CREATE INDEX idx_events_organizer_email ON public.events(organizer_email);
