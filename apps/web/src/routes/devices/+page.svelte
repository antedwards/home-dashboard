<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  interface DeviceToken {
    id: string;
    deviceName: string | null;
    deviceType: string | null;
    createdAt: string;
    lastUsedAt: string | null;
    expiresAt: string;
  }

  let devices = $state<DeviceToken[]>([]);
  let loading = $state(false);
  let error = $state('');

  onMount(async () => {
    await loadDevices();
  });

  async function loadDevices() {
    try {
      const response = await fetch('/api/devices');
      if (!response.ok) throw new Error('Failed to load devices');
      devices = await response.json();
    } catch (err: any) {
      error = err.message || 'Failed to load devices';
    }
  }

  async function handlePairDevice() {
    // Navigate to pairing page which will show the code
    goto('/devices/pair');
  }

  async function handleRevoke(tokenId: string) {
    if (!confirm('Are you sure you want to remove this device?')) {
      return;
    }

    try {
      const response = await fetch(`/api/devices/${tokenId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to revoke device');
      await loadDevices();
    } catch (err: any) {
      error = err.message || 'Failed to revoke device';
    }
  }

  async function handleExtend(tokenId: string) {
    try {
      const response = await fetch(`/api/devices/${tokenId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extend_days: 90 }),
      });
      if (!response.ok) throw new Error('Failed to extend device token');
      await loadDevices();
    } catch (err: any) {
      error = err.message || 'Failed to extend device token';
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function isExpiringSoon(expiresAt: string): boolean {
    const daysRemaining =
      (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysRemaining < 7;
  }
</script>

<svelte:head>
  <title>Devices • Home Dashboard</title>
</svelte:head>

<div class="devices-page">
  <div class="page-header">
    <h2>Device Management</h2>
    <p>Pair Electron devices and manage connected devices</p>
  </div>

  {#if error}
    <div class="error-message">
      {error}
    </div>
  {/if}

  <!-- Pairing Section -->
  <div class="card">
    <h3>Pair a New Device</h3>
    <p class="subtitle">
      Connect your Electron desktop app to the family dashboard
    </p>

    <button class="btn-primary" onclick={handlePairDevice}>
      Pair New Device
    </button>
  </div>

  <!-- Connected Devices -->
  <div class="card">
    <h3>Connected Devices</h3>
    <p class="subtitle">Manage your paired devices</p>

    {#if devices.length === 0}
      <div class="empty-state">
        <p>No devices connected</p>
        <p class="empty-subtitle">
          Click "Pair New Device" above to connect your first device
        </p>
      </div>
    {:else}
      <div class="devices-list">
        {#each devices as device (device.id)}
          <div class="device-item">
            <div class="device-icon">
              {#if device.deviceType === 'electron'}
                💻
              {:else if device.deviceType === 'ios'}
                📱
              {:else if device.deviceType === 'android'}
                🤖
              {:else}
                🖥️
              {/if}
            </div>
            <div class="device-info">
              <div class="device-name">{device.deviceName || 'Unnamed Device'}</div>
              <div class="device-meta">
                <span>Added: {formatDate(device.createdAt)}</span>
                {#if device.lastUsedAt}
                  <span>Last used: {formatDate(device.lastUsedAt)}</span>
                {/if}
              </div>
              <div class="device-expiry" class:warning={isExpiringSoon(device.expiresAt)}>
                Expires: {formatDate(device.expiresAt)}
                {#if isExpiringSoon(device.expiresAt)}
                  <span class="badge-warning">Expiring soon!</span>
                {/if}
              </div>
            </div>
            <div class="device-actions">
              <button
                class="btn-secondary btn-sm"
                onclick={() => handleExtend(device.id)}
              >
                Extend
              </button>
              <button
                class="btn-danger btn-sm"
                onclick={() => handleRevoke(device.id)}
              >
                Remove
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .devices-page {
    max-width: 900px;
    margin: 0 auto;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .page-header h2 {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
    font-weight: 600;
    color: #333;
  }

  .page-header p {
    margin: 0;
    color: #666;
    font-size: 1rem;
  }

  .error-message {
    background: #fee;
    border: 1px solid #fcc;
    color: #c33;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
  }

  .card {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    margin-bottom: 1.5rem;
  }

  .card h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #333;
  }

  .subtitle {
    margin: 0 0 1.5rem 0;
    color: #666;
    font-size: 0.875rem;
  }

  .btn-primary {
    padding: 0.75rem 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .pairing-code-display {
    text-align: center;
    padding: 2rem 0;
  }

  .code-label {
    font-size: 0.875rem;
    color: #666;
    margin-bottom: 1rem;
  }

  .code-box {
    font-size: 3rem;
    font-weight: 700;
    font-family: 'Courier New', monospace;
    color: #667eea;
    letter-spacing: 0.1em;
    padding: 1rem;
    background: #f7f8ff;
    border: 2px dashed #667eea;
    border-radius: 12px;
    margin: 0 auto 1rem auto;
    max-width: 400px;
  }

  .code-timer {
    font-size: 1.25rem;
    font-weight: 600;
    color: #666;
    margin-bottom: 1.5rem;
  }

  .code-instructions {
    text-align: left;
    color: #666;
    font-size: 0.875rem;
    line-height: 1.8;
    max-width: 400px;
    margin: 0 auto;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: #999;
  }

  .empty-state p {
    margin: 0;
    font-size: 1rem;
  }

  .empty-subtitle {
    font-size: 0.875rem !important;
    margin-top: 0.5rem !important;
  }

  .devices-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .device-item {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 1.25rem;
    background: #f9f9f9;
    border-radius: 8px;
    transition: all 0.2s;
  }

  .device-item:hover {
    background: #f5f5f5;
  }

  .device-icon {
    font-size: 2.5rem;
    flex-shrink: 0;
  }

  .device-info {
    flex: 1;
    min-width: 0;
  }

  .device-name {
    font-size: 1.1rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 0.5rem;
  }

  .device-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    font-size: 0.8rem;
    color: #666;
    margin-bottom: 0.5rem;
  }

  .device-expiry {
    font-size: 0.8rem;
    color: #666;
  }

  .device-expiry.warning {
    color: #f59e0b;
    font-weight: 600;
  }

  .badge-warning {
    display: inline-block;
    background: #fef3c7;
    color: #d97706;
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-left: 0.5rem;
  }

  .device-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .btn-sm {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary {
    background: white;
    color: #667eea;
    border: 1px solid #667eea;
  }

  .btn-secondary:hover {
    background: #f7f8ff;
  }

  .btn-danger {
    background: white;
    color: #dc2626;
    border: 1px solid #dc2626;
  }

  .btn-danger:hover {
    background: #fef2f2;
  }

  @media (max-width: 768px) {
    .device-item {
      flex-direction: column;
      align-items: flex-start;
    }

    .device-actions {
      width: 100%;
    }

    .device-actions button {
      flex: 1;
    }

    .code-box {
      font-size: 2rem;
    }
  }
</style>
