-- Remove old category text field and color, add category_id foreign key
ALTER TABLE public.events DROP COLUMN IF EXISTS category;
ALTER TABLE public.events DROP COLUMN IF EXISTS color;

-- Add category_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'events'
    AND column_name = 'category_id'
  ) THEN
    ALTER TABLE public.events ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index for category_id lookups (create if not exists)
CREATE INDEX IF NOT EXISTS idx_events_category_id ON public.events(category_id);
