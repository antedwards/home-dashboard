<script lang="ts">
  import { onMount } from 'svelte';
  import {
    getHoursOfDay,
    formatTime12Hour,
    calculateEventPosition,
  } from '../utils/calendar';
  import type { CalendarEvent } from '../types';
  import AvatarGroup from './AvatarGroup.svelte';
  import { getEventBackgroundColor, getEventBorderColor } from '../utils/event-styles';

  interface Props {
    columns: Array<{
      date: Date;
      events: CalendarEvent[];
      isToday?: boolean;
    }>;
    onEventClick?: (event: CalendarEvent) => void;
    onTimeSlotClick?: (date: Date, hour: number) => void;
    maxVisibleEvents?: number;
    containerRef?: HTMLDivElement;
  }

  let {
    columns,
    onEventClick,
    onTimeSlotClick,
    maxVisibleEvents = 3,
    containerRef = $bindable(),
  }: Props = $props();

  const hours = getHoursOfDay();

  let showOverflowModal = $state(false);
  let overflowEvents = $state<CalendarEvent[]>([]);
  let overflowTime = $state('');

  interface EventLayout {
    event: CalendarEvent;
    column: number;
    totalColumns: number;
    position: { top: number; height: number };
    isLongEvent: boolean;
  }

  function isLongEvent(event: CalendarEvent): boolean {
    const start = new Date(event.start);
    const end = new Date(event.end);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    // Consider events over 6 hours as "long"
    return durationHours >= 6;
  }

  // Calculate layout for overlapping events in a column
  function getEventsWithLayoutForColumn(columnEvents: CalendarEvent[]): EventLayout[] {
    const layouts: EventLayout[] = [];
    const timedEvents = columnEvents.filter(e => !e.allDay);
    const sorted = [...timedEvents].sort((a, b) =>
      new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    // Group overlapping events
    const groups: CalendarEvent[][] = [];
    for (const event of sorted) {
      const eventStart = new Date(event.start).getTime();
      const eventEnd = new Date(event.end).getTime();

      let foundGroup = false;
      for (const group of groups) {
        const overlaps = group.some(e => {
          const eStart = new Date(e.start).getTime();
          const eEnd = new Date(e.end).getTime();
          return eventStart < eEnd && eventEnd > eStart;
        });
        if (overlaps) {
          group.push(event);
          foundGroup = true;
          break;
        }
      }
      if (!foundGroup) {
        groups.push([event]);
      }
    }

    // Calculate columns for each group
    for (const group of groups) {
      const eventColumns: CalendarEvent[][] = [];
      for (const event of group) {
        const eventStart = new Date(event.start).getTime();
        const eventEnd = new Date(event.end).getTime();

        let columnIndex = 0;
        for (let i = 0; i < eventColumns.length; i++) {
          const columnFree = eventColumns[i].every(e => {
            const eEnd = new Date(e.end).getTime();
            return eEnd <= eventStart;
          });
          if (columnFree) {
            columnIndex = i;
            break;
          }
          columnIndex = i + 1;
        }

        if (!eventColumns[columnIndex]) {
          eventColumns[columnIndex] = [];
        }
        eventColumns[columnIndex].push(event);

        layouts.push({
          event,
          column: columnIndex,
          totalColumns: Math.min(eventColumns.length, maxVisibleEvents),
          position: calculateEventPosition(new Date(event.start), new Date(event.end)),
          isLongEvent: isLongEvent(event)
        });
      }
    }

    return layouts;
  }

  function getEventsAtPositionForColumn(columnEvents: CalendarEvent[], topPosition: number): CalendarEvent[] {
    const layouts = getEventsWithLayoutForColumn(columnEvents);
    return layouts.filter(layout => {
      const eventTop = layout.position.top;
      const eventBottom = eventTop + layout.position.height;
      return topPosition >= eventTop && topPosition < eventBottom;
    }).map(layout => layout.event);
  }

  function handleEventClick(event: CalendarEvent, e: MouseEvent) {
    e.stopPropagation();
    if (onEventClick) {
      onEventClick(event);
    }
  }

  function handleOverflowClick(events: CalendarEvent[], time: string) {
    overflowEvents = events;
    overflowTime = time;
    showOverflowModal = true;
  }

  function formatEventTime(event: CalendarEvent): string {
    const start = new Date(event.start);
    const end = new Date(event.end);

    if (event.allDay) {
      return 'All day';
    }

    // Check if this is a middle day of a multi-day event (midnight to end of day)
    const isFullDaySegment =
      start.getHours() === 0 &&
      start.getMinutes() === 0 &&
      end.getHours() === 23 &&
      end.getMinutes() === 59;

    if (isFullDaySegment) {
      return ''; // Don't show time for middle days
    }

    // Check if this is the start of a multi-day event (ends at 11:59 PM)
    const isStartDay =
      end.getHours() === 23 &&
      end.getMinutes() === 59 &&
      (start.getHours() !== 0 || start.getMinutes() !== 0);

    if (isStartDay) {
      return start.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    }

    // Check if this is the end of a multi-day event (starts at midnight)
    const isEndDay =
      start.getHours() === 0 &&
      start.getMinutes() === 0 &&
      (end.getHours() !== 23 || end.getMinutes() !== 59);

    if (isEndDay) {
      return end.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    }

    // Single day event - show both times
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

<div class="time-grid" style="grid-template-columns: 80px repeat({columns.length}, 1fr);">
  <!-- Time labels column -->
  <div class="time-column">
    {#each hours as hour}
      <div class="time-label">
        <span>{formatTime12Hour(hour)}</span>
      </div>
    {/each}
  </div>

  <!-- Event columns -->
  {#each columns as col}
    {@const eventsWithLayout = getEventsWithLayoutForColumn(col.events)}
    <div class="day-column" class:today-column={col.isToday}>
      <!-- Hour slots -->
      {#each hours as hour}
        <button
          class="time-slot"
          onclick={() => onTimeSlotClick?.(col.date, hour)}
          type="button"
        >
          <!-- Empty slot for clicking -->
        </button>
      {/each}

      <!-- Timed events with overlap handling -->
      <div class="timed-events">
        {#each eventsWithLayout as layout}
          {@const isVisible = layout.column < maxVisibleEvents}
          {@const eventsAtPosition = getEventsAtPositionForColumn(col.events, layout.position.top)}
          {@const hiddenCount = eventsAtPosition.length - maxVisibleEvents}
          {@const shouldShowOverflow = layout.column === maxVisibleEvents - 1 && hiddenCount > 0}

          {#if isVisible}
            {@const eventTime = formatEventTime(layout.event)}
            <button
              class="event-block timed-event"
              style="
                border-left-color: {getEventBorderColor(layout.event.color)};
                background-color: {getEventBackgroundColor(layout.event.color)};
                top: {layout.position.top}px;
                height: {layout.position.height}px;
                min-height: {Math.max(layout.position.height, 20)}px;
                left: calc({(layout.column / layout.totalColumns) * 100}% + 2px);
                width: calc({(1 / layout.totalColumns) * 100}% - 4px);
              "
              onclick={(e) => handleEventClick(layout.event, e)}
              type="button"
              title={layout.event.title}
            >
              <div class="event-content">
                <div class="event-title">{layout.event.title}</div>
                {#if layout.position.height > 30 && eventTime}
                  <div class="event-time">{eventTime}</div>
                {/if}
                {#if layout.event.location && layout.position.height > 45}
                  <div class="event-location">📍 {layout.event.location}</div>
                {/if}
                {#if layout.event.attendees && layout.event.attendees.length > 0 && layout.position.height > 60}
                  <div class="event-attendees">
                    <AvatarGroup users={layout.event.attendees} max={3} size="xs" />
                  </div>
                {/if}
              </div>
            </button>

            {#if shouldShowOverflow}
              <button
                class="overflow-indicator"
                style="
                  top: {layout.position.top}px;
                  height: {layout.position.height}px;
                  min-height: {Math.max(layout.position.height, 20)}px;
                  right: 2px;
                "
                onclick={(e) => {
                  e.stopPropagation();
                  handleOverflowClick(eventsAtPosition, formatEventTime(layout.event));
                }}
                type="button"
              >
                <span class="overflow-text">+{hiddenCount}</span>
              </button>
            {/if}
          {/if}
        {/each}
      </div>
    </div>
  {/each}
</div>

<!-- Overflow events modal -->
{#if showOverflowModal}
  <div class="modal-overlay" onclick={() => showOverflowModal = false}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h3>Events at {overflowTime}</h3>
        <button class="modal-close" onclick={() => showOverflowModal = false}>✕</button>
      </div>
      <div class="modal-body">
        {#each overflowEvents as event}
          {@const modalEventTime = formatEventTime(event)}
          <button
            class="modal-event"
            style="border-left: 4px solid {event.color || '#3b82f6'};"
            onclick={() => {
              showOverflowModal = false;
              if (onEventClick) onEventClick(event);
            }}
            type="button"
          >
            <div class="modal-event-title">{event.title}</div>
            {#if modalEventTime}
              <div class="modal-event-time">{modalEventTime}</div>
            {/if}
            {#if event.location}
              <div class="modal-event-location">📍 {event.location}</div>
            {/if}
            {#if event.attendees && event.attendees.length > 0}
              <div class="modal-event-attendees">
                <AvatarGroup users={event.attendees} max={5} size="sm" />
              </div>
            {/if}
            {#if event.description}
              <div class="modal-event-description">{event.description}</div>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .time-grid {
    display: grid;
    position: relative;
    min-height: 100%;
  }

  .time-column {
    border-right: 2px solid #e0e0e0;
    background: #fafafa;
  }

  .time-label {
    height: 60px;
    box-sizing: border-box;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    padding: 0 1rem 0 0;
    font-size: 0.875rem;
    font-weight: 500;
    color: #666;
    border-bottom: 1px solid #f0f0f0;
    position: relative;
  }

  .time-label span {
    position: relative;
    top: -0.6em;
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
    box-sizing: border-box;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    border: none;
    background: transparent;
    width: 100%;
    padding: 0;
    transition: background-color 0.2s;
    display: block;
  }

  .time-slot:hover {
    background: rgba(59, 130, 246, 0.05);
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
    color: #333;
    font-size: 0.75rem;
    cursor: pointer;
    border: none;
    border-left: 4px solid;
    text-align: left;
    overflow: hidden;
    transition: filter 0.2s, transform 0.2s;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .event-block:hover {
    filter: brightness(1.1);
    transform: scale(1.02);
    z-index: 10;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  }

  .timed-event {
    position: absolute;
  }

  .overflow-indicator {
    position: absolute;
    width: 32px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: none;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.7rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    transition: all 0.2s;
    z-index: 100;
    pointer-events: auto;
  }

  .overflow-indicator:hover {
    background: rgba(0, 0, 0, 0.9);
    transform: scale(1.1);
  }

  .overflow-indicator:active {
    transform: scale(0.95);
  }

  .overflow-text {
    pointer-events: none;
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
    color: #666;
  }

  .event-location {
    font-size: 0.65rem;
    color: #666;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .event-attendees {
    margin-top: 0.25rem;
  }

  .modal-event-attendees {
    margin-top: 0.5rem;
  }

  /* Modal styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 1rem;
    animation: fadeIn 0.2s ease-in;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    max-width: 500px;
    width: 100%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #333;
  }

  .modal-close {
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    font-size: 1.5rem;
    color: #666;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-close:hover {
    background: #f0f0f0;
    color: #333;
  }

  .modal-body {
    padding: 1rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .modal-event {
    padding: 1rem;
    background: #f9f9f9;
    border-radius: 8px;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
  }

  .modal-event:hover {
    background: #f0f0f0;
    transform: translateX(4px);
  }

  .modal-event-title {
    font-weight: 600;
    font-size: 1rem;
    color: #333;
    margin-bottom: 0.25rem;
  }

  .modal-event-time {
    font-size: 0.875rem;
    color: #666;
    margin-bottom: 0.5rem;
  }

  .modal-event-location {
    font-size: 0.875rem;
    color: #666;
    margin-bottom: 0.25rem;
  }

  .modal-event-description {
    font-size: 0.875rem;
    color: #666;
    line-height: 1.4;
    margin-top: 0.5rem;
  }
</style>
