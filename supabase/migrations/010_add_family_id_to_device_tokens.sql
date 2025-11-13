-- Add family_id to device_tokens table so we don't need to join family_members
-- (which would fail due to RLS)

ALTER TABLE public.device_tokens
  ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id);

-- Backfill existing tokens with family_id
UPDATE public.device_tokens dt
SET family_id = fm.family_id
FROM public.family_members fm
WHERE dt.user_id = fm.user_id
  AND dt.family_id IS NULL;

COMMENT ON COLUMN public.device_tokens.family_id IS 'Family ID for easy access without joining family_members';
