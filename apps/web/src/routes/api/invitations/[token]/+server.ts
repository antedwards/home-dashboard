/**
 * Single Invitation API endpoint
 * Handles verifying and accepting invitations
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDbClient } from '@home-dashboard/database/db/client';
import { invitations, users, familyMembers } from '@home-dashboard/database/db/schema';
import { eq } from 'drizzle-orm';
import { DATABASE_URL } from '$env/static/private';

export const GET: RequestHandler = async (event) => {
  try {
    const token = event.params.token;

    if (!token) {
      return json({ error: 'Token is required' }, { status: 400 });
    }

    // Initialize database
    const db = createDbClient(DATABASE_URL);

    // Find invitation by token
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token))
      .limit(1);

    if (!invitation) {
      return json({ error: 'Invalid invitation token' }, { status: 404 });
    }

    // Check if invitation is expired
    if (new Date() > new Date(invitation.expiresAt)) {
      return json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Check if invitation is already accepted
    if (invitation.status !== 'pending') {
      return json({ error: `Invitation has already been ${invitation.status}` }, { status: 400 });
    }

    // Return invitation details (without sensitive info)
    return json({
      email: invitation.email,
      familyId: invitation.familyId,
      expiresAt: invitation.expiresAt,
    });
  } catch (error: any) {
    console.error('Error verifying invitation:', error);
    return json({ error: error.message || 'Failed to verify invitation' }, { status: 500 });
  }
};

export const POST: RequestHandler = async (event) => {
  try {
    const token = event.params.token;
    const body = await event.request.json();
    const { password, name } = body;

    if (!token) {
      return json({ error: 'Token is required' }, { status: 400 });
    }

    if (!password || !name) {
      return json({ error: 'Password and name are required' }, { status: 400 });
    }

    // Initialize database
    const db = createDbClient(DATABASE_URL);

    // Find invitation by token
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token))
      .limit(1);

    if (!invitation) {
      return json({ error: 'Invalid invitation token' }, { status: 404 });
    }

    // Check if invitation is expired
    if (new Date() > new Date(invitation.expiresAt)) {
      return json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Check if invitation is already accepted
    if (invitation.status !== 'pending') {
      return json({ error: `Invitation has already been ${invitation.status}` }, { status: 400 });
    }

    // Create user account using Supabase Auth
    const supabase = event.locals.supabase;

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: invitation.email,
      password,
      options: {
        emailRedirectTo: `${event.url.origin}/auth/login`,
        data: {
          name,
        },
      },
    });

    if (signUpError || !authData.user) {
      console.error('Error creating user account:', signUpError);
      return json({ error: signUpError?.message || 'Failed to create account' }, { status: 400 });
    }

    // Generate a random color for the user
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    // Create user profile
    await db.insert(users).values({
      id: authData.user.id,
      email: invitation.email,
      name,
      color: randomColor,
    });

    // Add user to family
    await db.insert(familyMembers).values({
      familyId: invitation.familyId,
      userId: authData.user.id,
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

    return json({
      success: true,
      message: 'Account created successfully',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    return json({ error: error.message || 'Failed to accept invitation' }, { status: 500 });
  }
};
