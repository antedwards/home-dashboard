import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { householdMembers } from '@home-dashboard/database/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
  // Check if user is authenticated
  const session = await locals.getSession();

  if (!session) {
    // Redirect to login if not authenticated
    throw redirect(303, '/auth/login');
  }

  // Get user's household using Drizzle (bypasses RLS issues)
  const db = locals.db;

  if (!db) {
    console.error('Database connection not available');
    return {
      error: 'Database connection not available',
      userId: session.user.id,
      householdId: null,
      session: {
        email: session.user.email || '',
      },
    };
  }
  let member;
  try {
    [member] = await db
      .select()
      .from(householdMembers)
      .where(eq(householdMembers.userId, session.user.id))
      .limit(1);
  } catch (error) {
    console.error('Database query error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: session.user.id,
    });
    return {
      error: 'Database connection error. Please try again.',
      userId: session.user.id,
      householdId: null,
      session: {
        email: session.user.email || '',
      },
    };
  }

  if (!member) {
    console.error('Household lookup error: No household member found for user');
    return {
      error: 'Could not find your household. Please contact support.',
      userId: session.user.id,
      householdId: null,
      session: {
        email: session.user.email || '',
      },
    };
  }

  return {
    userId: session.user.id,
    householdId: member.householdId,
    error: null,
    session: {
      email: session.user.email || '',
    },
  };
};
