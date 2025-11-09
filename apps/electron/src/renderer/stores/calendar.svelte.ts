import { createSupabaseClient, getEvents, createEvent, updateEvent, deleteEvent, type Event } from '@home-dashboard/database/browser';
import type { CalendarEvent } from '@home-dashboard/ui';

// Calendar state
export class CalendarStore {
  currentView = $state<'day' | 'week' | 'month'>('week');
  currentDate = $state(new Date());
  events = $state<CalendarEvent[]>([]);
  loading = $state(false);
  error = $state<string | null>(null);
  familyId = $state<string | null>(null);
  userId = $state<string | null>(null);

  private supabase = createSupabaseClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  // Initialize the store with user and family data
  async initialize(userId: string, familyId: string) {
    this.userId = userId;
    this.familyId = familyId;
    await this.loadEvents();
    this.subscribeToChanges();
  }

  // Load events for current month
  async loadEvents() {
    if (!this.familyId) return;

    this.loading = true;
    this.error = null;

    try {
      // Get start and end of current month
      const year = this.currentDate.getFullYear();
      const month = this.currentDate.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);

      const dbEvents = await getEvents(this.supabase, this.familyId, startDate, endDate);

      // Convert database events to CalendarEvent format
      this.events = dbEvents.map(this.convertToCalendarEvent);
    } catch (err: any) {
      this.error = err.message || 'Failed to load events';
      console.error('Error loading events:', err);
    } finally {
      this.loading = false;
    }
  }

  // Subscribe to real-time changes
  private subscribeToChanges() {
    if (!this.familyId) return;

    this.supabase
      .channel('calendar-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `family_id=eq.${this.familyId}`,
        },
        (payload) => {
          console.log('Event changed:', payload);
          this.loadEvents(); // Reload events on any change
        }
      )
      .subscribe();
  }

  // Create a new event
  async addEvent(eventData: Partial<CalendarEvent>) {
    if (!this.familyId || !this.userId) return;

    this.loading = true;
    this.error = null;

    try {
      const newEvent = await createEvent(this.supabase, {
        family_id: this.familyId,
        user_id: this.userId,
        title: eventData.title!,
        description: eventData.description,
        start_time: eventData.start!,
        end_time: eventData.end!,
        all_day: eventData.all_day || false,
        location: eventData.location,
        color: eventData.color,
        category: eventData.category,
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
      const updated = await updateEvent(this.supabase, eventData.id, {
        title: eventData.title,
        description: eventData.description,
        start_time: eventData.start,
        end_time: eventData.end,
        all_day: eventData.all_day,
        location: eventData.location,
        color: eventData.color,
        category: eventData.category,
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
      await deleteEvent(this.supabase, eventId);

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
  private convertToCalendarEvent(dbEvent: Event): CalendarEvent {
    return {
      id: dbEvent.id,
      title: dbEvent.title,
      description: dbEvent.description,
      start: dbEvent.start_time,
      end: dbEvent.end_time,
      all_day: dbEvent.all_day,
      location: dbEvent.location,
      color: dbEvent.color,
      category: dbEvent.category,
      userId: dbEvent.user_id,
    };
  }
}

// Create a singleton instance
export const calendarStore = new CalendarStore();
