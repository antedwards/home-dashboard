<script lang="ts">
  import {
    getHoursOfDay,
    formatTime12Hour,
    calculateEventPosition,
    formatDate,
  } from '../utils/calendar';
  import type { CalendarEvent } from '../types';

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

  const hours = getHoursOfDay();
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
  const timedEvents = $derived(dayEvents.filter((e) => !e.all_day));

  function handleEventClick(event: CalendarEvent, e: MouseEvent) {
    e.stopPropagation();
    if (onEventClick) {
      onEventClick(event);
    }
  }

  function handleTimeSlotClick(hour: number) {
    if (onTimeSlotClick) {
      const slotDate = new Date(date);
      slotDate.setHours(hour, 0, 0, 0);
      onTimeSlotClick(slotDate, hour);
    }
  }

  function formatEventTime(event: CalendarEvent): string {
    const start = new Date(event.start);
    const end = new Date(event.end);

    if (event.all_day) {
      return 'All day';
    }

    const startTime = start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    const endTime = end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    return `${startTime} - ${endTime}`;
  }
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
              style="background-color: {event.color || '#3b82f6'};"
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
  <div class="time-grid-container">
    <div class="time-grid">
      <!-- Time slots -->
      {#each hours as hour}
        <div class="time-row">
          <div class="time-label">
            <span>{formatTime12Hour(hour)}</span>
          </div>
          <button
            class="time-slot"
            onclick={() => handleTimeSlotClick(hour)}
            type="button"
          >
            <!-- Empty for clicking -->
          </button>
        </div>
      {/each}

      <!-- Timed events overlay -->
      <div class="events-overlay">
        {#each timedEvents as event}
          {@const position = calculateEventPosition(
            new Date(event.start),
            new Date(event.end)
          )}
          <button
            class="event-block timed-event"
            style="
              background-color: {event.color || '#3b82f6'};
              top: {position.top}px;
              height: {position.height}px;
              min-height: {Math.max(position.height, 30)}px;
            "
            onclick={(e) => handleEventClick(event, e)}
            type="button"
          >
            <div class="event-content">
              <div class="event-title">{event.title}</div>
              <div class="event-time">{formatEventTime(event)}</div>
              {#if event.location}
                <div class="event-location">📍 {event.location}</div>
              {/if}
              {#if event.description && position.height > 60}
                <div class="event-description">{event.description}</div>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    </div>
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

  .time-grid {
    position: relative;
    min-height: 100%;
  }

  .time-row {
    display: grid;
    grid-template-columns: 80px 1fr;
    height: 60px;
    border-bottom: 1px solid #f0f0f0;
  }

  .time-label {
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #666;
    background: #fafafa;
    border-right: 2px solid #e0e0e0;
  }

  .time-slot {
    cursor: pointer;
    border: none;
    background: transparent;
    width: 100%;
    padding: 0;
    transition: background-color 0.2s;
  }

  .time-slot:hover {
    background: rgba(59, 130, 246, 0.05);
  }

  .events-overlay {
    position: absolute;
    top: 0;
    left: 80px;
    right: 0;
    bottom: 0;
    pointer-events: none;
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

  .all-day-event {
    position: relative;
  }

  .timed-event {
    position: absolute;
    left: 4px;
    right: 4px;
  }

  .event-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    height: 100%;
  }

  .event-title {
    font-weight: 600;
    font-size: 0.875rem;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .event-time {
    font-size: 0.75rem;
    opacity: 0.9;
  }

  .event-location {
    font-size: 0.75rem;
    opacity: 0.9;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .event-description {
    font-size: 0.75rem;
    opacity: 0.85;
    line-height: 1.4;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    margin-top: 0.25rem;
  }

  @media (max-width: 768px) {
    .day-header {
      padding: 1rem;
    }

    .day-header h2 {
      font-size: 1.25rem;
    }

    .time-row {
      grid-template-columns: 60px 1fr;
    }

    .time-label {
      padding: 0.5rem 0.5rem;
      font-size: 0.75rem;
    }

    .events-overlay {
      left: 60px;
    }

    .event-title {
      font-size: 0.8rem;
    }

    .event-time,
    .event-location {
      font-size: 0.7rem;
    }
  }
</style>
