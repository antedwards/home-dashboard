/**
 * Auth callback handler for Supabase redirects
 * Handles email confirmation and invitation acceptance
 */

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createDbClient } from '@home-dashboard/database/db/client';
import { users } from '@home-dashboard/database/db/schema';
import { eq } from 'drizzle-orm';
import { DATABASE_URL } from '$env/static/private';

export const load: PageServerLoad = async ({ locals, url }) => {
  // Get the authenticated session (Supabase handles token exchange automatically)
  const session = await locals.getSession?.();

  if (!session?.user) {
    // If no session, something went wrong
    throw redirect(303, '/auth/login?error=Authentication failed');
  }

  // Check if user has completed their profile
  const db = createDbClient(DATABASE_URL);
  const [userProfile] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!userProfile) {
    // New user needs to complete profile
    throw redirect(303, '/auth/complete-profile');
  }

  // Existing user, go to home
  throw redirect(303, '/');
};
