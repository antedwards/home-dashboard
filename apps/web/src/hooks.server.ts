/**
 * SvelteKit server hooks
 * Handles Supabase Auth and injects session into locals
 * Matches collector-server pattern
 */

import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const handle: Handle = async ({ event, resolve }) => {
  // Handle CORS preflight requests for Electron app
  if (event.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:5174',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      }
    });
  }
  // Create Supabase client for server-side auth
  event.locals.supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => {
          return event.cookies.getAll();
        },
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              event.cookies.set(name, value, { ...options, path: '/' });
            } catch (error) {
              // Ignore errors when response has already been generated
              // This can happen when Supabase auth tries to update cookies
              // after a 404 or other error response has been sent
            }
          });
        }
      }
    }
  );

  /**
   * Get authenticated user session
   * Uses getUser() to validate the user with Supabase Auth server
   * This prevents session forgery attacks (getSession() just reads cookies)
   */
  event.locals.getSession = async () => {
    const {
      data: { user },
      error
    } = await event.locals.supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Return session object
    return {
      user,
      access_token: '',
      refresh_token: '',
      expires_in: 0,
      expires_at: 0,
      token_type: 'bearer'
    };
  };

  const response = await resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range';
    }
  });

  // Add CORS headers to all API responses for Electron app
  if (event.url.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:5174');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
};
