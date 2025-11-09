-- Add admin flag to users table
ALTER TABLE public.users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- Create invitations table for admin-only signup
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  invited_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Device pairing codes table (for Electron authentication)
CREATE TABLE public.device_pairing_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- Two-word code like "apple-mountain"
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  device_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Device tokens table (long-lived tokens for Electron)
CREATE TABLE public.device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  device_type TEXT DEFAULT 'electron', -- 'electron', 'ios', 'android'
  token_hash TEXT NOT NULL, -- Hashed token for security
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- Indexes
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_device_pairing_codes_code ON public.device_pairing_codes(code);
CREATE INDEX idx_device_pairing_codes_expires_at ON public.device_pairing_codes(expires_at);
CREATE INDEX idx_device_tokens_user_id ON public.device_tokens(user_id);
CREATE INDEX idx_device_tokens_device_id ON public.device_tokens(device_id);
CREATE INDEX idx_device_tokens_expires_at ON public.device_tokens(expires_at);

-- Enable RLS on new tables
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_pairing_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invitations (only admins can manage)
CREATE POLICY "Admins can view all invitations"
  ON public.invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_admin = TRUE
    )
  );

CREATE POLICY "Admins can create invitations"
  ON public.invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_admin = TRUE
    )
  );

-- RLS Policies for device pairing codes
CREATE POLICY "Users can view their own pairing codes"
  ON public.device_pairing_codes FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Authenticated users can create pairing codes"
  ON public.device_pairing_codes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their pairing codes"
  ON public.device_pairing_codes FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL);

-- RLS Policies for device tokens
CREATE POLICY "Users can view their own device tokens"
  ON public.device_tokens FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own device tokens"
  ON public.device_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own device tokens"
  ON public.device_tokens FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own device tokens"
  ON public.device_tokens FOR DELETE
  USING (user_id = auth.uid());

-- Function to clean up expired pairing codes
CREATE OR REPLACE FUNCTION cleanup_expired_pairing_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM public.device_pairing_codes
  WHERE expires_at < NOW() AND used = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to extend device token expiration
CREATE OR REPLACE FUNCTION extend_device_token(token_id UUID, extend_days INTEGER DEFAULT 90)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  new_expiry TIMESTAMPTZ;
BEGIN
  UPDATE public.device_tokens
  SET
    expires_at = NOW() + (extend_days || ' days')::INTERVAL,
    updated_at = NOW()
  WHERE id = token_id
  AND user_id = auth.uid()
  RETURNING expires_at INTO new_expiry;

  RETURN new_expiry;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for device_tokens updated_at
CREATE TRIGGER update_device_tokens_updated_at BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
