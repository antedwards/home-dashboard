import type { CalendarEvent, User, Category } from '@home-dashboard/ui';
import { apiClient } from '../api-client';

// Calendar state
export class CalendarStore {
  currentView = $state<'day' | 'week' | 'month'>('week');
  currentDate = $state(new Date());
  events = $state<CalendarEvent[]>([]);
  householdMembers = $state<User[]>([]);
  categories = $state<Category[]>([]);
  loading = $state(false);
  error = $state<string | null>(null);
  householdId = $state<string | null>(null);
  userId = $state<string | null>(null);

  // Initialize the store with user and household data
  async initialize(userId: string, householdId: string) {
    this.userId = userId;
    this.householdId = householdId;
    await Promise.all([
      this.loadEvents(),
      this.loadHouseholdMembers(),
      this.loadCategories()
    ]);
  }

  // Load household members
  async loadHouseholdMembers() {
    if (!this.householdId) return;

    try {
      const members = await apiClient.getHouseholdMembers(this.householdId);
      this.householdMembers = members;
    } catch (err: any) {
      console.error('Error loading household members:', err);
    }
  }

  // Load categories
  async loadCategories() {
    if (!this.householdId) return;

    try {
      const cats = await apiClient.getCategories(this.householdId);
      this.categories = cats;
    } catch (err: any) {
      console.error('Error loading categories:', err);
    }
  }

  // Create a new category
  async createCategory(name: string, color: string): Promise<Category> {
    if (!this.householdId) throw new Error('No household ID');

    try {
      const newCategory = await apiClient.createCategory({
        household_id: this.householdId,
        name,
        color
      });
      this.categories.push(newCategory);
      return newCategory;
    } catch (err: any) {
      console.error('Error creating category:', err);
      throw err;
    }
  }

  // Load events for current month
  async loadEvents() {
    if (!this.householdId) return;

    this.loading = true;
    this.error = null;

    try {
      // Get start and end of current month
      const year = this.currentDate.getFullYear();
      const month = this.currentDate.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);

      const dbEvents = await apiClient.getEvents(startDate, endDate);

      // Convert database events to CalendarEvent format
      this.events = dbEvents.map(this.convertToCalendarEvent);
    } catch (err: any) {
      this.error = err.message || 'Failed to load events';
      console.error('Error loading events:', err);
    } finally {
      this.loading = false;
    }
  }

  // Create a new event
  async addEvent(eventData: Partial<CalendarEvent>) {
    if (!this.householdId || !this.userId) return;

    this.loading = true;
    this.error = null;

    try {
      const newEvent = await apiClient.createEvent({
        title: eventData.title!,
        description: eventData.description,
        start_time: eventData.start!,
        end_time: eventData.end!,
        all_day: eventData.all_day || false,
        location: eventData.location,
        category_id: eventData.categoryId,
        attendee_ids: eventData.attendeeIds,
      });

      // Add to local state optimistically
      this.events.push(this.convertToCalendarEvent(newEvent));
    } catch (err: any) {
      this.error = err.message || 'Failed to create event';
      console.error('Error creating event:', err);
      throw err;
    } finally {
      this.loading = false;
    }
  }

  // Update an existing event
  async updateEvent(eventData: Partial<CalendarEvent>) {
    if (!eventData.id) return;

    this.loading = true;
    this.error = null;

    try {
      const updated = await apiClient.updateEvent(eventData.id, {
        title: eventData.title,
        description: eventData.description,
        start_time: eventData.start,
        end_time: eventData.end,
        all_day: eventData.all_day,
        location: eventData.location,
        category_id: eventData.categoryId,
        attendee_ids: eventData.attendeeIds,
      });

      // Update local state
      const index = this.events.findIndex((e) => e.id === eventData.id);
      if (index !== -1) {
        this.events[index] = this.convertToCalendarEvent(updated);
      }
    } catch (err: any) {
      this.error = err.message || 'Failed to update event';
      console.error('Error updating event:', err);
      throw err;
    } finally {
      this.loading = false;
    }
  }

  // Delete an event
  async removeEvent(eventId: string) {
    this.loading = true;
    this.error = null;

    try {
      await apiClient.deleteEvent(eventId);

      // Remove from local state
      this.events = this.events.filter((e) => e.id !== eventId);
    } catch (err: any) {
      this.error = err.message || 'Failed to delete event';
      console.error('Error deleting event:', err);
      throw err;
    } finally {
      this.loading = false;
    }
  }

  // Navigate to previous period
  goToPrevious() {
    const newDate = new Date(this.currentDate);

    switch (this.currentView) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
    }

    this.currentDate = newDate;
    this.loadEvents();
  }

  // Navigate to next period
  goToNext() {
    const newDate = new Date(this.currentDate);

    switch (this.currentView) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
    }

    this.currentDate = newDate;
    this.loadEvents();
  }

  // Go to today
  goToToday() {
    this.currentDate = new Date();
    this.loadEvents();
  }

  // Change view
  setView(view: 'day' | 'week' | 'month') {
    this.currentView = view;
  }

  // Helper to convert database event to CalendarEvent
  private convertToCalendarEvent = (dbEvent: any): CalendarEvent => {
    const categoryId = dbEvent.category_id || dbEvent.categoryId;
    const category = this.categories.find(c => c.id === categoryId);

    // Convert household member attendees to User objects
    const householdAttendees = dbEvent.attendees?.map((attendee: any) => ({
      id: attendee.id || attendee.user_id,
      name: attendee.name,
      email: attendee.email,
      avatar: attendee.avatar_url || attendee.avatar,
      color: attendee.color || '#3b82f6',
    })) || [];

    // Get external attendees (from CalDAV sync)
    const externalAttendees = dbEvent.external_attendees || dbEvent.externalAttendees || [];

    // Merge attendees: Create User objects for all external attendees
    // If an external attendee matches a household member, use the household member data (with avatar)
    // Otherwise, create a basic User object from the external attendee
    const allAttendees = [...householdAttendees];
    const householdEmails = new Set(householdAttendees.map((a: any) => a.email.toLowerCase()));

    for (const extAttendee of externalAttendees) {
      // Only add external attendees that aren't already in household attendees
      if (!householdEmails.has(extAttendee.email.toLowerCase())) {
        allAttendees.push({
          id: extAttendee.email, // Use email as ID for non-household members
          name: extAttendee.name || extAttendee.email,
          email: extAttendee.email,
          avatar: undefined, // No avatar for external attendees
          color: '#9ca3af', // Gray color for external attendees
        });
      }
    }

    return {
      id: dbEvent.id,
      title: dbEvent.title,
      description: dbEvent.description,
      start: new Date(dbEvent.start_time || dbEvent.startTime),
      end: new Date(dbEvent.end_time || dbEvent.endTime),
      allDay: dbEvent.all_day ?? dbEvent.allDay,
      location: dbEvent.location,
      categoryId,
      userId: dbEvent.user_id || dbEvent.userId,
      attendeeIds: dbEvent.attendee_ids || dbEvent.attendeeIds,
      attendees: allAttendees, // Merged household + external attendees
      externalAttendees, // Keep original external attendees data
      organizerEmail: dbEvent.organizer_email || dbEvent.organizerEmail,
      organizerName: dbEvent.organizer_name || dbEvent.organizerName,
      metadata: dbEvent.metadata || {},
      color: category?.color || '#3b82f6', // Default blue if no category
    };
  }
}

// Create a singleton instance
export const calendarStore = new CalendarStore();
