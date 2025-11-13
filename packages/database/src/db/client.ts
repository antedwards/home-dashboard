/**
 * Database client using Drizzle ORM
 * Uses direct Postgres connection (not Supabase client)
 *
 * For Cloudflare Workers/Pages with Hyperdrive:
 * - Creates a NEW client for each request (no singleton)
 * - Hyperdrive handles connection pooling at the edge
 * - Connection must be created and used within a single request
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export function createDbClient(connectionString: string) {
  // Create postgres.js connection
  // Note: In Cloudflare Workers with Hyperdrive, this connects to the edge pool
  const connection = postgres(connectionString, {
    max: 1, // Use 1 connection per request (Hyperdrive pools at edge)
    idle_timeout: 20,
    connect_timeout: 10,
  });

  // Create Drizzle client
  return drizzle(connection);
}
