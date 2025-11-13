import type { CalendarEvent } from '@home-dashboard/ui';
import { apiClient } from '../lib/api-client';

// Calendar state
export class CalendarStore {
  currentView = $state<'day' | 'week' | 'month'>('week');
  currentDate = $state(new Date());
  events = $state<CalendarEvent[]>([]);
  loading = $state(false);
  error = $state<string | null>(null);
  familyId = $state<string | null>(null);
  userId = $state<string | null>(null);

  // Initialize the store with user and family data
  async initialize(userId: string, familyId: string, accessToken: string) {
    this.userId = userId;
    this.familyId = familyId;
    apiClient.setAccessToken(accessToken);
    await this.loadEvents();
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
    if (!this.familyId || !this.userId) return;

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
        color: eventData.color,
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
        color: eventData.color,
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
  private convertToCalendarEvent(dbEvent: any): CalendarEvent {
    return {
      id: dbEvent.id,
      title: dbEvent.title,
      description: dbEvent.description,
      start: new Date(dbEvent.start_time || dbEvent.startTime),
      end: new Date(dbEvent.end_time || dbEvent.endTime),
      all_day: dbEvent.all_day ?? dbEvent.allDay,
      location: dbEvent.location,
      color: dbEvent.color,
      category: dbEvent.category,
      userId: dbEvent.user_id || dbEvent.userId,
    };
  }
}

// Create a singleton instance
export const calendarStore = new CalendarStore();
