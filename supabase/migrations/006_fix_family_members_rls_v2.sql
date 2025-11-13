-- Fix infinite recursion in family_members RLS policy (take 2)
-- The second policy still causes recursion. We only need the simple policy.

DROP POLICY IF EXISTS "Users can view members in their families" ON public.family_members;

-- Keep only the simple policy that doesn't cause recursion
-- Users can view their own family memberships
-- Other tables can reference family_members safely with EXISTS clauses
