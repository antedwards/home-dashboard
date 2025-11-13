/**
 * Login page server actions
 * Handles authentication server-side using service role key
 */

import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const session = await locals.getSession?.();

  // If already logged in, redirect to home or returnTo
  if (session?.user) {
    const returnTo = url.searchParams.get('returnTo');
    if (returnTo) {
      throw redirect(303, decodeURIComponent(returnTo));
    }
    throw redirect(303, '/');
  }

  return {};
};

export const actions: Actions = {
  default: async ({ request, locals, url, cookies }) => {
    const formData = await request.formData();
    const email = formData.get('email')?.toString();
    const password = formData.get('password')?.toString();

    if (!email || !password) {
      return fail(400, { error: 'Please fill in all fields', email });
    }

    const { data, error } = await locals.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return fail(400, { error: error.message, email });
    }

    if (!data.user) {
      return fail(400, { error: 'Failed to sign in', email });
    }

    // Session is automatically set via cookies by supabase client in hooks.server.ts

    // Check for returnTo parameter
    const returnTo = url.searchParams.get('returnTo');
    if (returnTo) {
      throw redirect(303, decodeURIComponent(returnTo));
    }

    throw redirect(303, '/');
  }
};
