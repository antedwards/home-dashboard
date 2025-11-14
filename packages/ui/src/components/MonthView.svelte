<script lang="ts">
  import { generateCalendarMonth, getDayName, type CalendarDay } from '../utils/calendar';
  import type { CalendarEvent } from '../types';

  interface Props {
    year?: number;
    month?: number;
    events?: CalendarEvent[];
    onDateClick?: (date: Date) => void;
    onEventClick?: (event: CalendarEvent) => void;
    onDayHeaderClick?: (date: Date) => void;
  }

  const now = new Date();
  let {
    year = now.getFullYear(),
    month = now.getMonth(),
    events = [],
    onDateClick,
    onEventClick,
    onDayHeaderClick,
  }: Props = $props();

  const calendarMonth = $derived(generateCalendarMonth(year, month));

  function getEventsForDay(date: Date): CalendarEvent[] {
    return events.filter((event) => {
      const eventStart = new Date(event.start);
      return (
        eventStart.getFullYear() === date.getFullYear() &&
        eventStart.getMonth() === date.getMonth() &&
        eventStart.getDate() === date.getDate()
      );
    });
  }

  function handleDateClick(day: CalendarDay) {
    if (onDateClick) {
      onDateClick(day.date);
    }
  }

  function handleDayHeaderClick(day: CalendarDay, e: MouseEvent) {
    e.stopPropagation();
    if (onDayHeaderClick) {
      onDayHeaderClick(day.date);
    }
  }

  function handleEventClick(event: CalendarEvent, e: MouseEvent) {
    e.stopPropagation();
    if (onEventClick) {
      onEventClick(event);
    }
  }
</script>

<div class="month-view">
  <div class="month-header">
    <h2>{calendarMonth.monthName} {calendarMonth.year}</h2>
  </div>

  <div class="calendar-grid">
    <!-- Day headers -->
    <div class="day-headers">
      {#each [0, 1, 2, 3, 4, 5, 6] as dayOfWeek}
        <div class="day-header">
          <span class="day-name-full">{getDayName(dayOfWeek)}</span>
          <span class="day-name-short">{getDayName(dayOfWeek, true)}</span>
        </div>
      {/each}
    </div>

    <!-- Calendar grid -->
    <div class="days-grid">
      {#each calendarMonth.weeks as week}
        {#each week.days as day}
          {@const dayEvents = getEventsForDay(day.date)}
          <button
            class="day-cell"
            class:today={day.isToday}
            class:other-month={!day.isCurrentMonth}
            class:has-events={dayEvents.length > 0}
            onclick={() => handleDateClick(day)}
            type="button"
          >
            <div
              class="day-number-button"
              class:today-number={day.isToday}
              onclick={(e) => handleDayHeaderClick(day, e)}
              role="button"
              tabindex="0"
              onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDayHeaderClick(day, e); }}
              title="Click to create an all-day event"
            >
              <div class="day-number">{day.dayOfMonth}</div>
            </div>
            <div class="day-events">
              {#each dayEvents.slice(0, 3) as event}
                <button
                  class="event-pill"
                  style="background-color: #3b82f6;"
                  onclick={(e) => handleEventClick(event, e)}
                  type="button"
                  title={event.title}
                >
                  <span class="event-time">
                    {new Date(event.start).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                  <span class="event-title">{event.title}</span>
                </button>
              {/each}
              {#if dayEvents.length > 3}
                <div class="more-events">+{dayEvents.length - 3} more</div>
              {/if}
            </div>
          </button>
        {/each}
      {/each}
    </div>
  </div>
</div>

<style>
  .month-view {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: white;
  }

  .month-header {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .month-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #333;
  }

  .calendar-grid {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .day-headers {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    background: #f9f9f9;
    border-bottom: 2px solid #e0e0e0;
  }

  .day-header {
    padding: 0.75rem;
    text-align: center;
    font-weight: 600;
    font-size: 0.875rem;
    color: #666;
    text-transform: uppercase;
  }

  .day-name-short {
    display: none;
  }

  .days-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    grid-auto-rows: 1fr;
    gap: 1px;
    background: #e0e0e0;
  }

  .day-cell {
    background: white;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    cursor: pointer;
    border: none;
    transition: background-color 0.2s;
    min-height: 100px;
    overflow: hidden;
  }

  .day-cell:hover {
    background: #f9f9f9;
  }

  .day-cell.today {
    background: #eff6ff;
  }

  .day-number-button {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    transition: opacity 0.2s;
    margin-bottom: 0.25rem;
  }

  .day-number-button:hover {
    opacity: 0.7;
  }

  .day-number-button.today-number {
    background: #3b82f6;
    color: white;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .day-number-button.today-number:hover {
    opacity: 0.9;
  }

  .day-cell.other-month {
    opacity: 0.4;
  }

  .day-cell.other-month .day-number {
    color: #999;
  }

  .day-number {
    font-size: 0.875rem;
    font-weight: 600;
    color: #333;
    pointer-events: none;
  }

  .day-events {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .event-pill {
    width: 100%;
    padding: 0.125rem 0.375rem;
    border-radius: 3px;
    font-size: 0.75rem;
    color: white;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    border: none;
    cursor: pointer;
    transition: opacity 0.2s;
    display: flex;
    gap: 0.25rem;
  }

  .event-pill:hover {
    opacity: 0.9;
  }

  .event-time {
    font-weight: 600;
    flex-shrink: 0;
  }

  .event-title {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .more-events {
    font-size: 0.7rem;
    color: #666;
    font-weight: 600;
    margin-top: 0.125rem;
  }

  @media (max-width: 768px) {
    .day-name-full {
      display: none;
    }

    .day-name-short {
      display: block;
    }

    .day-cell {
      min-height: 80px;
      padding: 0.25rem;
    }

    .event-time {
      display: none;
    }
  }

  @media (max-width: 480px) {
    .day-cell {
      min-height: 60px;
    }

    .event-pill {
      font-size: 0.65rem;
    }
  }
</style>
