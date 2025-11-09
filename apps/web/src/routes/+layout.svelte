<script lang="ts">
  import { page } from '$app/stores';

  interface Props {
    children: any;
  }

  let { children }: Props = $props();
</script>

<div class="app">
  <nav class="navbar">
    <div class="nav-brand">
      <h1>Home Dashboard</h1>
    </div>
    <div class="nav-links">
      <a href="/" class:active={$page.url.pathname === '/'}>Calendar</a>
      <a href="/chores" class:active={$page.url.pathname === '/chores'}>Chores</a>
      <a href="/lists" class:active={$page.url.pathname === '/lists'}>Lists</a>
      <a href="/meals" class:active={$page.url.pathname === '/meals'}>Meals</a>
    </div>
  </nav>

  <main class="main-content">
    {@render children()}
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: #f5f5f5;
  }

  * {
    box-sizing: border-box;
  }

  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: white;
    border-bottom: 1px solid #e0e0e0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .nav-brand h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #333;
  }

  .nav-links {
    display: flex;
    gap: 1rem;
  }

  .nav-links a {
    padding: 0.5rem 1rem;
    text-decoration: none;
    color: #666;
    font-weight: 500;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .nav-links a:hover {
    background: #f5f5f5;
    color: #333;
  }

  .nav-links a.active {
    background: #2563eb;
    color: white;
  }

  .main-content {
    flex: 1;
    padding: 2rem;
    max-width: 1400px;
    width: 100%;
    margin: 0 auto;
  }

  @media (max-width: 768px) {
    .navbar {
      flex-direction: column;
      gap: 1rem;
    }

    .nav-links {
      width: 100%;
      justify-content: space-around;
    }

    .main-content {
      padding: 1rem;
    }
  }
</style>
