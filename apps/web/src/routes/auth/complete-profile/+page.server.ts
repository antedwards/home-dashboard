/**
 * Complete profile page for new invited users
 * Creates user profile and adds to family
 */

import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { users, householdMembers, invitations } from '@home-dashboard/database/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.getSession?.();

  if (!session?.user) {
    throw redirect(303, '/auth/login');
  }

  // Check if user already has a profile
  const db = locals.db;

  if (!db) {
    return json({ error: 'Database connection not available' }, { status: 500 });
  }
  const [userProfile] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (userProfile) {
    // Profile already exists, go to home
    throw redirect(303, '/');
  }

  return {
    email: session.user.email,
  };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const session = await locals.getSession?.();

    if (!session?.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const name = formData.get('name')?.toString();
    const password = formData.get('password')?.toString();

    if (!name || !password) {
      return fail(400, { error: 'Name and password are required' });
    }

    if (password.length < 6) {
      return fail(400, { error: 'Password must be at least 6 characters' });
    }

    const db = locals.db;

  if (!db) {
    return json({ error: 'Database connection not available' }, { status: 500 });
  }

    try {
      // Find the invitation for this user's email
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.email, session.user.email!))
        .limit(1);

      if (!invitation) {
        return fail(400, { error: 'No invitation found for this email' });
      }

      // Generate a random color for the user
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      // Set the user's password
      const { error: passwordError } = await locals.supabase.auth.updateUser({
        password,
      });

      if (passwordError) {
        console.error('Error setting password:', passwordError);
        return fail(400, { error: 'Failed to set password' });
      }

      // Create user profile
      await db.insert(users).values({
        id: session.user.id,
        email: session.user.email!,
        name,
        color: randomColor,
      });

      // Add user to household
      await db.insert(householdMembers).values({
        householdId: invitation.householdId,
        userId: session.user.id,
        role: 'member',
        color: randomColor,
      });

      // Mark invitation as accepted
      await db
        .update(invitations)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(invitations.id, invitation.id));

      throw redirect(303, '/');
    } catch (error: any) {
      console.error('Error completing profile:', error);
      if (error.status === 303) throw error; // Re-throw redirects
      return fail(500, { error: 'Failed to complete profile' });
    }
  }
};
