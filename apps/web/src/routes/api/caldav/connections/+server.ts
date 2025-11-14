import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { encryptPassword } from '$lib/server/crypto';

const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Create a new CalDAV connection with encrypted password
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { email, password, serverUrl, displayName } = await request.json();

    if (!email || !password || !serverUrl) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user from session
    const sessionCookie = cookies.get('sb-access-token');
    if (!sessionCookie) {
      return json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(sessionCookie);
    if (userError || !user) {
      return json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get user's family
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('family_id')
      .eq('id', user.id)
      .single();

    if (!profile?.family_id) {
      return json({ error: 'No family found' }, { status: 400 });
    }

    // Encrypt password
    const encryptedPassword = await encryptPassword(password);

    // Save connection
    const { data: connection, error: insertError } = await supabase
      .from('caldav_connections')
      .insert({
        user_id: user.id,
        family_id: profile.family_id,
        email,
        password_encrypted: encryptedPassword,
        server_url: serverUrl,
        display_name: displayName || email,
        enabled: true,
        last_sync_status: 'pending',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return json({ success: true, connection });
  } catch (error: any) {
    console.error('[CalDAV Connections] Error:', error);
    return json(
      {
        error: error.message || 'Failed to create connection',
      },
      { status: 500 }
    );
  }
};
