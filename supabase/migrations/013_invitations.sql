-- Invitations table for inviting users to platform and family
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already existed
DO $$
BEGIN
  -- Add family_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invitations'
    AND column_name = 'family_id'
  ) THEN
    ALTER TABLE public.invitations ADD COLUMN family_id UUID;
    -- Set a default for existing rows (if any) - you may need to adjust this
    UPDATE public.invitations SET family_id = (SELECT id FROM public.families LIMIT 1) WHERE family_id IS NULL;
    ALTER TABLE public.invitations ALTER COLUMN family_id SET NOT NULL;
    ALTER TABLE public.invitations ADD CONSTRAINT invitations_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
  END IF;

  -- Add email if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invitations'
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.invitations ADD COLUMN email TEXT NOT NULL DEFAULT 'placeholder@example.com';
  END IF;

  -- Add token if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invitations'
    AND column_name = 'token'
  ) THEN
    ALTER TABLE public.invitations ADD COLUMN token TEXT NOT NULL DEFAULT gen_random_uuid()::text;
    ALTER TABLE public.invitations ADD CONSTRAINT invitations_token_key UNIQUE(token);
  END IF;

  -- Add status if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invitations'
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.invitations ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
    -- Add constraint separately to avoid issues
    ALTER TABLE public.invitations ADD CONSTRAINT invitations_status_check CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'));
  END IF;

  -- Add invited_by if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invitations'
    AND column_name = 'invited_by'
  ) THEN
    ALTER TABLE public.invitations ADD COLUMN invited_by UUID;
    -- Set a default for existing rows
    UPDATE public.invitations SET invited_by = (SELECT id FROM public.users LIMIT 1) WHERE invited_by IS NULL;
    ALTER TABLE public.invitations ALTER COLUMN invited_by SET NOT NULL;
    ALTER TABLE public.invitations ADD CONSTRAINT invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;

  -- Add expires_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invitations'
    AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.invitations ADD COLUMN expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days');
  END IF;

  -- Add accepted_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invitations'
    AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE public.invitations ADD COLUMN accepted_at TIMESTAMPTZ;
  END IF;

  -- Add created_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invitations'
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.invitations ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Add updated_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invitations'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.invitations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Index for quick token lookups
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_family_id ON public.invitations(family_id);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'invitations' AND policyname = 'Family members can view invitations for their family'
  ) THEN
    CREATE POLICY "Family members can view invitations for their family"
      ON public.invitations FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.family_members
          WHERE family_members.family_id = invitations.family_id
          AND family_members.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'invitations' AND policyname = 'Family members can create invitations for their family'
  ) THEN
    CREATE POLICY "Family members can create invitations for their family"
      ON public.invitations FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.family_members
          WHERE family_members.family_id = invitations.family_id
          AND family_members.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'invitations' AND policyname = 'Family members can update invitations for their family'
  ) THEN
    CREATE POLICY "Family members can update invitations for their family"
      ON public.invitations FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.family_members
          WHERE family_members.family_id = invitations.family_id
          AND family_members.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_invitations_updated_at ON public.invitations;
CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
