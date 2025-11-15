-- Trigger to automatically increment sequence and update ical_timestamp on event updates
-- This ensures proper conflict resolution during CalDAV sync

-- Function to increment sequence on update
CREATE OR REPLACE FUNCTION increment_event_sequence()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment if this is an actual update (not same data)
  IF (
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.start_time IS DISTINCT FROM NEW.start_time OR
    OLD.end_time IS DISTINCT FROM NEW.end_time OR
    OLD.all_day IS DISTINCT FROM NEW.all_day OR
    OLD.location IS DISTINCT FROM NEW.location OR
    OLD.recurrence_rule IS DISTINCT FROM NEW.recurrence_rule OR
    OLD.status IS DISTINCT FROM NEW.status
  ) THEN
    -- Increment sequence number (for conflict detection)
    NEW.sequence := COALESCE(OLD.sequence, 0) + 1;

    -- Update DTSTAMP (last modification timestamp per iCalendar spec)
    NEW.ical_timestamp := NOW();

    -- Ensure updated_at is set
    NEW.updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS event_update_sequence_trigger ON events;
CREATE TRIGGER event_update_sequence_trigger
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION increment_event_sequence();

-- Comments
COMMENT ON FUNCTION increment_event_sequence() IS 'Automatically increments sequence number and updates ical_timestamp when event is modified';
COMMENT ON TRIGGER event_update_sequence_trigger ON events IS 'Ensures proper conflict resolution for CalDAV sync by tracking event modifications';
