<script lang="ts">
  let code = $state('');
  let loading = $state(false);
  let error = $state('');
  let success = $state(false);

  async function handlePair() {
    if (!code || code.trim().length === 0) {
      error = 'Please enter a pairing code';
      return;
    }

    const cleanCode = code.trim().toLowerCase();

    loading = true;
    error = '';

    try {
      // Generate a unique device ID
      const deviceId = await window.electron.getDeviceId();
      const deviceName = await window.electron.getDeviceName();

      // Verify code and get token via IPC (runs in main process)
      const authResult = await window.electron.auth.verifyPairingCode(
        cleanCode,
        deviceId,
        deviceName
      );

      if (!authResult.success || !authResult.result) {
        throw new Error(authResult.error || 'Failed to verify pairing code');
      }

      // Store token securely
      await window.electron.storeDeviceToken(authResult.result.token);

      success = true;

      // Reload app after successful pairing
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      error = err.message || 'Failed to pair device. Please check the code and try again.';
    } finally {
      loading = false;
    }
  }
</script>

<div class="pairing-container">
  <div class="pairing-card">
    <div class="pairing-icon">🔐</div>

    <h1>Pair Your Device</h1>
    <p class="subtitle">
      To use Home Dashboard, you'll need to pair this device with your account.
    </p>

    <div class="instructions">
      <h3>How to Pair:</h3>
      <ol>
        <li>Open the Home Dashboard web app</li>
        <li>Go to Devices → Generate Pairing Code</li>
        <li>Enter the 2-word code below</li>
      </ol>
    </div>

    {#if success}
      <div class="success-message">
        ✅ Device paired successfully! Reloading...
      </div>
    {:else}
      {#if error}
        <div class="error-message">
          {error}
        </div>
      {/if}

      <form onsubmit={(e) => { e.preventDefault(); handlePair(); }}>
        <div class="form-group">
          <label for="code">Pairing Code</label>
          <input
            id="code"
            type="text"
            bind:value={code}
            placeholder="word1-word2"
            disabled={loading}
            autocomplete="off"
            class="code-input"
          />
          <p class="input-hint">Format: word-word (e.g., apple-mountain)</p>
        </div>

        <button type="submit" class="btn-primary" disabled={loading}>
          {loading ? 'Pairing...' : 'Pair Device'}
        </button>
      </form>
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
</style>
