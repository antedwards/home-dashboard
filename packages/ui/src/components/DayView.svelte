<script lang="ts">
  import { onMount } from 'svelte';
  import { formatDate } from '../utils/calendar';
  import type { CalendarEvent } from '../types';
  import TimeGrid from './TimeGrid.svelte';

  interface Props {
    date?: Date;
    events?: CalendarEvent[];
    onEventClick?: (event: CalendarEvent) => void;
    onTimeSlotClick?: (date: Date, hour: number) => void;
  }

  let {
    date = new Date(),
    events = [],
    onEventClick,
    onTimeSlotClick,
  }: Props = $props();

  let timeGridContainer: HTMLDivElement;
  const isToday = $derived(
    date.toDateString() === new Date().toDateString()
  );

  const dayEvents = $derived(
    events.filter((event) => {
      const eventStart = new Date(event.start);
      return (
        eventStart.getFullYear() === date.getFullYear() &&
        eventStart.getMonth() === date.getMonth() &&
        eventStart.getDate() === date.getDate()
      );
    })
  );

  const allDayEvents = $derived(dayEvents.filter((e) => e.all_day));

  function handleEventClick(event: CalendarEvent) {
    if (onEventClick) {
      onEventClick(event);
    }
  }

  // Auto-scroll to current time when viewing today
  onMount(() => {
    if (isToday && timeGridContainer) {
      // Get current time
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Each hour is 60px tall
      const pixelsPerHour = 60;
      const scrollPosition = (currentHour + currentMinute / 60) * pixelsPerHour;

      // Center the current time in the view
      const containerHeight = timeGridContainer.clientHeight;
      const scrollTop = scrollPosition - containerHeight / 2;

      // Instant scroll to position (no animation)
      timeGridContainer.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: 'instant',
      });
    }
  });
</script>

<div class="day-view">
  <!-- Day header -->
  <div class="day-header" class:today={isToday}>
    <h2>{formatDate(date, 'long')}</h2>
    {#if allDayEvents.length > 0}
      <div class="all-day-section">
        <div class="all-day-label">All Day</div>
        <div class="all-day-events">
          {#each allDayEvents as event}
            <button
              class="event-block all-day-event"
              style="background-color: #3b82f6;"
              onclick={(e) => handleEventClick(event, e)}
              type="button"
            >
              <div class="event-title">{event.title}</div>
              {#if event.location}
                <div class="event-location">📍 {event.location}</div>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Time grid -->
  <div class="time-grid-container" bind:this={timeGridContainer}>
    <TimeGrid
      columns={[{
        date: date,
        events: dayEvents,
        isToday: isToday
      }]}
      maxVisibleEvents={3}
      onEventClick={handleEventClick}
      onTimeSlotClick={onTimeSlotClick}
    />
  </div>
</div>

<style>
  .day-view {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: white;
    overflow: hidden;
  }

  .day-header {
    padding: 1.5rem;
    border-bottom: 2px solid #e0e0e0;
    background: #f9f9f9;
    flex-shrink: 0;
  }

  .day-header.today {
    background: #eff6ff;
  }

  .day-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #333;
  }

  .all-day-section {
    margin-top: 1rem;
  }

  .all-day-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
    margin-bottom: 0.5rem;
  }

  .all-day-events {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .time-grid-container {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .event-block {
    pointer-events: auto;
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    color: white;
    cursor: pointer;
    border: none;
    text-align: left;
    overflow: hidden;
    transition: opacity 0.2s, transform 0.2s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    width: 100%;
  }

  .event-block:hover {
    opacity: 0.95;
    transform: scale(1.01);
    z-index: 10;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .event-title {
    font-weight: 600;
    font-size: 0.875rem;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .event-location {
    font-size: 0.75rem;
    opacity: 0.9;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 768px) {
    .day-header {
      padding: 1rem;
    }

    .day-header h2 {
      font-size: 1.25rem;
    }
  }
</style>
