<script lang="ts">
  import { onMount } from 'svelte';
  import {
    DayView,
    WeekView,
    MonthView,
    EventModal,
    formatDate,
    type CalendarEvent,
  } from '@home-dashboard/ui';
  import { calendarStore } from '$lib/stores/calendar.svelte';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  let showEventModal = $state(false);
  let selectedEvent = $state<CalendarEvent | null>(null);
  let initialEventDate = $state<Date | undefined>(undefined);
  let initialAllDay = $state(false);
  let initError = $state<string | null>(data.error);
  let showUserMenu = $state(false);

  // Close dropdown when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-container')) {
      showUserMenu = false;
    }
  }

  $effect(() => {
    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  });

  onMount(async () => {
    try {
      // Initialize calendar store with server-provided data
      if (data.userId && data.householdId) {
        await calendarStore.initialize(data.userId, data.householdId);
      }
    } catch (error) {
      console.error('Initialization error:', error);
      initError = 'Failed to initialize calendar. Please refresh the page.';
    }
  });

  function handleDateClick(date: Date) {
    initialEventDate = date;
    initialAllDay = false;
    selectedEvent = null;
    showEventModal = true;
  }

  function handleEventClick(event: CalendarEvent) {
    selectedEvent = event;
    initialEventDate = undefined;
    initialAllDay = false;
    showEventModal = true;
  }

  function handleTimeSlotClick(date: Date, hour: number) {
    const eventDate = new Date(date);
    eventDate.setHours(hour, 0, 0, 0);
    initialEventDate = eventDate;
    initialAllDay = false;
    selectedEvent = null;
    showEventModal = true;
  }

  function handleDayHeaderClick(date: Date) {
    initialEventDate = date;
    initialAllDay = true;
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

<svelte:head>
  <title>Calendar • Home Dashboard</title>
</svelte:head>

<div class="calendar-page">
  <!-- Header with navigation -->
  <div class="page-header">
    <div class="header-left">
      <h2>Calendar</h2>
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

      <button class="btn-primary" onclick={() => { initialEventDate = new Date(); initialAllDay = false; selectedEvent = null; showEventModal = true; }}>
        + New Event
      </button>

      <div class="user-menu-container">
        <button
          class="user-button"
          onclick={() => showUserMenu = !showUserMenu}
          aria-label="User menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </button>

        {#if showUserMenu}
          <div class="user-dropdown">
            <div class="user-info">
              <div class="user-email">{data.session?.email}</div>
            </div>
            <div class="user-actions">
              <a href="/devices" class="menu-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                Devices
              </a>
              <a href="/download" class="menu-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download App
              </a>
              <a href="/invites" class="menu-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <line x1="19" y1="8" x2="19" y2="14"></line>
                  <line x1="22" y1="11" x2="16" y2="11"></line>
                </svg>
                Invite Members
              </a>
              <a href="/settings/calendar-sync" class="menu-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Calendar Sync
              </a>
              <a href="/auth/logout" class="menu-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Logout
              </a>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Calendar views -->
  <div class="calendar-container">
    {#if initError}
      <div class="error-state">
        <p>{initError}</p>
        <a href="/auth/login" class="btn-primary">Go to Login</a>
      </div>
    {:else if calendarStore.loading && calendarStore.events.length === 0}
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
          onDayHeaderClick={handleDayHeaderClick}
        />
      {:else if calendarStore.currentView === 'week'}
        <WeekView
          date={calendarStore.currentDate}
          events={calendarStore.events}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
          onTimeSlotClick={handleTimeSlotClick}
          onDayHeaderClick={handleDayHeaderClick}
        />
      {:else if calendarStore.currentView === 'month'}
        <MonthView
          year={calendarStore.currentDate.getFullYear()}
          month={calendarStore.currentDate.getMonth()}
          events={calendarStore.events}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
          onDayHeaderClick={handleDayHeaderClick}
        />
      {/if}
    {/if}
  </div>
</div>

<!-- Event modal -->
<EventModal
  bind:open={showEventModal}
  event={selectedEvent}
  initialDate={initialEventDate}
  initialAllDay={initialAllDay}
  familyMembers={calendarStore.householdMembers}
  categories={calendarStore.categories}
  onClose={() => { showEventModal = false; selectedEvent = null; }}
  onSave={handleSaveEvent}
  onDelete={handleDeleteEvent}
  onCategoryCreate={async (name, color) => await calendarStore.createCategory(name, color)}
/>

<style>
  .calendar-page {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: calc(100vh - 3rem);
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    padding: 0.25rem 0;
  }

  .header-left h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #333;
  }

  .view-title {
    margin-top: 0.125rem;
    font-size: 0.75rem;
    color: #666;
  }

  .header-center {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .nav-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-size: 1.25rem;
    cursor: pointer;
    transition: all 0.2s;
    color: #666;
  }

  .nav-btn:hover {
    background: #f5f5f5;
    border-color: #d0d0d0;
  }

  .today-btn {
    padding: 0.375rem 0.75rem;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-size: 0.8125rem;
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
    gap: 0.5rem;
    align-items: center;
  }

  .view-switcher {
    display: flex;
    gap: 0.25rem;
  }

  .view-switcher button {
    padding: 0.375rem 0.75rem;
    border: 1px solid #e0e0e0;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8125rem;
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
    padding: 0.375rem 0.875rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .calendar-container {
    flex: 1;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 1rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e0e0e0;
    border-top: 3px solid #667eea;
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

  .loading-state p {
    color: #666;
    font-size: 0.875rem;
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 1rem;
  }

  .error-state p {
    color: #ef4444;
    font-size: 0.875rem;
  }

  .error-state button {
    padding: 0.5rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }

  @media (max-width: 1200px) {
    .header-left h2 {
      font-size: 1.25rem;
    }

    .calendar-page {
      gap: 0.5rem;
    }
  }

  @media (max-width: 1024px) {
    .page-header {
      flex-direction: column;
      align-items: stretch;
      gap: 0.75rem;
    }

    .header-left,
    .header-center,
    .header-right {
      width: 100%;
      justify-content: center;
    }

    .header-right {
      flex-wrap: wrap;
    }
  }

  @media (max-width: 768px) {
    .calendar-page {
      gap: 0.5rem;
      height: calc(100vh - 5rem);
    }

    .header-left h2 {
      font-size: 1.125rem;
    }

    .btn-primary {
      font-size: 0.75rem;
      padding: 0.375rem 0.625rem;
    }
  }

  @media (max-width: 640px) {
    .view-switcher {
      flex: 1;
    }

    .view-switcher button {
      flex: 1;
      padding: 0.375rem 0.5rem;
      font-size: 0.75rem;
    }

    .btn-primary {
      width: 100%;
    }

    .header-left h2 {
      font-size: 1rem;
    }
  }

  /* User menu styles */
  .user-menu-container {
    position: relative;
  }

  .user-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid #e0e0e0;
    background: white;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
    color: #666;
  }

  .user-button svg {
    width: 16px;
    height: 16px;
  }

  .user-button:hover {
    background: #f5f5f5;
    border-color: #d0d0d0;
  }

  .user-dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 200px;
    z-index: 1000;
  }

  .user-info {
    padding: 1rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .user-email {
    font-size: 0.875rem;
    color: #666;
    word-break: break-word;
  }

  .user-actions {
    padding: 0.5rem;
  }

  .menu-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 1rem;
    text-decoration: none;
    color: #666;
    font-size: 0.875rem;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .menu-link:hover {
    background: #f5f5f5;
    color: #333;
  }

  .menu-link svg {
    flex-shrink: 0;
  }
</style>
