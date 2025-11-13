/**
 * Device pairing page server load
 * Requires authentication
 */

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const session = await locals.getSession();

  if (!session) {
    // Redirect to login with return URL
    const returnUrl = encodeURIComponent(url.pathname + url.search);
    throw redirect(303, `/auth/login?returnTo=${returnUrl}`);
  }

  return {};
};
