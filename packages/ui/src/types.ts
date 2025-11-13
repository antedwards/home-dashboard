// UI Component Types

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
  attendeeIds?: string[]; // Family member IDs assigned to this event
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
