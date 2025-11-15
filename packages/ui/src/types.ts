// UI Component Types

export interface EventMetadata {
  tags?: string[]; // Custom tags like "important", "family", etc.
  notes?: string; // User-added notes
  parent_only?: boolean; // Flag for parent-only visibility
  privacy_level?: 'public' | 'private' | 'family'; // Privacy level
  display_color_override?: string; // Custom color override
  custom_reminder_times?: number[]; // Custom reminder times in minutes
  [key: string]: any; // Allow arbitrary metadata fields
}

export interface ExternalAttendee {
  email: string;
  name: string | null;
  partstat: 'needs-action' | 'accepted' | 'declined' | 'tentative' | 'delegated';
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  description?: string;
  location?: string;
  categoryId?: string;
  userId?: string;
  attendeeIds?: string[]; // Household member IDs assigned to this event
  attendees?: User[]; // Full user objects for household member attendees
  externalAttendees?: ExternalAttendee[]; // All attendees from external calendar (may include non-household members)
  organizerEmail?: string; // Email of the person who created the event
  organizerName?: string; // Name of the organizer
  metadata?: EventMetadata; // Local customizations preserved during sync
  color?: string; // Category color
}

export interface Chore {
  id: string;
  title: string;
  description?: string;
  assignedTo: string;
  dueDate?: Date;
  completed: boolean;
  points?: number;
  color?: string;
}

export interface ListItem {
  id: string;
  content: string;
  checked: boolean;
  order: number;
}

export interface List {
  id: string;
  name: string;
  type: 'grocery' | 'todo' | 'custom';
  items: ListItem[];
}

export type CalendarView = 'day' | 'week' | 'month' | 'agenda';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}
