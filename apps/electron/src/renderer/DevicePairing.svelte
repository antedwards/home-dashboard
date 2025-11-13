<script lang="ts">
  import { onMount } from 'svelte';

  let userCode = $state('');
  let deviceCode = $state('');
  let verificationUrl = $state('');
  let interval = $state(5);
  let loading = $state(false);
  let error = $state('');
  let success = $state(false);
  let polling = $state(false);
  let status = $state('Requesting device code...');

  onMount(async () => {
    await startDeviceFlow();
  });

  async function startDeviceFlow() {
    loading = true;
    error = '';

    try {
      // Start the device flow (requests code from server)
      const result = await window.electron.deviceFlow.start();

      if (!result.success) {
        throw new Error(result.error || 'Failed to start device flow');
      }

      userCode = result.data.user_code;
      deviceCode = result.data.device_code;
      verificationUrl = result.data.verification_uri_complete;
      interval = result.data.interval || 5;
      status = 'Waiting for activation...';

      // Start polling for authorization
      pollForAuthorization();
    } catch (err: any) {
      error = err.message || 'Failed to start device pairing';
      status = '';
    } finally {
      loading = false;
    }
  }

  async function pollForAuthorization() {
    polling = true;

    try {
      const result = await window.electron.deviceFlow.poll(deviceCode, interval);

      if (!result.success) {
        throw new Error(result.error || 'Device authorization failed');
      }

      success = true;
      status = 'Device activated! Loading...';

      // Reload app after successful pairing
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      error = err.message || 'Failed to authorize device';
      status = '';
    } finally {
      polling = false;
    }
  }

  async function openBrowser() {
    if (verificationUrl) {
      await window.electron.openExternal(verificationUrl);
    }
  }

  async function retry() {
    error = '';
    success = false;
    userCode = '';
    verificationUrl = '';
    await startDeviceFlow();
  }
</script>

<div class="pairing-container">
  <div class="pairing-card">
    {#if success}
      <div class="success-icon">✅</div>
      <h1>Device Paired!</h1>
      <p class="subtitle">Your device is now connected. Loading app...</p>
    {:else if loading}
      <div class="pairing-icon">⏳</div>
      <h1>Setting Up...</h1>
      <p class="subtitle">{status}</p>
    {:else if error}
      <div class="error-icon">❌</div>
      <h1>Pairing Failed</h1>
      <div class="error-message">{error}</div>
      <button class="btn-primary" onclick={retry}>Try Again</button>
    {:else if userCode}
      <div class="pairing-icon">🔗</div>
      <h1>Activate Your Device</h1>
      <p class="subtitle">Enter this code on the web app to connect your device</p>

      <div class="code-display">
        {userCode}
      </div>

      <div class="instructions">
        <h3>How to activate:</h3>
        <ol>
          <li>Click the button below to open your browser</li>
          <li>Log in to your account if needed</li>
          <li>The code will be pre-filled - just click "Activate"</li>
        </ol>
      </div>

      <button class="btn-primary" onclick={openBrowser}>
        🌐 Open Browser to Activate
      </button>

      {#if polling}
        <div class="polling-status">
          <div class="spinner"></div>
          <p>Waiting for activation...</p>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .pairing-container {
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

  .pairing-icon {
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

  .instructions {
    background: #f7f8ff;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    text-align: left;
  }

  .instructions h3 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #333;
  }

  .instructions ol {
    margin: 0;
    padding-left: 1.5rem;
    color: #666;
  }

  .instructions li {
    margin-bottom: 0.5rem;
    line-height: 1.5;
  }

  .code-display {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-size: 3rem;
    font-weight: 700;
    font-family: 'Courier New', monospace;
    padding: 2rem;
    border-radius: 16px;
    margin: 2rem 0;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
  }

  .success-icon,
  .error-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .polling-status {
    margin-top: 2rem;
    padding: 1.5rem;
    background: #f7f8ff;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  .spinner {
    width: 24px;
    height: 24px;
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

  .polling-status p {
    margin: 0;
    color: #666;
    font-size: 0.875rem;
    font-weight: 500;
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
    background: #efe;
    border: 1px solid #cfc;
    color: #3c3;
    padding: 1.5rem;
    border-radius: 8px;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #333;
    font-size: 0.875rem;
    text-align: left;
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

  .input-hint {
    margin: 0.5rem 0 0 0;
    color: #999;
    font-size: 0.75rem;
    text-align: left;
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

  .btn-secondary {
    width: 100%;
    padding: 1rem;
    margin-bottom: 1.5rem;
    background: white;
    color: #667eea;
    border: 2px solid #667eea;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: #f7f8ff;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
  }
</style>
