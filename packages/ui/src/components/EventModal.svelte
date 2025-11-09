<script lang="ts">
  import type { CalendarEvent } from '../types';
  import Modal from './Modal.svelte';

  interface Props {
    open: boolean;
    event?: CalendarEvent | null;
    initialDate?: Date;
    onClose: () => void;
    onSave: (event: Partial<CalendarEvent>) => void;
    onDelete?: (id: string) => void;
  }

  let {
    open = $bindable(false),
    event = null,
    initialDate = new Date(),
    onClose,
    onSave,
    onDelete,
  }: Props = $props();

  const isEditing = $derived(!!event);

  // Form state
  let title = $state('');
  let description = $state('');
  let startDate = $state('');
  let startTime = $state('');
  let endDate = $state('');
  let endTime = $state('');
  let allDay = $state(false);
  let location = $state('');
  let color = $state('#3b82f6');
  let category = $state('');

  // Initialize form when modal opens
  $effect(() => {
    if (open) {
      if (event) {
        // Editing existing event
        const start = new Date(event.start);
        const end = new Date(event.end);

        title = event.title;
        description = event.description || '';
        startDate = start.toISOString().split('T')[0];
        startTime = start.toTimeString().slice(0, 5);
        endDate = end.toISOString().split('T')[0];
        endTime = end.toTimeString().slice(0, 5);
        allDay = event.all_day;
        location = event.location || '';
        color = event.color || '#3b82f6';
        category = event.category || '';
      } else {
        // Creating new event
        const start = initialDate || new Date();
        const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour

        title = '';
        description = '';
        startDate = start.toISOString().split('T')[0];
        startTime = start.toTimeString().slice(0, 5);
        endDate = end.toISOString().split('T')[0];
        endTime = end.toTimeString().slice(0, 5);
        allDay = false;
        location = '';
        color = '#3b82f6';
        category = '';
      }
    }
  });

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();

    if (!title.trim()) {
      return;
    }

    let start: Date;
    let end: Date;

    if (allDay) {
      start = new Date(startDate + 'T00:00:00');
      end = new Date(endDate + 'T23:59:59');
    } else {
      start = new Date(startDate + 'T' + startTime);
      end = new Date(endDate + 'T' + endTime);
    }

    const eventData: Partial<CalendarEvent> = {
      ...(event?.id && { id: event.id }),
      title: title.trim(),
      description: description.trim() || undefined,
      start: start.toISOString(),
      end: end.toISOString(),
      all_day: allDay,
      location: location.trim() || undefined,
      color,
      category: category.trim() || undefined,
    };

    onSave(eventData);
    open = false;
  }

  function handleDelete() {
    if (event?.id && onDelete) {
      if (confirm('Are you sure you want to delete this event?')) {
        onDelete(event.id);
        open = false;
      }
    }
  }

  function handleCancel() {
    open = false;
    onClose();
  }

  const colorOptions = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Green', value: '#10b981' },
    { name: 'Yellow', value: '#f59e0b' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Orange', value: '#f97316' },
  ];
</script>

