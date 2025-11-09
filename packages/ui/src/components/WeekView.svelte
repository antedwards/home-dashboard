<script lang="ts">
  import {
    getCurrentWeek,
    getHoursOfDay,
    formatTime12Hour,
    getDayName,
    calculateEventPosition,
    type CalendarDay,
  } from '../utils/calendar';
  import type { CalendarEvent } from '../types';

  interface Props {
    date?: Date;
    events?: CalendarEvent[];
    onDateClick?: (date: Date) => void;
    onEventClick?: (event: CalendarEvent) => void;
    onTimeSlotClick?: (date: Date, hour: number) => void;
  }

  let {
    date = new Date(),
    events = [],
    onDateClick,
    onEventClick,
    onTimeSlotClick,
  }: Props = $props();

  const week = $derived(getCurrentWeek(date));
  const hours = getHoursOfDay();

  function getEventsForDay(day: Date): CalendarEvent[] {
    return events.filter((event) => {
      const eventStart = new Date(event.start);
      return (
        eventStart.getFullYear() === day.getFullYear() &&
        eventStart.getMonth() === day.getMonth() &&
        eventStart.getDate() === day.getDate()
      );
    });
  }

  function handleEventClick(event: CalendarEvent, e: MouseEvent) {
    e.stopPropagation();
    if (onEventClick) {
      onEventClick(event);
    }
  }

  function handleTimeSlotClick(day: Date, hour: number) {
    if (onTimeSlotClick) {
      const slotDate = new Date(day);
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

<div class="week-view">
  <!-- Week header with dates -->
  <div class="week-header">
    <div class="time-gutter"></div>
    {#each week as day}
      <button
        class="day-header"
        class:today={day.isToday}
        onclick={() => onDateClick?.(day.date)}
        type="button"
      >
        <div class="day-name">{getDayName(day.dayOfWeek, true)}</div>
        <div class="day-number" class:today-number={day.isToday}>
          {day.dayOfMonth}
        </div>
      </button>
    {/each}
  </div>

  <!-- Time grid -->
  <div class="time-grid-container">
    <div class="time-grid">
      <!-- Time labels -->
      <div class="time-column">
        {#each hours as hour}
          <div class="time-label">
            <span>{formatTime12Hour(hour)}</span>
          </div>
        {/each}
      </div>

      <!-- Day columns -->
      {#each week as day}
        {@const dayEvents = getEventsForDay(day.date)}
        <div class="day-column" class:today-column={day.isToday}>
          <!-- Hour slots -->
          {#each hours as hour}
            <button
              class="time-slot"
              onclick={() => handleTimeSlotClick(day.date, hour)}
              type="button"
            >
              <!-- Empty slot for clicking -->
            </button>
          {/each}

          <!-- All-day events -->
          <div class="all-day-events">
            {#each dayEvents.filter((e) => e.all_day) as event}
              <button
                class="event-block all-day-event"
                style="background-color: {event.color || '#3b82f6'};"
                onclick={(e) => handleEventClick(event, e)}
                type="button"
                title={event.title}
              >
                <div class="event-content">
                  <div class="event-title">{event.title}</div>
                </div>
              </button>
            {/each}
          </div>

          <!-- Timed events -->
          <div class="timed-events">
            {#each dayEvents.filter((e) => !e.all_day) as event}
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
                  min-height: {Math.max(position.height, 20)}px;
                "
                onclick={(e) => handleEventClick(event, e)}
                type="button"
                title={event.title}
              >
                <div class="event-content">
                  <div class="event-title">{event.title}</div>
                  <div class="event-time">{formatEventTime(event)}</div>
                  {#if event.location}
                    <div class="event-location">📍 {event.location}</div>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .week-view {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: white;
    overflow: hidden;
  }

  .week-header {
    display: grid;
    grid-template-columns: 60px repeat(7, 1fr);
    border-bottom: 2px solid #e0e0e0;
    background: #f9f9f9;
    flex-shrink: 0;
  }

  .time-gutter {
    border-right: 1px solid #e0e0e0;
  }

  .day-header {
    padding: 0.75rem;
    text-align: center;
    border-right: 1px solid #e0e0e0;
    cursor: pointer;
    border: none;
    background: transparent;
    transition: background-color 0.2s;
  }

  .day-header:hover {
    background: #f0f0f0;
  }

  .day-header.today {
    background: #eff6ff;
  }

  .day-name {
    font-size: 0.75rem;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
    margin-bottom: 0.25rem;
  }

  .day-number {
    font-size: 1.25rem;
    font-weight: 600;
    color: #333;
  }

  .today-number {
    background: #3b82f6;
    color: white;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
  }

  .time-grid-container {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .time-grid {
    display: grid;
    grid-template-columns: 60px repeat(7, 1fr);
    position: relative;
  }

  .time-column {
    border-right: 1px solid #e0e0e0;
    background: #fafafa;
  }

  .time-label {
    height: 60px;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    color: #666;
    border-bottom: 1px solid #f0f0f0;
  }

  .day-column {
    position: relative;
    border-right: 1px solid #e0e0e0;
  }

  .today-column {
    background: #fafeff;
  }

  .time-slot {
    height: 60px;
    border-bottom: 1px solid #f0f0f0;
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

  .all-day-events {
    position: sticky;
    top: 0;
    z-index: 2;
    background: inherit;
    padding: 0.25rem;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .timed-events {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
  }

  .event-block {
    pointer-events: auto;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    color: white;
    font-size: 0.75rem;
    cursor: pointer;
    border: none;
    text-align: left;
    overflow: hidden;
    transition: opacity 0.2s, transform 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .event-block:hover {
    opacity: 0.9;
    transform: scale(1.02);
    z-index: 10;
  }

  .all-day-event {
    position: relative;
    width: 100%;
  }

  .timed-event {
    position: absolute;
    left: 2px;
    right: 2px;
  }

  .event-content {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .event-title {
    font-weight: 600;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .event-time {
    font-size: 0.65rem;
    opacity: 0.9;
  }

  .event-location {
    font-size: 0.65rem;
    opacity: 0.9;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 768px) {
    .week-header {
      grid-template-columns: 50px repeat(7, 1fr);
    }

    .time-grid {
      grid-template-columns: 50px repeat(7, 1fr);
    }

    .time-label span {
      font-size: 0.65rem;
    }

    .day-name {
      font-size: 0.65rem;
    }

    .day-number {
      font-size: 1rem;
    }

    .event-title {
      font-size: 0.7rem;
    }

    .event-time,
    .event-location {
      display: none;
    }
  }
</style>
