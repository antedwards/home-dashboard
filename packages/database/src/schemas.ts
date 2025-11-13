import { z } from 'zod';

// Validation schemas using Zod

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  avatar_url: z.string().url().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CategorySchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const EventSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  all_day: z.boolean(),
  location: z.string().optional(),
  category_id: z.string().uuid().optional(),
  recurrence_rule: z.string().optional(),
  external_id: z.string().optional(),
  external_source: z.enum(['google', 'outlook', 'apple', 'ical']).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const EventAttendeeSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  user_id: z.string().uuid(),
  created_at: z.string().datetime(),
});

export const ChoreSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  assigned_to: z.string().uuid(),
  due_date: z.string().datetime().optional(),
  completed: z.boolean(),
  completed_at: z.string().datetime().optional(),
  points: z.number().int().min(0),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  recurrence_rule: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const ListSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(['grocery', 'todo', 'custom']),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const ListItemSchema = z.object({
  id: z.string().uuid(),
  list_id: z.string().uuid(),
  content: z.string().min(1),
  checked: z.boolean(),
  order: z.number().int(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
