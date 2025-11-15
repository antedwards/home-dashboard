/**
 * Drizzle schema matching Supabase tables
 */

import { pgTable, uuid, text, timestamp, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const deviceTypeEnum = pgEnum('device_type', ['electron', 'cli', 'mobile']);
export const visibilityEnum = pgEnum('visibility', ['household', 'private', 'shared']);
export const permissionLevelEnum = pgEnum('permission_level', ['view', 'manage', 'full']);

// Households table (renamed from families)
export const households = pgTable('households', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
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

// Household members table (renamed from family_members)
export const householdMembers = pgTable('household_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(), // References auth.users
  role: text('role').notNull().default('member'),
  color: text('color'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Care relationships - for managing across households (e.g., caring for elderly parent)
export const careRelationships = pgTable('care_relationships', {
  id: uuid('id').defaultRandom().primaryKey(),
  caregiverUserId: uuid('caregiver_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  careRecipientUserId: uuid('care_recipient_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  permissionLevel: text('permission_level').notNull().default('view'), // view, manage, full
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Categories table (with enhanced visibility model)
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  ownerId: uuid('owner_id').notNull(), // Who created/owns this category
  name: text('name').notNull(),
  color: text('color').notNull().default('#3b82f6'),
  visibility: text('visibility').notNull().default('household'), // household, private, shared
  caldavConnectionId: uuid('caldav_connection_id'), // Will be set later due to circular reference
  source: text('source').notNull().default('manual'), // manual or caldav
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Calendar shares - for sharing calendars across households or with specific users
export const calendarShares = pgTable('calendar_shares', {
  id: uuid('id').defaultRandom().primaryKey(),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  sharedWithUserId: uuid('shared_with_user_id'), // Individual user
  sharedWithHouseholdId: uuid('shared_with_household_id').references(() => households.id, { onDelete: 'cascade' }), // Entire household
  permission: text('permission').notNull().default('view'), // view, edit
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Events table
export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
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
  // iCalendar fields for CalDAV sync
  status: text('status').default('confirmed'),
  sequence: text('sequence').default('0'),
  icalUid: text('ical_uid'),
  icalTimestamp: timestamp('ical_timestamp'),
  organizerEmail: text('organizer_email'),
  organizerName: text('organizer_name'),
  // All attendees from external calendars (email, name, partstat)
  externalAttendees: jsonb('external_attendees').default('[]'),
  // Local metadata that is preserved during CalDAV sync
  metadata: jsonb('metadata').default('{}'),
  // CalDAV push status tracking
  lastPushAt: timestamp('last_push_at'),
  lastPushStatus: text('last_push_status'),
  lastPushError: text('last_push_error'),
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
  householdId: uuid('household_id').references(() => households.id), // Direct household reference for performance
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
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  invitedBy: uuid('invited_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  status: text('status').notNull().default('pending'),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// CalDAV connections table
export const caldavConnections = pgTable('caldav_connections', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(), // References auth.users
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  passwordEncrypted: text('password_encrypted').notNull(),
  serverUrl: text('server_url').notNull().default('https://caldav.icloud.com'),
  displayName: text('display_name'),
  enabled: boolean('enabled').default(true),
  lastSyncAt: timestamp('last_sync_at'),
  lastSyncStatus: text('last_sync_status'),
  lastSyncError: text('last_sync_error'),
  syncToken: text('sync_token'),
  // Sync configuration
  selectedCalendars: jsonb('selected_calendars').default('[]'),
  syncPastDays: text('sync_past_days').default('30'),
  syncFutureDays: text('sync_future_days').default('365'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// CalDAV event mappings table
export const caldavEventMappings = pgTable('caldav_event_mappings', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  caldavConnectionId: uuid('caldav_connection_id').notNull().references(() => caldavConnections.id, { onDelete: 'cascade' }),
  externalUid: text('external_uid').notNull(),
  externalCalendar: text('external_calendar').notNull(),
  externalUrl: text('external_url'),
  etag: text('etag'),
  lastSyncedAt: timestamp('last_synced_at').defaultNow(),
  syncDirection: text('sync_direction'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Types
export type Household = typeof households.$inferSelect;
export type NewHousehold = typeof households.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type HouseholdMember = typeof householdMembers.$inferSelect;
export type NewHouseholdMember = typeof householdMembers.$inferInsert;

export type CareRelationship = typeof careRelationships.$inferSelect;
export type NewCareRelationship = typeof careRelationships.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type CalendarShare = typeof calendarShares.$inferSelect;
export type NewCalendarShare = typeof calendarShares.$inferInsert;

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

export type CalDAVConnection = typeof caldavConnections.$inferSelect;
export type NewCalDAVConnection = typeof caldavConnections.$inferInsert;

export type CalDAVEventMapping = typeof caldavEventMappings.$inferSelect;
export type NewCalDAVEventMapping = typeof caldavEventMappings.$inferInsert;
