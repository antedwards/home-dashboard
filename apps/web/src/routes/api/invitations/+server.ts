/**
 * Invitations API endpoint
 * Handles creating and listing family invitations
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDbClient } from '@home-dashboard/database/db/client';
import { invitations } from '@home-dashboard/database/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth';
import { createClient } from '@supabase/supabase-js';
import { DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_APP_URL, PUBLIC_SUPABASE_URL } from '$env/static/public';

// Generate a secure random token
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export const GET: RequestHandler = async (event) => {
  try {
    // Authenticate user
    const { userId, familyId } = await requireAuth(event);

    // Initialize database
    const db = createDbClient(DATABASE_URL);

    // Get all pending invitations for the user's family
    const familyInvitations = await db
      .select()
      .from(invitations)
      .where(eq(invitations.familyId, familyId));

    return json(familyInvitations);
  } catch (error: any) {
    console.error('Error fetching invitations:', error);
    return json({ error: error.message || 'Failed to fetch invitations' }, { status: error.status || 500 });
  }
};

export const POST: RequestHandler = async (event) => {
  try {
    // Authenticate user
    const { userId, familyId } = await requireAuth(event);

    const body = await event.request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Initialize database
    const db = createDbClient(DATABASE_URL);

    // Check if user already exists with this email
    const { users } = await import('@home-dashboard/database/db/schema');
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser) {
      return json({ error: 'A user with this email already exists' }, { status: 400 });
    }

    // Check if there's already a pending invitation for this email
    const [existingInvitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.email, email.toLowerCase()))
      .limit(1);

    if (existingInvitation && existingInvitation.status === 'pending') {
      return json({ error: 'An invitation has already been sent to this email' }, { status: 400 });
    }

    // Generate unique token
    const token = generateToken();

    // Create invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const [invitation] = await db
      .insert(invitations)
      .values({
        email: email.toLowerCase(),
        familyId,
        invitedBy: userId,
        token,
        expiresAt,
      })
      .returning();

    // Send invitation using Supabase's built-in invite system
    try {
      // Create admin client
      const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      // Invite user via Supabase - this creates the auth user and sends email
      await supabaseAdmin.auth.admin.inviteUserByEmail(email.toLowerCase(), {
        redirectTo: `${PUBLIC_APP_URL}/auth/complete-profile`,
        data: {
          invitation_token: token,
          family_id: familyId,
        }
      });

      console.log(`Invitation sent to ${email} via Supabase`);
    } catch (emailError) {
      console.error('Failed to send invitation:', emailError);
      return json({ error: 'Failed to send invitation email' }, { status: 500 });
    }

    return json({
      ...invitation,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating invitation:', error);
    return json({ error: error.message || 'Failed to create invitation' }, { status: 500 });
  }
};
