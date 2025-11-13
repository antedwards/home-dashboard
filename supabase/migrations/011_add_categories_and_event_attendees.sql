-- Categories table (per family)
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, name)
);

-- Event attendees junction table (many-to-many between events and users)
CREATE TABLE public.event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Indexes for better query performance
CREATE INDEX idx_categories_family_id ON public.categories(family_id);
CREATE INDEX idx_event_attendees_event_id ON public.event_attendees(event_id);
CREATE INDEX idx_event_attendees_user_id ON public.event_attendees(user_id);

-- Enable RLS on new tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Family members can view categories"
  ON public.categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = categories.family_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can create categories"
  ON public.categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = categories.family_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can update categories"
  ON public.categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = categories.family_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can delete categories"
  ON public.categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = categories.family_id
      AND family_members.user_id = auth.uid()
    )
  );

-- Event attendees policies
CREATE POLICY "Family members can view event attendees"
  ON public.event_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      JOIN public.family_members ON family_members.family_id = events.family_id
      WHERE events.id = event_attendees.event_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can create event attendees"
  ON public.event_attendees FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      JOIN public.family_members ON family_members.family_id = events.family_id
      WHERE events.id = event_attendees.event_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can delete event attendees"
  ON public.event_attendees FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      JOIN public.family_members ON family_members.family_id = events.family_id
      WHERE events.id = event_attendees.event_id
      AND family_members.user_id = auth.uid()
    )
  );

-- Trigger for categories updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
