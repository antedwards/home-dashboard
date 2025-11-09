<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase';
  import { createDeviceTokenDirect } from '@home-dashboard/database';

  let loading = $state(true);
  let error = $state('');
  let status = $state('Checking authentication...');

  onMount(async () => {
    await handleAutomaticPairing();
  });

  async function handleAutomaticPairing() {
    try {
      // Get device info from URL params
      const deviceId = $page.url.searchParams.get('deviceId');
      const deviceName = $page.url.searchParams.get('deviceName');

      if (!deviceId) {
        error = 'Missing device information. Please try again from your Electron app.';
        loading = false;
        return;
      }

      status = 'Checking authentication...';

      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        error = 'Please log in to pair your device.';
        loading = false;
        return;
      }

      status = 'Generating device token...';

      // Create device token directly
      const { token } = await createDeviceTokenDirect(
        supabase,
        deviceId,
        deviceName || 'Electron Device'
      );

      status = 'Pairing complete! Redirecting...';

      // Redirect back to Electron app with token
      setTimeout(() => {
        window.location.href = `homedashboard://paired?token=${encodeURIComponent(token)}`;
      }, 1000);
    } catch (err: any) {
      console.error('Pairing error:', err);
      error = err.message || 'Failed to pair device. Please try again.';
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Device Pairing • Home Dashboard</title>
</svelte:head>

<div class="pairing-page">
  <div class="pairing-card">
    <div class="logo">🏠</div>
    <h1>Automatic Device Pairing</h1>

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
        <p>{status}</p>
      </div>
    {:else}
      <div class="success-state">
        <div class="success-icon">✅</div>
        <p>Device paired successfully!</p>
        <p class="success-subtitle">Your Electron app should open automatically.</p>
      </div>
    {/if}

    <div class="help-text">
      <p>
        <strong>What's happening?</strong><br />
        We're automatically pairing your device with your account.
        Once complete, you'll be redirected back to the Electron app.
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
    font-size: 1rem;
    font-weight: 500;
  }

  .success-state {
    padding: 2rem 0;
    text-align: center;
  }

  .success-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .success-state p {
    margin: 0.5rem 0;
    color: #10b981;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .success-subtitle {
    color: #666 !important;
    font-size: 0.875rem !important;
    font-weight: 400 !important;
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
