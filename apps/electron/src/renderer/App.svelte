<script lang="ts">
  import { onMount } from 'svelte';
  import { createSupabaseClient, verifyDeviceToken } from '@home-dashboard/database';
  import {
    DayView,
    WeekView,
    MonthView,
    EventModal,
    formatDate,
    type CalendarEvent,
  } from '@home-dashboard/ui';
  import DevicePairing from './DevicePairing.svelte';
  import { calendarStore } from './stores/calendar.svelte';

  let version = $state('');
  let isAuthenticated = $state(false);
  let loading = $state(true);
  let userId = $state<string | null>(null);
  let showEventModal = $state(false);
  let selectedEvent = $state<CalendarEvent | null>(null);
  let initialEventDate = $state<Date | undefined>(undefined);

  const supabase = createSupabaseClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  onMount(async () => {
    // Get app version
    if (window.electron) {
      version = await window.electron.getVersion();

      // Check authentication
      await checkAuth();
    }
  });

  async function checkAuth() {
    loading = true;

    try {
      // Get stored token
      const token = await window.electron.getDeviceToken();

      if (!token) {
        isAuthenticated = false;
        loading = false;
        return;
      }

      // Verify token with backend
      const deviceId = await window.electron.getDeviceId();
      const result = await verifyDeviceToken(supabase, token, deviceId);

      if (result.valid && result.userId) {
        isAuthenticated = true;
        userId = result.userId;

        // Get user's family
        const { data: familyMember } = await supabase
          .from('family_members')
          .select('family_id')
          .eq('user_id', result.userId)
          .single();

        if (familyMember) {
          // Initialize calendar store
          await calendarStore.initialize(result.userId, familyMember.family_id);
        }

        // TODO: If token needs refresh, show a notification
        if (result.needsRefresh) {
          console.log('Token will expire soon, please extend it in the web app');
        }
      } else {
        // Token invalid or expired
        isAuthenticated = false;
        await window.electron.clearDeviceToken();
      }
    } catch (error) {
      console.error('Authentication error:', error);
      isAuthenticated = false;
    } finally {
      loading = false;
    }
  }

  function handleDateClick(date: Date) {
    initialEventDate = date;
    selectedEvent = null;
    showEventModal = true;
  }

  function handleEventClick(event: CalendarEvent) {
    selectedEvent = event;
    initialEventDate = undefined;
    showEventModal = true;
  }

  function handleTimeSlotClick(date: Date, hour: number) {
    const eventDate = new Date(date);
    eventDate.setHours(hour, 0, 0, 0);
    initialEventDate = eventDate;
    selectedEvent = null;
    showEventModal = true;
  }

  async function handleSaveEvent(eventData: Partial<CalendarEvent>) {
    try {
      if (selectedEvent?.id) {
        // Update existing event
        await calendarStore.updateEvent({ ...eventData, id: selectedEvent.id });
      } else {
        // Create new event
        await calendarStore.addEvent(eventData);
      }
      showEventModal = false;
      selectedEvent = null;
    } catch (error) {
      console.error('Failed to save event:', error);
      alert('Failed to save event. Please try again.');
    }
  }

  async function handleDeleteEvent(eventId: string) {
    try {
      await calendarStore.removeEvent(eventId);
      showEventModal = false;
      selectedEvent = null;
    } catch (error) {
      console.error('Failed to delete event:', error);
      alert('Failed to delete event. Please try again.');
    }
  }

  function getViewTitle(): string {
    const date = calendarStore.currentDate;

    switch (calendarStore.currentView) {
      case 'day':
        return formatDate(date, 'long');
      case 'week': {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${formatDate(weekStart, 'medium')} - ${formatDate(weekEnd, 'medium')}`;
      }
      case 'month':
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }
</script>

{#if loading}
  <div class="loading-screen">
    <div class="spinner"></div>
    <p>Loading...</p>
  </div>
{:else if !isAuthenticated}
  <DevicePairing />
{:else}
  <div class="app">
    <header class="header">
      <div class="header-left">
        <h1>Home Dashboard</h1>
        <div class="view-title">{getViewTitle()}</div>
      </div>

      <div class="header-center">
        <button class="nav-btn" onclick={() => calendarStore.goToPrevious()}>
          ‹
        </button>
        <button class="today-btn" onclick={() => calendarStore.goToToday()}>
          Today
        </button>
        <button class="nav-btn" onclick={() => calendarStore.goToNext()}>
          ›
        </button>
      </div>

      <div class="header-right">
        <div class="view-switcher">
          <button
            class:active={calendarStore.currentView === 'day'}
            onclick={() => calendarStore.setView('day')}
          >
            Day
          </button>
          <button
            class:active={calendarStore.currentView === 'week'}
            onclick={() => calendarStore.setView('week')}
          >
            Week
          </button>
          <button
            class:active={calendarStore.currentView === 'month'}
            onclick={() => calendarStore.setView('month')}
          >
            Month
          </button>
        </div>

        <button class="btn-primary" onclick={() => { initialEventDate = new Date(); selectedEvent = null; showEventModal = true; }}>
          + New Event
        </button>
      </div>
    </header>

    <main class="main">
      <div class="calendar-container">
        {#if calendarStore.loading && calendarStore.events.length === 0}
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading calendar...</p>
          </div>
        {:else if calendarStore.error}
          <div class="error-state">
            <p>Error: {calendarStore.error}</p>
            <button onclick={() => calendarStore.loadEvents()}>Retry</button>
          </div>
        {:else}
          {#if calendarStore.currentView === 'day'}
            <DayView
              date={calendarStore.currentDate}
              events={calendarStore.events}
              onEventClick={handleEventClick}
              onTimeSlotClick={handleTimeSlotClick}
            />
          {:else if calendarStore.currentView === 'week'}
            <WeekView
              date={calendarStore.currentDate}
              events={calendarStore.events}
              onDateClick={handleDateClick}
              onEventClick={handleEventClick}
              onTimeSlotClick={handleTimeSlotClick}
            />
          {:else if calendarStore.currentView === 'month'}
            <MonthView
              year={calendarStore.currentDate.getFullYear()}
              month={calendarStore.currentDate.getMonth()}
              events={calendarStore.events}
              onDateClick={handleDateClick}
              onEventClick={handleEventClick}
            />
          {/if}
        {/if}
      </div>
    </main>

    <footer class="footer">
      <p>Home Dashboard v{version} • Offline-first family calendar</p>
    </footer>
  </div>

  <!-- Event modal -->
  <EventModal
    bind:open={showEventModal}
    event={selectedEvent}
    initialDate={initialEventDate}
    onClose={() => { showEventModal = false; selectedEvent = null; }}
    onSave={handleSaveEvent}
    onDelete={handleDeleteEvent}
  />
{/if}

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: #f5f5f5;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #e0e0e0;
    border-top: 4px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .loading-screen p {
    margin-top: 1rem;
    color: #666;
    font-size: 1.125rem;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #f5f5f5;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
    padding: 1rem 2rem;
    background: white;
    border-bottom: 1px solid #e0e0e0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    flex-wrap: wrap;
  }

  .header-left h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #333;
  }

  .view-title {
    margin-top: 0.25rem;
    font-size: 0.875rem;
    color: #666;
  }

  .header-center {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .nav-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    font-size: 1.5rem;
    cursor: pointer;
    transition: all 0.2s;
    color: #666;
  }

  .nav-btn:hover {
    background: #f5f5f5;
    border-color: #d0d0d0;
  }

  .today-btn {
    padding: 0.5rem 1rem;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    color: #666;
  }

  .today-btn:hover {
    background: #f5f5f5;
    border-color: #d0d0d0;
  }

  .header-right {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .view-switcher {
    display: flex;
    gap: 0.5rem;
  }

  .view-switcher button {
    padding: 0.5rem 1rem;
    border: 1px solid #e0e0e0;
    background: white;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: #666;
    transition: all 0.2s;
  }

  .view-switcher button:hover {
    background: #f5f5f5;
    border-color: #d0d0d0;
  }

  .view-switcher button.active {
    background: #2563eb;
    color: white;
    border-color: #2563eb;
  }

  .btn-primary {
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .main {
    flex: 1;
    padding: 1.5rem;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .calendar-container {
    flex: 1;
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .loading-state,
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 1rem;
  }

  .loading-state p,
  .error-state p {
    color: #666;
    font-size: 0.875rem;
  }

  .error-state p {
    color: #ef4444;
  }

  .error-state button {
    padding: 0.5rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }

  .footer {
    padding: 1rem 2rem;
    background: white;
    border-top: 1px solid #e0e0e0;
    text-align: center;
  }

  .footer p {
    margin: 0;
    font-size: 0.875rem;
    color: #999;
  }
</style>
