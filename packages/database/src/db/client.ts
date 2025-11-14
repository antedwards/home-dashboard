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
  // Determine if using pooler vs direct connection
  const isPooler = connectionString.includes('pooler.supabase.com');

  // Create postgres.js connection
  // Note: In Cloudflare Workers with Hyperdrive, this connects to the edge pool
  const connection = postgres(connectionString, {
    max: 1, // Use 1 connection per request (Hyperdrive pools at edge)
    idle_timeout: 20,
    connect_timeout: 10,
    // SSL configuration for Supabase and other cloud providers
    ssl: connectionString.includes('supabase.co') ? 'require' : false,
    // Transaction pooler (port 6543) supports prepared statements
    // Session pooler (port 6432) and direct connections (port 5432) do not
    prepare: isPooler,
  });

  // Create Drizzle client
  return drizzle(connection);
}
