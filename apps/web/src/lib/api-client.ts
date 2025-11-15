/**
 * API Client for web app
 * Makes authenticated requests to API endpoints
 * Authentication handled automatically via session cookies
 */

export interface Event {
  id: string;
  household_id: string;
  user_id: string;
  title: string;
  description?: string | null;
  start_time: Date | string;
  end_time: Date | string;
  all_day: boolean;
  location?: string | null;
  category_id?: string | null;
  recurrence_rule?: string | null;
  external_id?: string | null;
  external_source?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  attendee_ids?: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  color: string;
}

export interface Category {
  id: string;
  household_id: string;
  name: string;
  color: string;
  created_at: Date | string;
  updated_at: Date | string;
}

class ApiClient {
  /**
   * Make an API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for session auth
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get events within a date range
   */
  async getEvents(startDate?: Date, endDate?: Date): Promise<Event[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('start', startDate.toISOString());
    if (endDate) params.append('end', endDate.toISOString());

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<Event[]>(`/api/events${query}`);
  }

  /**
   * Get a single event by ID
   */
  async getEvent(id: string): Promise<Event> {
    return this.request<Event>(`/api/events/${id}`);
  }

  /**
   * Create a new event
   */
  async createEvent(data: {
    title: string;
    description?: string;
    start_time: Date;
    end_time: Date;
    all_day?: boolean;
    location?: string;
    category_id?: string;
    attendee_ids?: string[];
  }): Promise<Event> {
    return this.request<Event>('/api/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update an existing event
   */
  async updateEvent(id: string, data: {
    title?: string;
    description?: string;
    start_time?: Date;
    end_time?: Date;
    all_day?: boolean;
    location?: string;
    category_id?: string;
    attendee_ids?: string[];
  }): Promise<Event> {
    return this.request<Event>(`/api/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get household members (for authenticated user's household)
   */
  async getHouseholdMembers(householdId: string): Promise<User[]> {
    // Note: householdId parameter kept for backward compatibility but not used in URL
    // The endpoint uses the authenticated user's household from their session
    return this.request<User[]>('/api/family/members');
  }

  /**
   * Get categories for a household (for authenticated user's household)
   */
  async getCategories(householdId: string): Promise<Category[]> {
    // Note: householdId parameter kept for backward compatibility but not used in URL
    // The endpoint uses the authenticated user's household from their session
    return this.request<Category[]>('/api/family/categories');
  }

  /**
   * Create a new category
   */
  async createCategory(data: {
    household_id: string;
    name: string;
    color: string;
  }): Promise<Category> {
    return this.request<Category>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete an event
   */
  async deleteEvent(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/events/${id}`, {
      method: 'DELETE',
    });
  }
}

// Singleton instance
export const apiClient = new ApiClient();
