<script lang="ts">
  import { onMount } from 'svelte';

  let version = $state('');
  let currentView = $state<'day' | 'week' | 'month'>('week');

  onMount(async () => {
    if (window.electron) {
      version = await window.electron.getVersion();
    }
  });
</script>

<div class="app">
  <header class="header">
    <h1>Home Dashboard</h1>
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
  </header>

  <main class="main">
    {#if currentView === 'day'}
      <div class="view day-view">
        <h2>Day View</h2>
        <p>Day view coming soon...</p>
      </div>
    {:else if currentView === 'week'}
      <div class="view week-view">
        <h2>Week View</h2>
        <p>Week view coming soon...</p>
      </div>
    {:else if currentView === 'month'}
      <div class="view month-view">
        <h2>Month View</h2>
        <p>Month view coming soon...</p>
      </div>
    {/if}
  </main>

  <footer class="footer">
    <p>Home Dashboard v{version} • Offline-first family calendar</p>
  </footer>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #f5f5f5;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: white;
    border-bottom: 1px solid #e0e0e0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
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

  .main {
    flex: 1;
    padding: 2rem;
    overflow: auto;
  }

  .view {
    background: white;
    border-radius: 8px;
    padding: 2rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .view h2 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #333;
  }

  .view p {
    margin: 0;
    color: #666;
  }

  .footer {
    padding: 1rem 2rem;
    background: white;
    border-top: 1px solid #e0e0e0;
    text-align: center;
  }

  .footer p {
    margin: 0;
    font-size: 0.875rem;
    color: #999;
  }
</style>
