-- Revert the broken RLS policy change
DROP POLICY IF EXISTS "Allow device token creation" ON public.device_tokens;

-- Restore original policy
CREATE POLICY "Users can create their own device tokens"
  ON public.device_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());
