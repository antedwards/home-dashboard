<script lang="ts">
  import { page } from '$app/stores';
  import type { LayoutData } from './$types';

  interface Props {
    children: any;
    data: LayoutData;
  }

  let { children, data }: Props = $props();
  let showUserMenu = $state(false);

  // Hide user menu on auth pages
  $effect(() => {
    if ($page.url.pathname.startsWith('/auth/')) {
      showUserMenu = false;
    }
  });

  // Close dropdown when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu')) {
      showUserMenu = false;
    }
  }

  $effect(() => {
    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  });
</script>

<div class="app">
  {#if !$page.url.pathname.startsWith('/auth/') && !$page.url.pathname.startsWith('/activate')}
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

      {#if data.session}
        <div class="user-menu">
          <button
            class="user-button"
            onclick={() => showUserMenu = !showUserMenu}
            aria-label="User menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </button>

          {#if showUserMenu}
            <div class="user-dropdown">
              <div class="user-info">
                <div class="user-email">{data.session.email}</div>
              </div>
              <div class="user-actions">
                <a href="/devices" class="menu-link">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                  </svg>
                  Devices
                </a>
                <a href="/invites" class="menu-link">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <line x1="19" y1="8" x2="19" y2="14"></line>
                    <line x1="22" y1="11" x2="16" y2="11"></line>
                  </svg>
                  Invite Members
                </a>
                <a href="/auth/logout" class="menu-link">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Logout
                </a>
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </nav>
  {/if}

  <main class="main-content" class:full-height={$page.url.pathname.startsWith('/auth/') || $page.url.pathname.startsWith('/activate')}>
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
    gap: 2rem;
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

  .user-menu {
    position: relative;
  }

  .user-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    background: white;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
    color: #666;
    border: 2px solid #e0e0e0;
  }

  .user-button:hover {
    background: #f5f5f5;
    border-color: #d0d0d0;
  }

  .user-dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 200px;
    z-index: 1000;
  }

  .user-info {
    padding: 1rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .user-email {
    font-size: 0.875rem;
    color: #666;
    word-break: break-word;
  }

  .user-actions {
    padding: 0.5rem;
  }

  .menu-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 1rem;
    text-decoration: none;
    color: #666;
    font-size: 0.875rem;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .menu-link:hover {
    background: #f5f5f5;
    color: #333;
  }

  .menu-link svg {
    flex-shrink: 0;
  }

  .main-content {
    flex: 1;
    padding: 2rem;
    max-width: 1400px;
    width: 100%;
    margin: 0 auto;
  }

  .main-content.full-height {
    padding: 0;
    max-width: none;
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
