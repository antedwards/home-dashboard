-- Create storage bucket for Electron app updates
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-updates', 'app-updates', false);

-- Enable RLS on app-updates bucket
CREATE POLICY "Authenticated devices can download updates"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'app-updates' AND
  auth.uid() IS NOT NULL
);

-- Only allow service role to upload (for CI/CD)
CREATE POLICY "Service role can upload updates"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'app-updates' AND
  auth.jwt() ->> 'role' = 'service_role'
);
