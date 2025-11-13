/**
 * Signup page server actions
 * Handles registration server-side using service role key
 */

import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createDbClient } from '@home-dashboard/database/db/client';
import { users, invitations } from '@home-dashboard/database/db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { DATABASE_URL } from '$env/static/private';

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.getSession?.();

  // If already logged in, redirect to home
  if (session?.user) {
    throw redirect(303, '/');
  }

  return {};
};

export const actions: Actions = {
  checkInvitation: async ({ request, locals }) => {
    const formData = await request.formData();
    const email = formData.get('email')?.toString();

    if (!email) {
      return fail(400, { error: 'Please enter your email', step: 'check' });
    }

    // Check if there's a valid invitation
    const db = createDbClient(DATABASE_URL);

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email),
          isNull(invitations.usedAt)
        )
      )
      .limit(1);

    if (!invitation) {
      return fail(400, {
        error: 'No valid invitation found for this email. Please contact an admin.',
        email,
        step: 'check'
      });
    }

    return { success: true, email, step: 'signup' };
  },

  signup: async ({ request, locals }) => {
    const formData = await request.formData();
    const email = formData.get('email')?.toString();
    const password = formData.get('password')?.toString();
    const confirmPassword = formData.get('confirmPassword')?.toString();
    const name = formData.get('name')?.toString();

    if (!name || !password || !confirmPassword || !email) {
      return fail(400, { error: 'Please fill in all fields', email, name, step: 'signup' });
    }

    if (password !== confirmPassword) {
      return fail(400, { error: 'Passwords do not match', email, name, step: 'signup' });
    }

    if (password.length < 8) {
      return fail(400, { error: 'Password must be at least 8 characters', email, name, step: 'signup' });
    }

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await locals.supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return fail(400, { error: authError.message, email, name, step: 'signup' });
    }

    if (!authData.user) {
      return fail(400, { error: 'Failed to create user', email, name, step: 'signup' });
    }

    // Create user profile in database
    const db = createDbClient(DATABASE_URL);

    try {
      await db.insert(users).values({
        id: authData.user.id,
        email,
        name,
        color: '#3B82F6',
      });

      // Mark invitation as used
      await db
        .update(invitations)
        .set({ usedAt: new Date() })
        .where(eq(invitations.email, email));

      // Session is automatically set via cookies
      throw redirect(303, '/');
    } catch (err: any) {
      // If profile creation fails, we should ideally clean up the auth user
      // For now, just return the error
      return fail(500, { error: err.message || 'Failed to create profile', email, name, step: 'signup' });
    }
  }
};
