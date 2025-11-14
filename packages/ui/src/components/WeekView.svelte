<script lang="ts">
  import { onMount } from 'svelte';
  import { getCurrentWeek, getDayName } from '../utils/calendar';
  import type { CalendarEvent } from '../types';
  import TimeGrid from './TimeGrid.svelte';

  interface Props {
    date?: Date;
    events?: CalendarEvent[];
    onDateClick?: (date: Date) => void;
    onEventClick?: (event: CalendarEvent) => void;
    onTimeSlotClick?: (date: Date, hour: number) => void;
    onDayHeaderClick?: (date: Date) => void;
  }

  let {
    date = new Date(),
    events = [],
    onDateClick,
    onEventClick,
    onTimeSlotClick,
    onDayHeaderClick,
  }: Props = $props();

  const week = $derived(getCurrentWeek(date));
  let timeGridContainer: HTMLDivElement;

  // Check if this week contains today
  const weekContainsToday = $derived(week.some(day => day.isToday));

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

  // Transform week data into columns for TimeGrid
  const columns = $derived(week.map(day => ({
    date: day.date,
    events: getEventsForDay(day.date),
    isToday: day.isToday
  })));

  function handleEventClick(event: CalendarEvent) {
    if (onEventClick) {
      onEventClick(event);
    }
  }

  // Auto-scroll to current time when viewing this week
  onMount(() => {
    if (weekContainsToday && timeGridContainer) {
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

<div class="week-view">
  <!-- Week header with dates -->
  <div class="week-header">
    <div class="time-gutter"></div>
    {#each week as day}
      <button
        class="day-header"
        class:today={day.isToday}
        onclick={() => onDayHeaderClick?.(day.date)}
        type="button"
        title="Click to create an all-day event"
      >
        <div class="day-name">{getDayName(day.dayOfWeek, true)}</div>
        <div class="day-number" class:today-number={day.isToday}>
          {day.dayOfMonth}
        </div>
      </button>
    {/each}
  </div>

  <!-- Time grid -->
  <div class="time-grid-container" bind:this={timeGridContainer}>
    <TimeGrid
      columns={columns}
      maxVisibleEvents={2}
      onEventClick={handleEventClick}
      onTimeSlotClick={onTimeSlotClick}
    />
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
    grid-template-columns: 80px repeat(7, 1fr);
    border-bottom: 2px solid #e0e0e0;
    background: #f9f9f9;
    flex-shrink: 0;
  }

  .time-gutter {
    border-right: 2px solid #e0e0e0;
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

  @media (max-width: 768px) {
    .week-header {
      grid-template-columns: 60px repeat(7, 1fr);
    }

    .day-name {
      font-size: 0.65rem;
    }

    .day-number {
      font-size: 1rem;
    }
  }
</style>
