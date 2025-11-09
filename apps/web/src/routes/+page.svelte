<script lang="ts">
  let currentView = $state<'day' | 'week' | 'month'>('week');
</script>

<svelte:head>
  <title>Calendar • Home Dashboard</title>
</svelte:head>

<div class="calendar-page">
  <div class="page-header">
    <h2>Calendar</h2>
    <div class="view-switcher">
      <button
        class:active={currentView === 'day'}
        onclick={() => (currentView = 'day')}
      >
        Day
      </button>
      <button
        class:active={currentView === 'week'}
        onclick={() => (currentView = 'week')}
      >
        Week
      </button>
      <button
        class:active={currentView === 'month'}
        onclick={() => (currentView = 'month')}
      >
        Month
      </button>
    </div>
  </div>

  <div class="calendar-container">
    {#if currentView === 'day'}
      <div class="calendar-view">
        <h3>Day View</h3>
        <p>Day view coming soon...</p>
      </div>
    {:else if currentView === 'week'}
      <div class="calendar-view">
        <h3>Week View</h3>
        <p>Week view coming soon...</p>
      </div>
    {:else if currentView === 'month'}
      <div class="calendar-view">
        <h3>Month View</h3>
        <p>Month view coming soon...</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .calendar-page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h2 {
    margin: 0;
    font-size: 2rem;
    font-weight: 600;
    color: #333;
  }

  .view-switcher {
    display: flex;
    gap: 0.5rem;
  }

  .view-switcher button {
    padding: 0.5rem 1rem;
    border: 1px solid #e0e0e0;
    background: white;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: #666;
    transition: all 0.2s;
  }

  .view-switcher button:hover {
    background: #f5f5f5;
    border-color: #d0d0d0;
  }

  .view-switcher button.active {
    background: #2563eb;
    color: white;
    border-color: #2563eb;
  }

  .calendar-container {
    background: white;
    border-radius: 8px;
    padding: 2rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    min-height: 600px;
  }

  .calendar-view h3 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #333;
  }

  .calendar-view p {
    margin: 0;
    color: #666;
  }
</style>
