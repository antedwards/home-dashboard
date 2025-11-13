/**
 * Root layout server load
 * Provides user session data to all pages
 */

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  const session = await locals.getSession();

  return {
    session: session ? {
      userId: session.user.id,
      email: session.user.email,
    } : null,
  };
};
