<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { createDevicePairingCode, type DevicePairingCode } from '@home-dashboard/database';

  let pairingCode = $state<DevicePairingCode | null>(null);
  let loading = $state(true);
  let error = $state('');
  let countdown = $state(0);
  let intervalId: ReturnType<typeof setInterval> | null = null;

  onMount(async () => {
    await generateCode();
  });

  async function generateCode() {
    loading = true;
    error = '';

    try {
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        error = 'Please log in to generate a pairing code.';
        loading = false;
        return;
      }

      pairingCode = await createDevicePairingCode(supabase, 10); // 10 minutes

      // Start countdown
      const expiresAt = new Date(pairingCode.expires_at).getTime();
      if (intervalId) {
        clearInterval(intervalId);
      }

      intervalId = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
        countdown = remaining;

        if (remaining === 0 && intervalId) {
          clearInterval(intervalId);
          pairingCode = null;
        }
      }, 1000);
    } catch (err: any) {
      error = err.message || 'Failed to generate pairing code';
    } finally {
      loading = false;
    }
  }

  function formatTimeRemaining(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
</script>

<svelte:head>
  <title>Device Pairing • Home Dashboard</title>
</svelte:head>

<div class="pairing-page">
  <div class="pairing-card">
    <div class="logo">🏠</div>
    <h1>Device Pairing</h1>

    {#if error}
      <div class="error-message">
        {error}
        {#if error.includes('log in')}
          <div style="margin-top: 1rem;">
            <a href="/auth/login" class="btn-primary">Go to Login</a>
          </div>
        {/if}
      </div>
    {:else if loading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Generating pairing code...</p>
      </div>
    {:else if pairingCode}
      <div class="code-section">
        <p class="instructions">
          Enter this code in your Electron app:
        </p>

        <div class="code-display">
          {pairingCode.code}
        </div>

        <div class="timer">
          ⏱️ Expires in {formatTimeRemaining(countdown)}
        </div>

        <button class="btn-secondary" onclick={generateCode}>
          Generate New Code
        </button>
      </div>
    {/if}

    <div class="help-text">
      <p>
        <strong>How to use:</strong><br />
        1. Keep this browser tab open<br />
        2. Go to your Electron app<br />
        3. Enter the code shown above<br />
        4. Your device will be paired automatically
      </p>
    </div>
  </div>
</div>

<style>
  .pairing-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2rem;
  }

  .pairing-card {
    background: white;
    border-radius: 20px;
    padding: 3rem 2.5rem;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 500px;
    width: 100%;
    text-align: center;
  }

  .logo {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  h1 {
    margin: 0 0 2rem 0;
    font-size: 2rem;
    font-weight: 700;
    color: #1a1a1a;
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

  .loading-state {
    padding: 2rem 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
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

  .loading-state p {
    color: #666;
    font-size: 0.875rem;
  }

  .code-section {
    margin-bottom: 2rem;
  }

  .instructions {
    margin: 0 0 1.5rem 0;
    color: #666;
    font-size: 1rem;
  }

  .code-display {
    font-size: 3.5rem;
    font-weight: 700;
    font-family: 'Courier New', monospace;
    color: #667eea;
    letter-spacing: 0.1em;
    padding: 1.5rem;
    background: #f7f8ff;
    border: 3px dashed #667eea;
    border-radius: 16px;
    margin: 0 auto 1.5rem auto;
    text-transform: uppercase;
  }

  .timer {
    font-size: 1.25rem;
    font-weight: 600;
    color: #666;
    margin-bottom: 2rem;
  }

  .btn-primary {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    text-decoration: none;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
  }

  .btn-secondary {
    padding: 0.75rem 1.5rem;
    background: white;
    color: #667eea;
    border: 2px solid #667eea;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: #f7f8ff;
    transform: translateY(-1px);
  }

  .help-text {
    background: #f7f8ff;
    border-radius: 12px;
    padding: 1.5rem;
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
    .pairing-card {
      padding: 2rem 1.5rem;
    }

    .code-display {
      font-size: 2.5rem;
      padding: 1rem;
    }

    h1 {
      font-size: 1.5rem;
    }
  }
</style>
