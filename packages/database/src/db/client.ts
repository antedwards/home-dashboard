/**
 * Database client using Drizzle ORM
 * Uses direct Postgres connection (not Supabase client)
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Singleton connection
let client: ReturnType<typeof drizzle> | null = null;

export function createDbClient(connectionString: string) {
  if (client) return client;

  // Create postgres.js connection
  const connection = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  // Create Drizzle client
  client = drizzle(connection);

  return client;
}

export function getDbClient() {
  if (!client) {
    throw new Error('Database client not initialized. Call createDbClient() first.');
  }
  return client;
}
