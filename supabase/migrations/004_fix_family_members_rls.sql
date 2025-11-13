-- Fix infinite recursion in family_members RLS policy
-- The issue is that the policy queries family_members from within a family_members policy

DROP POLICY IF EXISTS "Family members can view other family members" ON public.family_members;

-- Split into two policies to avoid recursion:

-- Policy 1: Users can always view their own family memberships (direct check, no recursion)
CREATE POLICY "Users can view their own family memberships"
  ON public.family_members FOR SELECT
  USING (user_id = auth.uid());

-- Policy 2: Users can view other members in families they belong to
-- This works because when the subquery runs, it uses Policy 1 above (which doesn't recurse)
CREATE POLICY "Users can view members in their families"
  ON public.family_members FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = auth.uid()
    )
  );
