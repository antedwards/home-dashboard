<script lang="ts">
  // This page is only shown briefly before redirect
</script>

<svelte:head>
  <title>Logging out...</title>
</svelte:head>

<div class="logout-page">
  <div class="logout-card">
    <div class="spinner"></div>
    <p>Logging out...</p>
  </div>
</div>

<style>
  .logout-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .logout-card {
    background: white;
    border-radius: 16px;
    padding: 3rem;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    text-align: center;
  }

  .spinner {
    width: 40px;
    height: 40px;
    margin: 0 auto 1rem;
    border: 3px solid #e0e0e0;
    border-top: 3px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  p {
    margin: 0;
    color: #666;
    font-size: 0.875rem;
  }
</style>
