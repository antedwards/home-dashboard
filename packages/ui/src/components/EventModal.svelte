<script lang="ts">
  import type { CalendarEvent, User, Category } from '../types';
  import Modal from './Modal.svelte';

  interface Props {
    open: boolean;
    event?: CalendarEvent | null;
    initialDate?: Date;
    familyMembers?: User[];
    categories?: Category[];
    onClose: () => void;
    onSave: (event: Partial<CalendarEvent>) => void;
    onDelete?: (id: string) => void;
    onCategoryCreate?: (name: string, color: string) => Promise<Category>;
  }

  let {
    open = $bindable(false),
    event = null,
    initialDate = new Date(),
    familyMembers = [],
    categories = [],
    onClose,
    onSave,
    onDelete,
    onCategoryCreate,
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
  let selectedCategoryId = $state<string | null>(null);
  let selectedAttendeeIds = $state<string[]>([]);

  // For creating new category
  let showNewCategoryInput = $state(false);
  let newCategoryName = $state('');
  let newCategoryColor = $state('#3b82f6');

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
        selectedCategoryId = event.categoryId || null;
        selectedAttendeeIds = event.attendeeIds || [];
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
        selectedCategoryId = null;
        selectedAttendeeIds = [];
      }
      showNewCategoryInput = false;
      newCategoryName = '';
      newCategoryColor = '#3b82f6';
    }
  });

  function toggleAttendee(userId: string) {
    if (selectedAttendeeIds.includes(userId)) {
      selectedAttendeeIds = selectedAttendeeIds.filter(id => id !== userId);
    } else {
      selectedAttendeeIds = [...selectedAttendeeIds, userId];
    }
  }

  function selectCategory(categoryId: string) {
    selectedCategoryId = categoryId;
  }

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  async function handleCreateCategory() {
    if (!newCategoryName.trim() || !onCategoryCreate) return;

    const newCategory = await onCategoryCreate(newCategoryName.trim(), newCategoryColor);
    selectedCategoryId = newCategory.id;
    showNewCategoryInput = false;
    newCategoryName = '';
    newCategoryColor = '#3b82f6';
  }

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
      categoryId: selectedCategoryId || undefined,
      attendeeIds: selectedAttendeeIds.length > 0 ? selectedAttendeeIds : undefined,
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

      <!-- Family Members -->
      {#if familyMembers.length > 0}
        <div class="form-group">
          <label>Family Members</label>
          <div class="chip-selector">
            {#each familyMembers as member}
              <button
                type="button"
                class="avatar-chip"
                class:selected={selectedAttendeeIds.includes(member.id)}
                style="--member-color: {member.color};"
                onclick={() => toggleAttendee(member.id)}
                title={member.name}
              >
                <span class="avatar-initials" style="background-color: {member.color};">
                  {getInitials(member.name)}
                </span>
                <span class="avatar-name">{member.name}</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Categories -->
      <div class="form-group">
        <label>Category</label>
        <div class="chip-selector">
          {#each categories as cat}
            <button
              type="button"
              class="category-chip"
              class:selected={selectedCategoryId === cat.id}
              style="background-color: {selectedCategoryId === cat.id ? cat.color : 'transparent'}; border-color: {cat.color}; color: {selectedCategoryId === cat.id ? 'white' : cat.color};"
              onclick={() => selectCategory(cat.id)}
            >
              {cat.name}
            </button>
          {/each}

          {#if showNewCategoryInput}
            <div class="new-category-input">
              <input
                type="text"
                bind:value={newCategoryName}
                placeholder="Category name"
                class="small-input"
              />
              <div class="mini-color-picker">
                {#each colorOptions.slice(0, 5) as colorOption}
                  <button
                    type="button"
                    class="mini-color-swatch"
                    class:selected={newCategoryColor === colorOption.value}
                    style="background-color: {colorOption.value};"
                    onclick={() => (newCategoryColor = colorOption.value)}
                    title={colorOption.name}
                  ></button>
                {/each}
              </div>
              <button
                type="button"
                class="btn-create-category"
                onclick={handleCreateCategory}
              >
                Add
              </button>
              <button
                type="button"
                class="btn-cancel-category"
                onclick={() => showNewCategoryInput = false}
              >
                ✕
              </button>
            </div>
          {:else}
            <button
              type="button"
              class="add-chip"
              onclick={() => showNewCategoryInput = true}
              title="Add new category"
            >
              + New
            </button>
          {/if}
        </div>
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
    width: 900px;
    max-width: calc(90vw - 2rem);
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
    box-sizing: border-box;
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

  /* Chip Selectors */
  .chip-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }

  .avatar-chip {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    border: 2px solid #e0e0e0;
    border-radius: 20px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.875rem;
  }

  .avatar-chip:hover {
    border-color: var(--member-color, #3b82f6);
    background: rgba(59, 130, 246, 0.05);
  }

  .avatar-chip.selected {
    border-color: var(--member-color, #3b82f6);
    background: rgba(59, 130, 246, 0.1);
    font-weight: 600;
  }

  .avatar-initials {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .avatar-name {
    color: #333;
  }

  .category-chip {
    padding: 0.375rem 0.875rem;
    border: 2px solid;
    border-radius: 16px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .category-chip:hover {
    opacity: 0.8;
    transform: translateY(-1px);
  }

  .category-chip.selected {
    font-weight: 600;
  }

  .add-chip {
    padding: 0.375rem 0.875rem;
    border: 2px dashed #d1d5db;
    border-radius: 16px;
    background: transparent;
    color: #666;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .add-chip:hover {
    border-color: #3b82f6;
    color: #3b82f6;
    background: rgba(59, 130, 246, 0.05);
  }

  .new-category-input {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border: 2px solid #3b82f6;
    border-radius: 8px;
    background: #f9fafb;
  }

  .small-input {
    padding: 0.25rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 0.875rem;
    width: 120px;
  }

  .mini-color-picker {
    display: flex;
    gap: 0.25rem;
  }

  .mini-color-swatch {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
  }

  .mini-color-swatch:hover {
    transform: scale(1.1);
  }

  .mini-color-swatch.selected {
    border-color: #333;
  }

  .btn-create-category,
  .btn-cancel-category {
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
  }

  .btn-create-category {
    background: #3b82f6;
    color: white;
  }

  .btn-create-category:hover {
    background: #2563eb;
  }

  .btn-cancel-category {
    background: #e0e0e0;
    color: #666;
  }

  .btn-cancel-category:hover {
    background: #d1d5db;
  }

  @media (max-width: 640px) {
    .event-form {
      max-width: 100%;
    }

    .form-row {
      grid-template-columns: 1fr;
    }

    .avatar-name {
      display: none;
    }
  }
</style>
