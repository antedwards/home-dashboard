<script lang="ts">
  import { onMount } from 'svelte';
  import { getCurrentWeek, getDayName } from '../utils/calendar';
  import type { CalendarEvent } from '../types';
  import TimeGrid from './TimeGrid.svelte';
  import AvatarGroup from './AvatarGroup.svelte';

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

  let lastUserInteraction = 0;
  const INTERACTION_PAUSE = 60000; // Pause auto-scroll for 60 seconds after user interaction

  function getEventsForDay(day: Date): CalendarEvent[] {
    const dayEvents: CalendarEvent[] = [];

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
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);

      // Check if event is on this day
      if (dayStart.getTime() <= eventEndDay.getTime() && dayEnd.getTime() >= eventStartDay.getTime()) {
        // Single day event - use original times
        dayEvents.push(event);
      }
    });

    return dayEvents;
  }

  // Transform week data into columns for TimeGrid
  const columns = $derived(week.map(day => ({
    date: day.date,
    events: getEventsForDay(day.date),
    isToday: day.isToday
  })));

  // Calculate spanning all-day events
  interface AllDaySpan {
    event: CalendarEvent;
    startDayIndex: number;
    span: number;
    isStart: boolean;
    isEnd: boolean;
    isFirstDayOfWeek: boolean;
  }

  interface AllDaySpanWithRow extends AllDaySpan {
    row: number;
  }

  function getAllDaySpans(): AllDaySpanWithRow[] {
    const spans: AllDaySpan[] = [];
    const processedEvents = new Set<string>();

    // Filter for all-day events AND multi-day events from original events array
    const headerEvents = events.filter(e => {
      if (e.allDay) return true;

      // Check if it's a multi-day event (spans more than one day)
      const start = new Date(e.start);
      const end = new Date(e.end);
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

      return startDay.getTime() !== endDay.getTime();
    });

    week.forEach((day, dayIndex) => {
      const currentDay = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate());

      headerEvents.forEach((event) => {
        // Skip if we've already processed this event
        if (processedEvents.has(event.id)) return;

        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        const eventStartDay = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());

        // If event ends at exactly midnight, it doesn't include that day (it ends on the previous day)
        const eventEndForDisplay = eventEnd.getHours() === 0 && eventEnd.getMinutes() === 0 && eventEnd.getSeconds() === 0
          ? new Date(eventEnd.getTime() - 1)
          : eventEnd;
        const eventEndDay = new Date(eventEndForDisplay.getFullYear(), eventEndForDisplay.getMonth(), eventEndForDisplay.getDate());

        // Check if event spans this day
        if (currentDay < eventStartDay || currentDay > eventEndDay) return;

        // Check if this is the first day in the week for this event
        const isFirstDayInWeek = dayIndex === 0 || currentDay.getTime() === eventStartDay.getTime();
        const isStartOfEvent = currentDay.getTime() === eventStartDay.getTime();

        if (isFirstDayInWeek || isStartOfEvent) {
          // Calculate span within this week
          let span = 1;
          const isEndOfEvent = currentDay.getTime() === eventEndDay.getTime();

          if (!isEndOfEvent && dayIndex < 6) {
            // Count consecutive days in this week
            for (let i = dayIndex + 1; i < week.length; i++) {
              const nextDay = new Date(week[i].date.getFullYear(), week[i].date.getMonth(), week[i].date.getDate());
              if (nextDay.getTime() <= eventEndDay.getTime()) {
                span++;
              } else {
                break;
              }
            }
          }

          spans.push({
            event,
            startDayIndex: dayIndex,
            span,
            isStart: isStartOfEvent,
            isEnd: currentDay.getTime() === eventEndDay.getTime() || dayIndex + span - 1 === 6,
            isFirstDayOfWeek: dayIndex === 0
          });

          processedEvents.add(event.id);
        }
      });
    });

    // Sort spans by start time to ensure earlier events appear in earlier rows
    spans.sort((a, b) => {
      const aTime = new Date(a.event.start).getTime();
      const bTime = new Date(b.event.start).getTime();
      return aTime - bTime;
    });

    // Calculate row positions to avoid overlaps
    const spansWithRows: AllDaySpanWithRow[] = [];
    const rows: Array<{ endDay: number }> = [];

    for (const span of spans) {
      const startDay = span.startDayIndex;
      const endDay = span.startDayIndex + span.span - 1;

      // Find the first row where this event fits
      let rowIndex = 0;
      while (rowIndex < rows.length) {
        if (rows[rowIndex].endDay < startDay) {
          // This row is free, use it
          break;
        }
        rowIndex++;
      }

      // Update or create row
      if (rowIndex < rows.length) {
        rows[rowIndex].endDay = endDay;
      } else {
        rows.push({ endDay });
      }

      spansWithRows.push({
        ...span,
        row: rowIndex
      });
    }

    return spansWithRows;
  }

  const allDaySpans = $derived(getAllDaySpans());
  const hasAnyAllDayEvents = $derived(allDaySpans.length > 0);
  const maxRow = $derived(allDaySpans.length > 0 ? Math.max(...allDaySpans.map(s => s.row)) : 0);
  const allDayGridHeight = $derived(hasAnyAllDayEvents ? Math.max(40, (maxRow + 1) * 28) : 40);

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

    if (weekContainsToday) {
      // For week containing today, use current time
      const now = new Date();
      scrollHour = now.getHours();
      scrollMinute = now.getMinutes();
    } else {
      // For other weeks, scroll to 8am
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

  // Auto-track current time every minute (only for current week)
  onMount(() => {
    if (timeGridContainer) {
      // Add scroll listener to detect user interaction
      timeGridContainer.addEventListener('scroll', handleUserScroll, { passive: true });

      const interval = setInterval(() => {
        if (weekContainsToday && timeGridContainer) {
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
        <div class="day-name">{getDayName(day.dayOfWeek, true, true)}</div>
        <div class="day-number" class:today-number={day.isToday}>
          {day.dayOfMonth}
        </div>
      </button>
    {/each}
  </div>

  <!-- All-day and multi-day events section -->
  {#if hasAnyAllDayEvents}
    <div class="all-day-section">
      <div class="all-day-label">All Day</div>
      <div class="all-day-grid" style="height: {allDayGridHeight}px;">
        {#each allDaySpans as span}
          <button
            class="spanning-all-day-event"
            class:event-start={span.isStart}
            class:event-end={span.isEnd}
            style="
              border-left-color: {span.event.color || '#3b82f6'};
              left: calc({span.startDayIndex} * (100% / 7));
              width: calc({span.span} * (100% / 7));
              top: calc({span.row} * 28px);
            "
            onclick={() => handleEventClick(span.event)}
            type="button"
            title={span.event.title}
          >
            {#if span.isStart || span.isFirstDayOfWeek}
              {#if !span.event.allDay}
                <span class="event-time">
                  {#if span.isStart}
                    {new Date(span.event.start).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  {:else if span.isEnd}
                    {new Date(span.event.end).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  {/if}
                </span>
              {/if}
              <span class="event-title">{span.event.title}</span>
              {#if span.event.attendees && span.event.attendees.length > 0}
                <AvatarGroup users={span.event.attendees} max={2} size="xs" />
              {/if}
            {:else if span.isEnd && !span.event.allDay}
              <span class="event-time">
                {new Date(span.event.end).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
              <span class="event-title">{span.event.title}</span>
              {#if span.event.attendees && span.event.attendees.length > 0}
                <AvatarGroup users={span.event.attendees} max={2} size="xs" />
              {/if}
            {:else}
              <span class="event-continuation">→</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}

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
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .today-number {
    background: #3b82f6;
    color: white;
    border-radius: 50%;
    width: 32px;
    height: 32px;
  }

  .all-day-section {
    display: grid;
    grid-template-columns: 80px 1fr;
    border-bottom: 2px solid #e0e0e0;
    background: #fafafa;
    padding: 0.5rem 0;
    flex-shrink: 0;
    position: relative;
  }

  .all-day-label {
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: #666;
    text-align: right;
    border-right: 2px solid #e0e0e0;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
  }

  .all-day-grid {
    position: relative;
    width: 100%;
  }

  .spanning-all-day-event {
    position: absolute;
    height: 24px;
    padding: 0 0.5rem;
    border-radius: 4px;
    background-color: rgba(255, 255, 255, 0.9) !important;
    color: #333;
    font-size: 0.75rem;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    border: none;
    border-left: 4px solid;
    cursor: pointer;
    transition: background-color 0.2s;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin: 0 2px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .spanning-all-day-event .event-time {
    font-weight: 600;
    flex-shrink: 0;
    color: #666;
  }

  .spanning-all-day-event .event-title {
    font-weight: 600;
  }

  .spanning-all-day-event:hover {
    filter: brightness(1.1);
    z-index: 10;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  }

  .spanning-all-day-event.event-start {
    border-top-left-radius: 4px;
    border-bottom-left-radius: 4px;
  }

  .spanning-all-day-event.event-end {
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
  }

  .spanning-all-day-event .event-title {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .event-continuation {
    font-weight: 600;
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

    .all-day-section {
      grid-template-columns: 60px 1fr;
    }

    .day-name {
      font-size: 0.65rem;
    }

    .day-number {
      font-size: 1rem;
    }

    .spanning-all-day-event {
      font-size: 0.7rem;
      padding: 0 0.4rem;
      height: 20px;
    }
  }
</style>
