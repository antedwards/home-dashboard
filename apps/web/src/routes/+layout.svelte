<script lang="ts">
  import { page } from '$app/stores';
  import type { LayoutData } from './$types';

  interface Props {
    children: any;
    data: LayoutData;
  }

  let { children, data }: Props = $props();
</script>

<div class="app">
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
    position: relative;
  }

  .main-content {
    flex: 1;
    padding: 1.5rem;
    max-width: 1600px;
    width: 100%;
    margin: 0 auto;
  }

  .main-content.full-height {
    padding: 0;
    max-width: none;
  }

  @media (max-width: 1024px) {
    .main-content {
      padding: 1rem;
    }
  }

  @media (max-width: 640px) {
    .main-content {
      padding: 0.75rem;
    }
  }
</style>
