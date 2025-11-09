<script lang="ts">
  import { onMount } from 'svelte';
  import { createSupabaseClient } from '@home-dashboard/database/browser';
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
  let voiceActive = $state(false);
  let voiceStatus = $state<string>('');
  let voiceTranscript = $state<string>('');

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

      // Verify token with backend via IPC (runs in main process)
      const deviceId = await window.electron.getDeviceId();
      const authResult = await window.electron.auth.verifyDeviceToken(token, deviceId);

      if (authResult.success && authResult.result?.valid && authResult.result?.userId) {
        isAuthenticated = true;
        userId = authResult.result.userId;

        // Get user's family
        const { data: familyMember } = await supabase
          .from('family_members')
          .select('family_id')
          .eq('user_id', authResult.result.userId)
          .single();

        if (familyMember) {
          // Initialize calendar store
          await calendarStore.initialize(authResult.result.userId, familyMember.family_id);

          // Initialize voice commands
          await initializeVoice(authResult.result.userId, familyMember.family_id);
        }

        // TODO: If token needs refresh, show a notification
        if (authResult.result.needsRefresh) {
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

  async function initializeVoice(userId: string, familyId: string) {
    try {
      // Initialize voice service
      const result = await window.electron.voice.initialize(userId, familyId);

      if (result.success) {
        // Set up event listener
        window.electron.voice.onEvent(handleVoiceEvent);

        // Start listening
        const startResult = await window.electron.voice.start();
        if (startResult.success) {
          voiceActive = true;
          voiceStatus = 'Say "Hey Sausage" to give a command';
          console.log('✅ Voice commands active');
        }
      }
    } catch (error) {
      console.error('Failed to initialize voice commands:', error);
      voiceStatus = 'Voice commands unavailable';
    }
  }

  function handleVoiceEvent(event: any) {
    console.log('Voice event:', event);

    switch (event.type) {
      case 'wake_word_detected':
        voiceStatus = '🎤 Listening...';
        voiceTranscript = '';
        break;
      case 'listening_started':
        voiceStatus = '🎤 Speak now...';
        break;
      case 'listening_stopped':
        voiceStatus = '⏳ Processing...';
        break;
      case 'speech_recognized':
        voiceTranscript = event.transcript;
        voiceStatus = `📝 "${event.transcript}"`;
        break;
      case 'command_executed':
        if (event.result.success) {
          voiceStatus = `✅ ${event.result.message}`;
          // Refresh calendar to show new event
          calendarStore.loadEvents();
        } else {
          voiceStatus = `❌ ${event.result.message}`;
        }
        // Clear status after 5 seconds
        setTimeout(() => {
          voiceStatus = 'Say "Hey Sausage" to give a command';
          voiceTranscript = '';
        }, 5000);
        break;
      case 'error':
        voiceStatus = `❌ Error: ${event.error}`;
        setTimeout(() => {
          voiceStatus = 'Say "Hey Sausage" to give a command';
        }, 3000);
        break;
    }
  }

  async function toggleVoice() {
    try {
      if (voiceActive) {
        await window.electron.voice.stop();
        voiceActive = false;
        voiceStatus = 'Voice commands off';
      } else {
        await window.electron.voice.start();
        voiceActive = true;
        voiceStatus = 'Say "Hey Sausage" to give a command';
      }
    } catch (error) {
      console.error('Failed to toggle voice:', error);
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

        <button
          class="voice-toggle"
          class:active={voiceActive}
          onclick={toggleVoice}
          title={voiceStatus || 'Toggle voice commands'}
        >
          {voiceActive ? '🎤' : '🔇'}
        </button>

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
      <div class="footer-left">
        <p>Home Dashboard v{version} • Offline-first family calendar</p>
      </div>
      {#if voiceStatus}
        <div class="voice-status" class:listening={voiceStatus.includes('Listening')}>
          {voiceStatus}
        </div>
      {/if}
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

  .voice-toggle {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 50%;
    font-size: 1.25rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .voice-toggle:hover {
    background: #f5f5f5;
    border-color: #d0d0d0;
  }

  .voice-toggle.active {
    background: #10b981;
    border-color: #10b981;
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
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
    padding: 0.75rem 2rem;
    background: white;
    border-top: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .footer-left p {
    margin: 0;
    font-size: 0.875rem;
    color: #999;
  }

  .voice-status {
    padding: 0.5rem 1rem;
    background: #f3f4f6;
    border-radius: 6px;
    font-size: 0.875rem;
    color: #666;
    font-weight: 500;
    max-width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .voice-status.listening {
    background: #10b981;
    color: white;
    animation: pulse 1s ease-in-out infinite;
  }
</style>
