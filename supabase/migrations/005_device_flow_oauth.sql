-- OAuth 2.0 Device Authorization Grant (RFC 8628) Implementation
-- This replaces the callback-based pairing with proper device flow

-- Device codes table for temporary activation codes
CREATE TABLE public.device_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code TEXT UNIQUE NOT NULL, -- Internal UUID for polling
  user_code TEXT UNIQUE NOT NULL, -- Human-friendly code like "apple-mountain"
  device_name TEXT,
  device_id TEXT NOT NULL, -- Unique device identifier
  user_agent TEXT,
  ip_address INET,

  -- Activation state
  activated BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,

  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update device_tokens to support device flow
ALTER TABLE public.device_tokens
  ADD COLUMN IF NOT EXISTS last_refreshed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS refresh_expires_at TIMESTAMPTZ;

-- Indexes for performance
CREATE INDEX idx_device_codes_device_code ON public.device_codes(device_code);
CREATE INDEX idx_device_codes_user_code ON public.device_codes(user_code);
CREATE INDEX idx_device_codes_expires_at ON public.device_codes(expires_at);
CREATE INDEX idx_device_codes_user_id ON public.device_codes(user_id);

-- Enable RLS
ALTER TABLE public.device_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for device_codes
-- Anyone can create device codes (no auth required for Electron app)
CREATE POLICY "Anyone can create device codes"
  ON public.device_codes FOR INSERT
  WITH CHECK (true);

-- Anyone can poll their own device code
CREATE POLICY "Anyone can view device codes by device_code"
  ON public.device_codes FOR SELECT
  USING (true);

-- Authenticated users can activate codes
CREATE POLICY "Authenticated users can update device codes"
  ON public.device_codes FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Function to clean up expired device codes
CREATE OR REPLACE FUNCTION cleanup_expired_device_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM public.device_codes
  WHERE expires_at < NOW() AND activated = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON public.device_codes TO anon, authenticated;
