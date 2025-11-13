-- Add token columns to device_codes table
-- Tokens are created during activation and stored temporarily for polling to retrieve

ALTER TABLE public.device_codes
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token TEXT;

COMMENT ON COLUMN public.device_codes.access_token IS 'Plain access token created during activation (temporary storage for polling)';
COMMENT ON COLUMN public.device_codes.refresh_token IS 'Plain refresh token created during activation (temporary storage for polling)';
