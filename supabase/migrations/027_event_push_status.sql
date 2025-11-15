-- Add push status tracking to events table
-- This tracks when events are pushed to CalDAV and if they failed

ALTER TABLE public.events
ADD COLUMN last_push_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN last_push_status TEXT CHECK (last_push_status IN ('success', 'error', 'pending')),
ADD COLUMN last_push_error TEXT;

-- Add index for finding events that need to be pushed
CREATE INDEX idx_events_push_status ON public.events(last_push_status, last_push_at);

-- Add index for finding events that failed to push
CREATE INDEX idx_events_push_error ON public.events(last_push_status) WHERE last_push_status = 'error';

-- Add comments
COMMENT ON COLUMN public.events.last_push_at IS
  'Last time this event was pushed to CalDAV server';

COMMENT ON COLUMN public.events.last_push_status IS
  'Status of last CalDAV push: success, error, or pending';

COMMENT ON COLUMN public.events.last_push_error IS
  'Error message from last failed push attempt';
