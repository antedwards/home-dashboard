import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createDbClient } from '@home-dashboard/database/db/client';
import { familyMembers } from '@home-dashboard/database/db/schema';
import { eq } from 'drizzle-orm';
import { DATABASE_URL } from '$env/static/private';

export const load: PageServerLoad = async ({ locals }) => {
  // Check if user is authenticated
  const session = await locals.getSession();

  if (!session) {
    // Redirect to login if not authenticated
    throw redirect(303, '/auth/login');
  }

  // Get user's family using Drizzle (bypasses RLS issues)
  const db = createDbClient(DATABASE_URL);
  const [member] = await db
    .select()
    .from(familyMembers)
    .where(eq(familyMembers.userId, session.user.id))
    .limit(1);

  if (!member) {
    console.error('Family lookup error: No family member found for user');
    return {
      error: 'Could not find your family. Please contact support.',
      userId: session.user.id,
      familyId: null,
    };
  }

  return {
    userId: session.user.id,
    familyId: member.familyId,
    error: null,
  };
};
