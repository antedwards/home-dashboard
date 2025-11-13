-- Fix device_tokens RLS to allow token creation from device code polling
-- The polling request is unauthenticated, but needs to create tokens for activated device codes

DROP POLICY IF EXISTS "Users can create their own device tokens" ON public.device_tokens;

-- Allow creating device tokens for authenticated users OR from activated device codes
CREATE POLICY "Allow device token creation"
  ON public.device_tokens FOR INSERT
  WITH CHECK (
    -- Case 1: Authenticated user creating their own token
    user_id = auth.uid()
    OR
    -- Case 2: System creating token for activated device code (unauthenticated polling)
    auth.uid() IS NULL AND EXISTS (
      SELECT 1 FROM public.device_codes
      WHERE device_codes.user_id = device_tokens.user_id
        AND device_codes.device_id = device_tokens.device_id
        AND device_codes.activated = true
    )
  );
