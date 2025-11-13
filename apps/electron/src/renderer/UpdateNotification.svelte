<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let updateAvailable = $state(false);
  let updateInfo = $state<any>(null);
  let downloading = $state(false);
  let downloadProgress = $state(0);
  let error = $state('');
  let checking = $state(false);

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

  async function handleCheckForUpdates() {
    checking = true;
    error = '';

    const result = await window.electron.update.check();

    if (!result.success) {
      error = result.error || 'Failed to check for updates';
      checking = false;
    }
  }

  async function handleDownloadUpdate() {
    if (!updateInfo) return;

    downloading = true;
    error = '';

    const result = await window.electron.update.download(updateInfo);

    if (!result.success) {
      error = result.error || 'Failed to download update';
      downloading = false;
    }
  }

  async function handleInstallUpdate() {
    const result = await window.electron.update.installAndRestart();

    if (!result.success) {
      error = result.error || 'Failed to install update';
    }
  }
</script>

{#if checking}
  <div class="update-banner info">
    <div class="update-content">
      <span class="update-icon">🔄</span>
      <span>Checking for updates...</span>
    </div>
  </div>
{/if}

{#if error}
  <div class="update-banner error">
    <div class="update-content">
      <span class="update-icon">⚠️</span>
      <span>{error}</span>
    </div>
    <button class="btn-dismiss" onclick={() => (error = '')}>Dismiss</button>
  </div>
{/if}

{#if updateAvailable && !downloading}
  <div class="update-banner success">
    <div class="update-content">
      <span class="update-icon">✨</span>
      <div class="update-text">
        <strong>Update Available!</strong>
        <span class="version">Version {updateInfo?.version || 'unknown'}</span>
      </div>
    </div>
    <div class="update-actions">
      <button class="btn-primary" onclick={handleDownloadUpdate}>
        Download Update
      </button>
      <button class="btn-dismiss" onclick={() => (updateAvailable = false)}>
        Later
      </button>
    </div>
  </div>
{/if}

{#if downloading}
  <div class="update-banner info">
    <div class="update-content">
      <span class="update-icon">⬇️</span>
      <div class="update-text">
        <strong>Downloading update...</strong>
        <div class="progress-bar">
          <div class="progress-fill" style="width: {downloadProgress}%"></div>
        </div>
        <span class="progress-text">{Math.round(downloadProgress)}%</span>
      </div>
    </div>
  </div>
{/if}

<!-- Manual check button (can be placed anywhere in the app) -->
<div class="update-check-container">
  <button class="btn-check-updates" onclick={handleCheckForUpdates} disabled={checking}>
    {checking ? 'Checking...' : 'Check for Updates'}
  </button>
</div>

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

  .update-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-primary {
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .btn-dismiss {
    padding: 0.5rem 1rem;
    background: transparent;
    color: inherit;
    border: 1px solid currentColor;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    opacity: 0.7;
  }

  .btn-dismiss:hover {
    opacity: 1;
  }

  .progress-bar {
    width: 200px;
    height: 4px;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 2px;
    overflow: hidden;
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

  .update-check-container {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    z-index: 999;
  }

  .btn-check-updates {
    padding: 0.75rem 1rem;
    background: white;
    color: #667eea;
    border: 2px solid #667eea;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .btn-check-updates:hover:not(:disabled) {
    background: #f7f8ff;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
  }

  .btn-check-updates:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
