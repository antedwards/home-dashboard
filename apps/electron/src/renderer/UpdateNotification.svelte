<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let updateAvailable = $state(false);
  let updateInfo = $state<any>(null);
  let downloading = $state(false);
  let downloadProgress = $state(0);
  let error = $state('');
  let checking = $state(false);
  let restarting = $state(false);
  let restartCountdown = $state(3);

  function handleUpdateEvent(event: any) {
    console.log('[UpdateNotification] Update event:', event);

    switch (event.event) {
      case 'checking-for-update':
        checking = true;
        error = '';
        break;

      case 'update-available':
        checking = false;
        updateAvailable = true;
        downloading = true;
        updateInfo = event.data;
        break;

      case 'update-not-available':
        checking = false;
        updateAvailable = false;
        break;

      case 'download-progress':
        downloadProgress = event.data.percent;
        break;

      case 'update-downloaded':
        downloading = false;
        break;

      case 'update-restarting':
        restarting = true;
        restartCountdown = event.data.delay || 3;
        // Start countdown
        const interval = setInterval(() => {
          restartCountdown--;
          if (restartCountdown <= 0) {
            clearInterval(interval);
          }
        }, 1000);
        break;

      case 'error':
        checking = false;
        downloading = false;
        error = event.data.message || 'Update failed';
        break;
    }
  }

  onMount(() => {
    if (window.electron) {
      window.electron.update.onEvent(handleUpdateEvent);
    }
  });

  onDestroy(() => {
    if (window.electron) {
      window.electron.update.offEvent(handleUpdateEvent);
    }
  });
</script>

{#if restarting}
  <div class="update-banner success">
    <div class="update-content">
      <span class="update-icon">🔄</span>
      <div class="update-text">
        <strong>Update complete!</strong>
        <span class="version">Restarting in {restartCountdown}...</span>
      </div>
    </div>
  </div>
{:else if downloading}
  <div class="update-banner info">
    <div class="update-content">
      <span class="update-icon">⬇️</span>
      <div class="update-text">
        <strong>Downloading update...</strong>
        {#if downloadProgress > 0}
          <div class="progress-bar">
            <div class="progress-fill" style="width: {downloadProgress}%"></div>
          </div>
          <span class="progress-text">{Math.round(downloadProgress)}%</span>
        {/if}
      </div>
    </div>
  </div>
{:else if updateAvailable}
  <div class="update-banner info">
    <div class="update-content">
      <span class="update-icon">✨</span>
      <div class="update-text">
        <strong>Update found!</strong>
        <span class="version">Version {updateInfo?.version || 'unknown'} - Starting download...</span>
      </div>
    </div>
  </div>
{/if}

<style>
  .update-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    padding: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    animation: slideDown 0.3s ease-out;
  }

  @keyframes slideDown {
    from {
      transform: translateY(-100%);
    }
    to {
      transform: translateY(0);
    }
  }

  .update-banner.info {
    background: #e3f2fd;
    color: #1565c0;
  }

  .update-banner.success {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .update-banner.error {
    background: #ffebee;
    color: #c62828;
  }

  .update-content {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
  }

  .update-icon {
    font-size: 1.5rem;
  }

  .update-text {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .version {
    font-size: 0.875rem;
    opacity: 0.8;
  }

  .progress-bar {
    width: 200px;
    height: 4px;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 2px;
    overflow: hidden;
    margin: 0.25rem 0;
  }

  .progress-fill {
    height: 100%;
    background: #1565c0;
    transition: width 0.3s ease-out;
  }

  .progress-text {
    font-size: 0.75rem;
    opacity: 0.8;
  }
</style>
