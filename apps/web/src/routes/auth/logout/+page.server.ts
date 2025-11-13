/**
 * Logout page server load
 * Immediately signs out and redirects to login
 */

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // Sign out from Supabase
  await locals.supabase.auth.signOut();

  // Redirect to login
  throw redirect(303, '/auth/login');
};
