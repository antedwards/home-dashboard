/**
 * API Client for Electron renderer
 * Makes authenticated requests to the web API using device tokens
 */

/**
 * Custom HTTP error with status code
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    public body: any
  ) {
    super(body?.message || body?.error || `HTTP ${status}`);
    this.name = 'HttpError';
  }
}

export interface Event {
  id: string;
  family_id: string;
  user_id: string;
  title: string;
  description?: string | null;
  start_time: Date | string;
  end_time: Date | string;
  all_day: boolean;
  location?: string | null;
  color?: string | null;
  category?: string | null;
  recurrence_rule?: string | null;
  external_id?: string | null;
  external_source?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Set the access token for authenticated requests
   */
  setAccessToken(token: string) {
    this.accessToken = token;
  }

  /**
   * Make an authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Request failed' }));

      // If 401 Unauthorized, clear stored tokens and reload to force re-pairing
      if (response.status === 401) {
        console.log('[API Client] 401 Unauthorized - clearing device tokens and reloading');
        await window.electron.clearDeviceTokens();
        this.accessToken = null;
        // Reload the page to trigger pairing flow
        window.location.reload();
      }

      throw new HttpError(response.status, body);
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
    color?: string;
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
    color?: string;
  }): Promise<Event> {
    return this.request<Event>(`/api/events/${id}`, {
      method: 'PUT',
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
export const apiClient = new ApiClient(
  import.meta.env.VITE_WEB_APP_URL || 'http://localhost:5173'
);
