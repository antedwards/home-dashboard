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
  let initError = $state<string | null>(data.error);

  onMount(async () => {
    try {
      // Initialize calendar store with server-provided data
      if (data.userId && data.familyId) {
        await calendarStore.initialize(data.userId, data.familyId);
      }
    } catch (error) {
      console.error('Initialization error:', error);
      initError = 'Failed to initialize calendar. Please refresh the page.';
    }
  });

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

      <button class="btn-primary" onclick={() => { initialEventDate = new Date(); selectedEvent = null; showEventModal = true; }}>
        + New Event
      </button>
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
</div>

<!-- Event modal -->
<EventModal
  bind:open={showEventModal}
  event={selectedEvent}
  initialDate={initialEventDate}
  familyMembers={calendarStore.familyMembers}
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
    gap: 1.5rem;
    height: calc(100vh - 8rem);
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .header-left h2 {
    margin: 0;
    font-size: 2rem;
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

  .calendar-container {
    flex: 1;
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    display: flex;
    flex-direction: column;
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

  @media (max-width: 1024px) {
    .page-header {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
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

  @media (max-width: 640px) {
    .calendar-page {
      height: calc(100vh - 6rem);
    }

    .view-switcher {
      flex: 1;
    }

    .view-switcher button {
      flex: 1;
    }

    .btn-primary {
      width: 100%;
    }
  }
</style>
