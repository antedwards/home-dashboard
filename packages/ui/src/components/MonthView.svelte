<script lang="ts">
  import { generateCalendarMonth, getDayName, type CalendarDay } from '../utils/calendar';
  import type { CalendarEvent } from '../types';
  import AvatarGroup from './AvatarGroup.svelte';
  import { getEventBackgroundColor, getEventBorderColor } from '../utils/event-styles';

  interface Props {
    year?: number;
    month?: number;
    events?: CalendarEvent[];
    onDateClick?: (date: Date) => void;
    onEventClick?: (event: CalendarEvent) => void;
    onDayHeaderClick?: (date: Date) => void;
    currentUserEmail?: string;
  }

  const now = new Date();
  let {
    year = now.getFullYear(),
    month = now.getMonth(),
    events = [],
    onDateClick,
    onEventClick,
    onDayHeaderClick,
    currentUserEmail,
  }: Props = $props();

  const calendarMonth = $derived(generateCalendarMonth(year, month));

  interface EventSpan {
    event: CalendarEvent;
    startDayIndex: number; // Index in the week
    span: number; // Number of days to span
    weekIndex: number; // Which week row
    isStart: boolean; // Is this the start of the event?
    isEnd: boolean; // Is this the end of the event?
    isFirstDayOfWeek: boolean; // Is this the first day of the week for this event?
    row: number; // Which row in the week (for stacking)
  }

  // Calculate event spans for the month
  function getEventSpans(): Map<string, EventSpan[]> {
    const spansByWeekDay = new Map<string, EventSpan[]>();

    calendarMonth.weeks.forEach((week, weekIndex) => {
      const weekSpans: EventSpan[] = [];

      week.days.forEach((day, dayIndex) => {
        events.forEach((event) => {
          const eventStart = new Date(event.start);
          const eventEnd = new Date(event.end);

          // Normalize to day boundaries
          const eventStartDay = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());

          // If event ends at exactly midnight, it doesn't include that day (it ends on the previous day)
          const eventEndForDisplay = eventEnd.getHours() === 0 && eventEnd.getMinutes() === 0 && eventEnd.getSeconds() === 0
            ? new Date(eventEnd.getTime() - 1)
            : eventEnd;
          const eventEndDay = new Date(eventEndForDisplay.getFullYear(), eventEndForDisplay.getMonth(), eventEndForDisplay.getDate());
          const currentDay = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate());

          // Check if event spans this day
          if (currentDay >= eventStartDay && currentDay <= eventEndDay) {
            // Check if this is the first day we're showing this event (could start before month)
            const isFirstDayInWeek = dayIndex === 0 || currentDay.getTime() === eventStartDay.getTime();
            const isStartOfEvent = currentDay.getTime() === eventStartDay.getTime();

            // Only add the event if it starts on this day in this week
            if (isFirstDayInWeek || isStartOfEvent) {
              // Calculate how many days to span in this week
              let span = 1;
              const isLastDayInWeek = dayIndex === 6;
              const isEndOfEvent = currentDay.getTime() === eventEndDay.getTime();

              if (!isLastDayInWeek && !isEndOfEvent) {
                // Count consecutive days in this week
                for (let i = dayIndex + 1; i < week.days.length; i++) {
                  const nextDay = new Date(week.days[i].date.getFullYear(), week.days[i].date.getMonth(), week.days[i].date.getDate());
                  if (nextDay <= eventEndDay) {
                    span++;
                  } else {
                    break;
                  }
                }
              }

              weekSpans.push({
                event,
                startDayIndex: dayIndex,
                span,
                weekIndex,
                isStart: isStartOfEvent,
                isEnd: currentDay.getTime() === eventEndDay.getTime() || dayIndex + span - 1 === 6,
                isFirstDayOfWeek: dayIndex === 0,
                row: 0 // Will be calculated below
              });
            }
          }
        });
      });

      // Sort spans by start time to ensure earlier events appear in earlier rows
      weekSpans.sort((a, b) => {
        const aTime = new Date(a.event.start).getTime();
        const bTime = new Date(b.event.start).getTime();
        return aTime - bTime;
      });

      // Calculate row positions for this week to avoid overlaps
      const rows: Array<{ endDay: number }> = [];
      for (const span of weekSpans) {
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

        span.row = rowIndex;
      }

      // Store spans by day
      week.days.forEach((day, dayIndex) => {
        const dayKey = `${weekIndex}-${dayIndex}`;
        const daySpans = weekSpans.filter(s => s.startDayIndex === dayIndex);
        spansByWeekDay.set(dayKey, daySpans);
      });
    });

    return spansByWeekDay;
  }

  const eventSpans = $derived(getEventSpans());

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
          <span class="day-name-full">{getDayName(dayOfWeek, false)}</span>
          <span class="day-name-short">{getDayName(dayOfWeek, true)}</span>
        </div>
      {/each}
    </div>

    <!-- Calendar grid -->
    <div class="days-grid">
      {#each calendarMonth.weeks as week, weekIndex}
        <div class="week-row">
          {#each week.days as day, dayIndex}
            <button
              class="day-cell"
              class:today={day.isToday}
              class:other-month={!day.isCurrentMonth}
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
            </button>
          {/each}

          <!-- Overlaid spanning events for this week -->
          <div class="week-events-overlay">
            {#each week.days as day, dayIndex}
              {@const dayKey = `${weekIndex}-${dayIndex}`}
              {@const spans = eventSpans.get(dayKey) || []}
              {#each spans.slice(0, 3) as span}
                {@const isOwnEvent = currentUserEmail && span.event.organizerEmail?.toLowerCase() === currentUserEmail.toLowerCase()}
                <button
                  class="spanning-event"
                  class:event-start={span.isStart}
                  class:event-end={span.isEnd}
                  class:own-event={isOwnEvent}
                  style="
                    border-left-color: {getEventBorderColor(span.event.color)};
                    background-color: {getEventBackgroundColor(span.event.color)};
                    left: calc({span.startDayIndex} * (100% / 7));
                    width: calc({span.span} * (100% / 7));
                    top: calc(32px + {span.row} * 22px);
                  "
                  onclick={(e) => handleEventClick(span.event, e)}
                  type="button"
                  title={span.event.title}
                >
                  {#if span.isStart || span.isFirstDayOfWeek}
                    {#if span.isStart && !span.event.allDay}
                      <span class="event-time">
                        {new Date(span.event.start).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    {/if}
                    <span class="event-title">{span.event.title}</span>
                    {#if span.event.attendees && span.event.attendees.length > 0}
                      <AvatarGroup users={span.event.attendees} max={2} size="xs" />
                    {/if}
                  {:else}
                    <span class="event-continuation">→</span>
                  {/if}
                </button>
              {/each}
            {/each}
          </div>
        </div>
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
    display: flex;
    flex-direction: column;
    gap: 1px;
    background: #e0e0e0;
  }

  .week-row {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    background: #e0e0e0;
    position: relative;
    min-height: 100px;
  }

  .week-events-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 10;
  }

  .spanning-event {
    position: absolute;
    height: 20px;
    padding: 0 0.375rem;
    border-radius: 3px;
    font-size: 0.75rem;
    color: #333;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    border: none;
    border-left: 3px solid;
    cursor: pointer;
    transition: background-color 0.2s, box-shadow 0.2s;
    display: flex;
    gap: 0.25rem;
    align-items: center;
    pointer-events: auto;
    margin: 0 2px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .spanning-event:hover {
    background-color: rgba(255, 255, 255, 0.5) !important;
    z-index: 20;
    box-shadow: 0 2px 3px rgba(0, 0, 0, 0.15);
  }

  .spanning-event.event-start {
    border-top-left-radius: 3px;
    border-bottom-left-radius: 3px;
  }

  .spanning-event.event-end {
    border-top-right-radius: 3px;
    border-bottom-right-radius: 3px;
  }

  .event-continuation {
    font-weight: 600;
  }

  .day-cell {
    background: white;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    cursor: pointer;
    border: none;
    transition: background-color 0.2s;
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

  .event-time {
    font-weight: 600;
    flex-shrink: 0;
    color: #666;
  }

  .event-title {
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    .day-name-full {
      display: none;
    }

    .day-name-short {
      display: block;
    }

    .week-row {
      min-height: 80px;
    }

    .day-cell {
      padding: 0.25rem;
    }

    .event-time {
      display: none;
    }

    .spanning-event {
      font-size: 0.7rem;
      height: 18px;
    }
  }

  @media (max-width: 480px) {
    .week-row {
      min-height: 60px;
    }

    .spanning-event {
      font-size: 0.65rem;
      height: 16px;
    }
  }
</style>
