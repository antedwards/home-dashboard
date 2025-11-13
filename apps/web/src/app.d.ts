// See https://svelte.dev/docs/kit/types#app.d.ts
import type { SupabaseClient, Session } from '@supabase/supabase-js';

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      supabase: SupabaseClient;
      getSession(): Promise<Session | null>;
      db: ReturnType<typeof import('@home-dashboard/database/db/client').createDbClient>;
    }
    // interface PageData {}
    // interface PageState {}
    interface Platform {
      env?: {
        HYPERDRIVE?: Hyperdrive;
      };
      context?: ExecutionContext;
      caches?: CacheStorage;
    }
  }
}

interface Hyperdrive {
  connectionString: string;
}

export {};
