-- Migration: Rename families to households and add care network features
-- This migration transforms the family-centric model to a household model with cross-household sharing

-- Step 1: Rename tables
ALTER TABLE families RENAME TO households;
ALTER TABLE family_members RENAME TO household_members;

-- Step 2: Rename columns in households table
ALTER TABLE households ADD COLUMN IF NOT EXISTS address TEXT;

-- Step 3: Rename columns in household_members table
ALTER TABLE household_members RENAME COLUMN family_id TO household_id;

-- Step 4: Rename foreign key columns in all other tables
-- Categories
ALTER TABLE categories RENAME COLUMN family_id TO household_id;

-- Events
ALTER TABLE events RENAME COLUMN family_id TO household_id;

-- Device tokens
ALTER TABLE device_tokens RENAME COLUMN family_id TO household_id;

-- Invitations
ALTER TABLE invitations RENAME COLUMN family_id TO household_id;

-- CalDAV connections
ALTER TABLE caldav_connections RENAME COLUMN family_id TO household_id;

-- Step 5: Create care_relationships table
CREATE TABLE IF NOT EXISTS care_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  care_recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view', 'manage', 'full')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(caregiver_user_id, care_recipient_user_id)
);

-- Add indexes for care_relationships
CREATE INDEX IF NOT EXISTS idx_care_relationships_caregiver ON care_relationships(caregiver_user_id);
CREATE INDEX IF NOT EXISTS idx_care_relationships_recipient ON care_relationships(care_recipient_user_id);

-- Step 6: Add visibility model to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'household' CHECK (visibility IN ('household', 'private', 'shared'));

-- Set owner_id for existing categories (use household creator as default)
UPDATE categories c
SET owner_id = h.created_by
FROM households h
WHERE c.household_id = h.id AND c.owner_id IS NULL;

-- Make owner_id NOT NULL after backfilling
ALTER TABLE categories ALTER COLUMN owner_id SET NOT NULL;

-- Add index for categories owner
CREATE INDEX IF NOT EXISTS idx_categories_owner ON categories(owner_id);
CREATE INDEX IF NOT EXISTS idx_categories_visibility ON categories(visibility);

-- Step 7: Create calendar_shares table
CREATE TABLE IF NOT EXISTS calendar_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (shared_with_user_id IS NOT NULL AND shared_with_household_id IS NULL) OR
    (shared_with_user_id IS NULL AND shared_with_household_id IS NOT NULL)
  )
);

-- Add indexes for calendar_shares
CREATE INDEX IF NOT EXISTS idx_calendar_shares_category ON calendar_shares(category_id);
CREATE INDEX IF NOT EXISTS idx_calendar_shares_user ON calendar_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_shares_household ON calendar_shares(shared_with_household_id);

-- Step 8: Enable RLS on new tables
ALTER TABLE care_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_shares ENABLE ROW LEVEL SECURITY;

-- Step 9: RLS Policies for care_relationships

-- Users can view care relationships where they are caregiver or recipient
CREATE POLICY "Users can view their care relationships"
  ON care_relationships FOR SELECT
  USING (
    caregiver_user_id = auth.uid() OR
    care_recipient_user_id = auth.uid()
  );

-- Users can create care relationships where they are the caregiver
CREATE POLICY "Users can create care relationships as caregiver"
  ON care_relationships FOR INSERT
  WITH CHECK (caregiver_user_id = auth.uid());

-- Users can update care relationships where they are caregiver or recipient
CREATE POLICY "Users can update their care relationships"
  ON care_relationships FOR UPDATE
  USING (
    caregiver_user_id = auth.uid() OR
    care_recipient_user_id = auth.uid()
  );

-- Users can delete care relationships where they are caregiver or recipient
CREATE POLICY "Users can delete their care relationships"
  ON care_relationships FOR DELETE
  USING (
    caregiver_user_id = auth.uid() OR
    care_recipient_user_id = auth.uid()
  );

-- Step 10: RLS Policies for calendar_shares

-- Users can view shares for calendars they own or shares that include them
CREATE POLICY "Users can view relevant calendar shares"
  ON calendar_shares FOR SELECT
  USING (
    -- Calendar owner can see all shares
    category_id IN (
      SELECT id FROM categories WHERE owner_id = auth.uid()
    ) OR
    -- User is directly shared with
    shared_with_user_id = auth.uid() OR
    -- User's household is shared with
    shared_with_household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

-- Calendar owners can create shares
CREATE POLICY "Calendar owners can create shares"
  ON calendar_shares FOR INSERT
  WITH CHECK (
    category_id IN (
      SELECT id FROM categories WHERE owner_id = auth.uid()
    )
  );

-- Calendar owners can update shares
CREATE POLICY "Calendar owners can update shares"
  ON calendar_shares FOR UPDATE
  USING (
    category_id IN (
      SELECT id FROM categories WHERE owner_id = auth.uid()
    )
  );

-- Calendar owners can delete shares
CREATE POLICY "Calendar owners can delete shares"
  ON calendar_shares FOR DELETE
  USING (
    category_id IN (
      SELECT id FROM categories WHERE owner_id = auth.uid()
    )
  );

-- Step 11: Update existing RLS policies for categories to account for visibility

-- Drop old category policies
DROP POLICY IF EXISTS "Users can view household categories" ON categories;
DROP POLICY IF EXISTS "Users can insert categories" ON categories;
DROP POLICY IF EXISTS "Users can update categories" ON categories;
DROP POLICY IF EXISTS "Users can delete categories" ON categories;

-- New category policies with visibility support
CREATE POLICY "Users can view accessible categories"
  ON categories FOR SELECT
  USING (
    -- Household-visible categories
    (visibility = 'household' AND household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )) OR
    -- Private categories (owner only)
    (visibility = 'private' AND owner_id = auth.uid()) OR
    -- Shared categories
    (visibility = 'shared' AND (
      owner_id = auth.uid() OR
      id IN (
        SELECT category_id FROM calendar_shares
        WHERE shared_with_user_id = auth.uid() OR
        shared_with_household_id IN (
          SELECT household_id FROM household_members WHERE user_id = auth.uid()
        )
      )
    ))
  );

CREATE POLICY "Users can create categories in their household"
  ON categories FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    ) AND owner_id = auth.uid()
  );

CREATE POLICY "Category owners can update their categories"
  ON categories FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Category owners can delete their categories"
  ON categories FOR DELETE
  USING (owner_id = auth.uid());

-- Step 12: Add comments for documentation
COMMENT ON TABLE households IS 'Households represent physical locations where people live together';
COMMENT ON TABLE household_members IS 'Users who are members of a household';
COMMENT ON TABLE care_relationships IS 'Cross-household care relationships (e.g., caring for elderly parents)';
COMMENT ON TABLE calendar_shares IS 'Sharing calendars across households or with specific users';
COMMENT ON COLUMN categories.visibility IS 'household: visible to all household members, private: owner only, shared: specific users/households';
COMMENT ON COLUMN categories.owner_id IS 'User who created and owns this calendar';
COMMENT ON COLUMN calendar_shares.shared_with_user_id IS 'Individual user this calendar is shared with (mutually exclusive with household)';
COMMENT ON COLUMN calendar_shares.shared_with_household_id IS 'Household this calendar is shared with (mutually exclusive with user)';
