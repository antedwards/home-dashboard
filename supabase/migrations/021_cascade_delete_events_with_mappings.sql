-- Migration: Add trigger to cascade delete events when their CalDAV mappings are deleted
-- This ensures that when a CalDAV connection is deleted, the synced events are also cleaned up

-- Create function to delete orphaned events
CREATE OR REPLACE FUNCTION delete_orphaned_caldav_events()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the event if this was its last mapping
  DELETE FROM events
  WHERE id = OLD.event_id
  AND NOT EXISTS (
    SELECT 1 FROM caldav_event_mappings
    WHERE event_id = OLD.event_id
    AND id != OLD.id
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on caldav_event_mappings deletion
CREATE TRIGGER cascade_delete_caldav_events
  AFTER DELETE ON caldav_event_mappings
  FOR EACH ROW
  EXECUTE FUNCTION delete_orphaned_caldav_events();

-- Add comment
COMMENT ON FUNCTION delete_orphaned_caldav_events() IS
  'Automatically deletes events when their last CalDAV mapping is removed. '
  'This ensures that deleting a CalDAV connection cleans up all synced events.';
