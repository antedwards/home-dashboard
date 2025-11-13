<script lang="ts">
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  // Pre-fill code from server data
  let code = $state(data.code?.toUpperCase() || '');
  let loading = $state(false);
  let error = $state('');
  let success = $state(false);

  function formatCode(value: string): string {
    // Remove non-alphanumeric characters and convert to uppercase
    const cleaned = value.replace(/[^a-zA-Z-]/g, '').toUpperCase();

    // Split on dash or after first word
    const parts = cleaned.split('-');

    if (parts.length > 1) {
      return `${parts[0]}-${parts[1]}`;
    } else if (cleaned.length > 0) {
      // Auto-add dash after first word
      const match = cleaned.match(/^([A-Z]+)([A-Z]+)$/);
      if (match) {
        return `${match[1]}-${match[2]}`;
      }
    }

    return cleaned;
  }

  function handleInput(event: Event) {
    const input = event.target as HTMLInputElement;
    code = formatCode(input.value);
  }

  async function handleActivate() {
    if (!code || code.length < 3) {
      error = 'Please enter a valid code';
      return;
    }

    loading = true;
    error = '';

    try {
      // Call the API endpoint to activate device
      const response = await fetch('/api/device/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_code: code.toLowerCase(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to activate device');
      }

      success = true;

      // Redirect after 2 seconds
      setTimeout(() => {
        goto('/');
      }, 2000);
    } catch (err: any) {
      error = err.message || 'Failed to activate device';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Activate Device • Home Dashboard</title>
</svelte:head>

<div class="activate-page">
  <div class="activate-card">
    <div class="icon">🔗</div>
    <h1>Activate Device</h1>
    <p class="subtitle">
      Enter the code shown on your Electron app to link it to your account.
    </p>

    {#if success}
      <div class="success-message">
        <div class="success-icon">✅</div>
        <h2>Device Activated!</h2>
        <p>Your Electron app is now connected. You can close this window.</p>
      </div>
    {:else}
      {#if error}
        <div class="error-message">
          {error}
        </div>
      {/if}

      <form onsubmit={(e) => { e.preventDefault(); handleActivate(); }}>
        <div class="form-group">
          <label for="code">Device Code</label>
          <input
            id="code"
            type="text"
            bind:value={code}
            oninput={handleInput}
            placeholder="word1-word2"
            disabled={loading}
            class="code-input"
            maxlength="30"
            autocomplete="off"
            autofocus
          />
          <p class="hint">Example: apple-mountain</p>
        </div>

        <button type="submit" class="btn-primary" disabled={loading || !code}>
          {loading ? 'Activating...' : 'Activate Device'}
        </button>
      </form>
    {/if}

    <div class="help-text">
      <p>
        <strong>Don't have a code?</strong><br />
        Open the Electron app and start the device pairing process to get a code.
      </p>
    </div>
  </div>
</div>

<style>
  .activate-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2rem;
  }

  .activate-card {
    background: white;
    border-radius: 20px;
    padding: 3rem 2.5rem;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 500px;
    width: 100%;
    text-align: center;
  }

  .icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  h1 {
    margin: 0 0 1rem 0;
    font-size: 2rem;
    font-weight: 700;
    color: #1a1a1a;
  }

  .subtitle {
    margin: 0 0 2rem 0;
    color: #666;
    font-size: 1rem;
    line-height: 1.5;
  }

  .error-message {
    background: #fee;
    border: 1px solid #fcc;
    color: #c33;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    font-size: 0.875rem;
  }

  .success-message {
    padding: 2rem 0;
  }

  .success-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .success-message h2 {
    margin: 0 0 0.5rem 0;
    color: #10b981;
    font-size: 1.5rem;
  }

  .success-message p {
    margin: 0;
    color: #666;
  }

  .form-group {
    margin-bottom: 1.5rem;
    text-align: left;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #333;
    font-size: 0.875rem;
  }

  .code-input {
    width: 100%;
    padding: 1rem 1.25rem;
    border: 2px solid #ddd;
    border-radius: 10px;
    font-size: 1.5rem;
    font-family: 'Courier New', monospace;
    font-weight: 600;
    text-align: center;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    transition: all 0.2s;
  }

  .code-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .code-input:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }

  .hint {
    margin: 0.5rem 0 0 0;
    color: #999;
    font-size: 0.75rem;
    text-align: center;
  }

  .btn-primary {
    width: 100%;
    padding: 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1.125rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .help-text {
    background: #f7f8ff;
    border-radius: 12px;
    padding: 1.5rem;
    margin-top: 2rem;
    text-align: left;
  }

  .help-text p {
    margin: 0;
    color: #666;
    font-size: 0.875rem;
    line-height: 1.8;
  }

  .help-text strong {
    color: #333;
  }

  @media (max-width: 640px) {
    .activate-card {
      padding: 2rem 1.5rem;
    }

    .code-input {
      font-size: 1.25rem;
    }

    h1 {
      font-size: 1.5rem;
    }
  }
</style>
