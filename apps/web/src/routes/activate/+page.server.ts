/**
 * Device activation page server load
 * Requires authentication
 */

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const session = await locals.getSession?.();

  // Require authentication
  if (!session?.user) {
    // Redirect to login with full return URL including query params
    const returnUrl = encodeURIComponent(url.pathname + url.search);
    throw redirect(303, `/auth/login?returnTo=${returnUrl}`);
  }

  // Get code from query param if present
  const code = url.searchParams.get('code');

  return {
    code: code || null,
    user: {
      id: session.user.id,
      email: session.user.email,
    },
  };
};
