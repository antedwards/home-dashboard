<script lang="ts">
  import { onMount } from 'svelte';
  import { formatDate } from '../utils/calendar';
  import type { CalendarEvent } from '../types';
  import TimeGrid from './TimeGrid.svelte';
  import { getEventBackgroundColor, getEventBorderColor } from '../utils/event-styles';

  interface Props {
    date?: Date;
    events?: CalendarEvent[];
    onEventClick?: (event: CalendarEvent) => void;
    onTimeSlotClick?: (date: Date, hour: number) => void;
    onDayHeaderClick?: (date: Date) => void;
  }

  let {
    date = new Date(),
    events = [],
    onEventClick,
    onTimeSlotClick,
    onDayHeaderClick,
  }: Props = $props();

  let timeGridContainer: HTMLDivElement;
  const isToday = $derived(
    date.toDateString() === new Date().toDateString()
  );

  let lastUserInteraction = 0;
  const INTERACTION_PAUSE = 60000; // Pause auto-scroll for 60 seconds after user interaction

  function getAdjustedDayEvents(): CalendarEvent[] {
    const adjustedEvents: CalendarEvent[] = [];

    events.forEach((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      // Skip all-day events (shown in header)
      if (event.allDay) return;

      // Skip multi-day events (shown in header)
      const eventStartDay = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
      const eventEndDay = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
      if (eventStartDay.getTime() !== eventEndDay.getTime()) return;

      // Create date at start of day for comparison
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

      // Check if event is on this day
      if (dayStart.getTime() <= eventEndDay.getTime() && dayEnd.getTime() >= eventStartDay.getTime()) {
        // Single day event - use original times
        adjustedEvents.push(event);
      }
    });

    return adjustedEvents;
  }

  const dayEvents = $derived(getAdjustedDayEvents());

  // Get all-day and multi-day events for header display
  const headerEvents = $derived(events.filter(e => {
    if (e.allDay) return true;

    // Check if it's a multi-day event
    const start = new Date(e.start);
    const end = new Date(e.end);
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    return startDay.getTime() !== endDay.getTime();
  }).filter(e => {
    // Only include events that span this specific day
    const eventStart = new Date(e.start);
    const eventEnd = new Date(e.end);

    const eventStartDay = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
    const eventEndForDisplay = eventEnd.getHours() === 0 && eventEnd.getMinutes() === 0 && eventEnd.getSeconds() === 0
      ? new Date(eventEnd.getTime() - 1)
      : eventEnd;
    const eventEndDay = new Date(eventEndForDisplay.getFullYear(), eventEndForDisplay.getMonth(), eventEndForDisplay.getDate());

    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    return dayStart.getTime() >= eventStartDay.getTime() && dayStart.getTime() <= eventEndDay.getTime();
  }));

  function handleEventClick(event: CalendarEvent) {
    if (onEventClick) {
      onEventClick(event);
    }
  }

  function scrollToTime(behavior: ScrollBehavior = 'instant') {
    if (!timeGridContainer) return;

    const pixelsPerHour = 60;
    let scrollHour: number;
    let scrollMinute: number;

    if (isToday) {
      // For today, use current time
      const now = new Date();
      scrollHour = now.getHours();
      scrollMinute = now.getMinutes();
    } else {
      // For other days, scroll to 8am
      scrollHour = 8;
      scrollMinute = 0;
    }

    const scrollPosition = (scrollHour + scrollMinute / 60) * pixelsPerHour;
    const containerHeight = timeGridContainer.clientHeight;
    const scrollTop = scrollPosition - containerHeight / 2;

    timeGridContainer.scrollTo({
      top: Math.max(0, scrollTop),
      behavior,
    });
  }

  function handleUserScroll() {
    lastUserInteraction = Date.now();
  }

  // Auto-scroll to appropriate time on mount and when date changes
  $effect(() => {
    if (timeGridContainer) {
      scrollToTime('instant');
    }
  });

  // Auto-track current time every minute (only for today)
  onMount(() => {
    if (timeGridContainer) {
      // Add scroll listener to detect user interaction
      timeGridContainer.addEventListener('scroll', handleUserScroll, { passive: true });

      const interval = setInterval(() => {
        if (isToday && timeGridContainer) {
          // Only auto-scroll if enough time has passed since last user interaction
          const timeSinceInteraction = Date.now() - lastUserInteraction;
          if (timeSinceInteraction > INTERACTION_PAUSE) {
            scrollToTime('smooth');
          }
        }
      }, 60000); // Every minute

      return () => {
        clearInterval(interval);
        timeGridContainer?.removeEventListener('scroll', handleUserScroll);
      };
    }
  });
</script>

<div class="day-view">
  <!-- Day header -->
  <div class="day-header" class:today={isToday}>
    <button
      class="day-header-button"
      onclick={() => onDayHeaderClick?.(date)}
      type="button"
      title="Click to create an all-day event"
    >
      <h2>{formatDate(date, 'long')}</h2>
    </button>
    {#if headerEvents.length > 0}
      <div class="all-day-section">
        <div class="all-day-label">All Day</div>
        <div class="all-day-events">
          {#each headerEvents as event}
            <button
              class="event-block all-day-event"
              style="border-left-color: {getEventBorderColor(event.color)}; background-color: {getEventBackgroundColor(event.color)};"
              onclick={() => handleEventClick(event)}
              type="button"
            >
              <div class="event-header">
                {#if !event.allDay}
                  <span class="event-time">
                    {new Date(event.start).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                {/if}
                <div class="event-title">{event.title}</div>
              </div>
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

  .day-header-button {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: left;
    width: 100%;
    transition: opacity 0.2s;
  }

  .day-header-button:hover {
    opacity: 0.7;
  }

  .day-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #333;
    pointer-events: none;
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
    color: #333;
    cursor: pointer;
    border: none;
    border-left: 4px solid;
    text-align: left;
    overflow: hidden;
    transition: background-color 0.2s, transform 0.2s;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    width: 100%;
  }

  .event-block:hover {
    filter: brightness(1.1);
    transform: scale(1.01);
    z-index: 10;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  }

  .event-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .event-time {
    font-weight: 600;
    font-size: 0.75rem;
    flex-shrink: 0;
    color: #666;
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
    color: #666;
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
