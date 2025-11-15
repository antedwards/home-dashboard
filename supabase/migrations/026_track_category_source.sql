-- Add source tracking to categories so we can clean up orphaned CalDAV categories
-- When a CalDAV connection is deleted, its categories should be deleted too

ALTER TABLE public.categories
ADD COLUMN caldav_connection_id UUID REFERENCES public.caldav_connections(id) ON DELETE CASCADE,
ADD COLUMN source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'caldav'));

-- Set existing CalDAV-synced categories
-- We can identify them by checking if they have events with caldav_event_mappings
UPDATE public.categories
SET source = 'caldav'
WHERE id IN (
  SELECT DISTINCT e.category_id
  FROM events e
  INNER JOIN caldav_event_mappings cem ON e.id = cem.event_id
  WHERE e.category_id IS NOT NULL
);

-- Add index
CREATE INDEX idx_categories_caldav_connection ON public.categories(caldav_connection_id);

-- Add comments
COMMENT ON COLUMN public.categories.caldav_connection_id IS
  'If this category was created by CalDAV sync, the connection that created it. Category will be deleted if connection is deleted.';

COMMENT ON COLUMN public.categories.source IS
  'Source of this category: manual (user-created) or caldav (auto-created from sync)';
