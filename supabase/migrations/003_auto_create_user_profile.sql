-- Trigger to automatically create user profile and family when auth user is created
-- This ensures all necessary records exist for the app to work

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_family_id UUID;
BEGIN
  -- Create user profile
  INSERT INTO public.users (id, email, name, color)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    '#3B82F6'
  );

  -- Create a family for the user
  INSERT INTO public.families (id, name, created_by)
  VALUES (
    gen_random_uuid(),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)) || '''s Family',
    NEW.id
  )
  RETURNING id INTO new_family_id;

  -- Add user as admin of their family
  INSERT INTO public.family_members (family_id, user_id, role)
  VALUES (new_family_id, NEW.id, 'admin');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
