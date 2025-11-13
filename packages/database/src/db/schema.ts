/**
 * Drizzle schema matching Supabase tables
 */

import { pgTable, uuid, text, timestamp, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const deviceTypeEnum = pgEnum('device_type', ['electron', 'cli', 'mobile']);

// Families table
export const families = pgTable('families', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Users table (extends Supabase auth.users)
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // References auth.users
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  color: text('color').notNull().default('#3B82F6'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Family members table
export const familyMembers = pgTable('family_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(), // References auth.users
  role: text('role').notNull().default('member'),
  color: text('color'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Categories table
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull().default('#3b82f6'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Events table
export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(), // References auth.users
  title: text('title').notNull(),
  description: text('description'),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  allDay: boolean('all_day').default(false).notNull(),
  location: text('location'),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  recurrenceRule: text('recurrence_rule'),
  externalId: text('external_id'),
  externalSource: text('external_source'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Event attendees junction table
export const eventAttendees = pgTable('event_attendees', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(), // References auth.users
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Device codes table (for device flow)
export const deviceCodes = pgTable('device_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  deviceCode: text('device_code').notNull().unique(),
  userCode: text('user_code').notNull().unique(),
  deviceId: text('device_id').notNull(),
  deviceName: text('device_name'),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  activated: boolean('activated').default(false).notNull(),
  userId: uuid('user_id'), // References auth.users
  expiresAt: timestamp('expires_at').notNull(),
  activatedAt: timestamp('activated_at'),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Device tokens table
export const deviceTokens = pgTable('device_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(), // References auth.users
  deviceId: text('device_id').notNull(),
  deviceName: text('device_name'),
  deviceType: text('device_type'),
  familyId: uuid('family_id').references(() => families.id), // Direct family reference for performance
  tokenHash: text('token_hash').notNull().unique(),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastRefreshedAt: timestamp('last_refreshed_at'),
  refreshTokenHash: text('refresh_token_hash'),
  refreshExpiresAt: timestamp('refresh_expires_at'),
});

// Invitations table
export const invitations = pgTable('invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull(),
  familyId: uuid('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
  invitedBy: uuid('invited_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  status: text('status').notNull().default('pending'),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Types
export type Family = typeof families.$inferSelect;
export type NewFamily = typeof families.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type FamilyMember = typeof familyMembers.$inferSelect;
export type NewFamilyMember = typeof familyMembers.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

export type EventAttendee = typeof eventAttendees.$inferSelect;
export type NewEventAttendee = typeof eventAttendees.$inferInsert;

export type DeviceCode = typeof deviceCodes.$inferSelect;
export type NewDeviceCode = typeof deviceCodes.$inferInsert;

export type DeviceToken = typeof deviceTokens.$inferSelect;
export type NewDeviceToken = typeof deviceTokens.$inferInsert;

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