<Modal bind:open {onClose}>
  <form class="event-form" onsubmit={handleSubmit}>
    <div class="form-header">
      <h2>{isEditing ? 'Edit Event' : 'New Event'}</h2>
    </div>

    <div class="form-body">
      <!-- Title -->
      <div class="form-group">
        <label for="event-title">
          Title <span class="required">*</span>
        </label>
        <input
          id="event-title"
          type="text"
          bind:value={title}
          placeholder="Event title"
          required
          autofocus
        />
      </div>

      <!-- All Day Toggle -->
      <div class="form-group checkbox-group">
        <label>
          <input type="checkbox" bind:checked={allDay} />
          <span>All day event</span>
        </label>
      </div>

      <!-- Start Date/Time -->
      <div class="form-row">
        <div class="form-group">
          <label for="start-date">Start Date</label>
          <input id="start-date" type="date" bind:value={startDate} required />
        </div>
        {#if !allDay}
          <div class="form-group">
            <label for="start-time">Start Time</label>
            <input id="start-time" type="time" bind:value={startTime} required />
          </div>
        {/if}
      </div>

      <!-- End Date/Time -->
      <div class="form-row">
        <div class="form-group">
          <label for="end-date">End Date</label>
          <input id="end-date" type="date" bind:value={endDate} required />
        </div>
        {#if !allDay}
          <div class="form-group">
            <label for="end-time">End Time</label>
            <input id="end-time" type="time" bind:value={endTime} required />
          </div>
        {/if}
      </div>

      <!-- Location -->
      <div class="form-group">
        <label for="event-location">Location</label>
        <input
          id="event-location"
          type="text"
          bind:value={location}
          placeholder="Add location"
        />
      </div>

      <!-- Description -->
      <div class="form-group">
        <label for="event-description">Description</label>
        <textarea
          id="event-description"
          bind:value={description}
          placeholder="Add description"
          rows="3"
        ></textarea>
      </div>

      <!-- Color -->
      <div class="form-group">
        <label>Color</label>
        <div class="color-picker">
          {#each colorOptions as colorOption}
            <button
              type="button"
              class="color-swatch"
              class:selected={color === colorOption.value}
              style="background-color: {colorOption.value};"
              onclick={() => (color = colorOption.value)}
              title={colorOption.name}
            >
              {#if color === colorOption.value}
                <span class="checkmark">✓</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <!-- Category -->
      <div class="form-group">
        <label for="event-category">Category</label>
        <input
          id="event-category"
          type="text"
          bind:value={category}
          placeholder="e.g., Work, Personal, Family"
        />
      </div>
    </div>

    <div class="form-footer">
      <div class="footer-left">
        {#if isEditing && onDelete}
          <button type="button" class="btn-danger" onclick={handleDelete}>
            Delete
          </button>
        {/if}
      </div>
      <div class="footer-right">
        <button type="button" class="btn-secondary" onclick={handleCancel}>
          Cancel
        </button>
        <button type="submit" class="btn-primary">
          {isEditing ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  </form>
</Modal>

<style>
  .event-form {
    width: 100%;
    max-width: 600px;
    display: flex;
    flex-direction: column;
    max-height: 90vh;
  }

  .form-header {
    padding: 1.5rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .form-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #333;
  }

  .form-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    font-size: 0.875rem;
    color: #333;
  }

  .required {
    color: #ef4444;
  }

  .form-group input[type='text'],
  .form-group input[type='date'],
  .form-group input[type='time'],
  .form-group textarea {
    width: 100%;
    padding: 0.625rem 0.875rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    font-family: inherit;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-group textarea {
    resize: vertical;
    min-height: 60px;
  }

  .checkbox-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-weight: normal;
  }

  .checkbox-group input[type='checkbox'] {
    width: 1.125rem;
    height: 1.125rem;
    cursor: pointer;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .color-picker {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .color-swatch {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .color-swatch:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .color-swatch.selected {
    border-color: #333;
    box-shadow: 0 0 0 2px white, 0 0 0 4px #333;
  }

  .checkmark {
    color: white;
    font-size: 1.25rem;
    font-weight: bold;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .form-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-top: 1px solid #e0e0e0;
    background: #f9f9f9;
  }

  .footer-left,
  .footer-right {
    display: flex;
    gap: 0.75rem;
  }

  .btn-primary,
  .btn-secondary,
  .btn-danger {
    padding: 0.625rem 1.25rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
  }

  .btn-secondary {
    background: white;
    color: #666;
    border: 1px solid #d1d5db;
  }

  .btn-secondary:hover {
    background: #f9f9f9;
  }

  .btn-danger {
    background: #ef4444;
    color: white;
  }

  .btn-danger:hover {
    background: #dc2626;
  }

  @media (max-width: 640px) {
    .event-form {
      max-width: 100%;
    }

    .form-row {
      grid-template-columns: 1fr;
    }
  }
</style>
