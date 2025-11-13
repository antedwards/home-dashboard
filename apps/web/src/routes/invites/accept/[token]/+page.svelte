<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  let token = $state('');
  let invitation = $state<{ email: string; familyId: string; expiresAt: string } | null>(null);
  let loading = $state(true);
  let error = $state('');
  let submitting = $state(false);

  // Form fields
  let name = $state('');
  let password = $state('');
  let confirmPassword = $state('');

  onMount(async () => {
    token = $page.params.token;
    await verifyInvitation();
  });

  async function verifyInvitation() {
    try {
      loading = true;
      error = '';

      const response = await fetch(`/api/invitations/${token}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid invitation');
      }

      invitation = await response.json();
    } catch (err: any) {
      error = err.message || 'Failed to verify invitation';
    } finally {
      loading = false;
    }
  }

  async function handleAcceptInvite(e: Event) {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      error = 'Please enter your name';
      return;
    }

    if (password.length < 6) {
      error = 'Password must be at least 6 characters';
      return;
    }

    if (password !== confirmPassword) {
      error = 'Passwords do not match';
      return;
    }

    try {
      submitting = true;
      error = '';

      const response = await fetch(`/api/invitations/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create account');
      }

      // Redirect to login page
      goto('/auth/login?message=Account created successfully. Please sign in.');
    } catch (err: any) {
      error = err.message || 'Failed to create account';
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Accept Invitation • Home Dashboard</title>
</svelte:head>

<div class="accept-page">
  <div class="card">
    {#if loading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Verifying invitation...</p>
      </div>
    {:else if error && !invitation}
      <div class="error-state">
        <div class="error-icon">⚠</div>
        <h1>Invalid Invitation</h1>
        <p>{error}</p>
        <a href="/auth/login" class="btn-secondary">Go to Login</a>
      </div>
    {:else if invitation}
      <div class="form-container">
        <h1>Join Home Dashboard</h1>
        <p class="subtitle">You've been invited to join as {invitation.email}</p>

        <form onsubmit={handleAcceptInvite}>
          <div class="form-group">
            <label for="email">Email</label>
            <input
              type="email"
              id="email"
              value={invitation.email}
              disabled
              class="disabled-input"
            />
          </div>

          <div class="form-group">
            <label for="name">Full Name</label>
            <input
              type="text"
              id="name"
              bind:value={name}
              placeholder="Enter your full name"
              required
              disabled={submitting}
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              bind:value={password}
              placeholder="Choose a password (min 6 characters)"
              required
              minlength="6"
              disabled={submitting}
            />
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              bind:value={confirmPassword}
              placeholder="Confirm your password"
              required
              disabled={submitting}
            />
          </div>

          {#if error}
            <div class="error-message">{error}</div>
          {/if}

          <button type="submit" class="btn-primary" disabled={submitting}>
            {submitting ? 'Creating Account...' : 'Create Account & Join'}
          </button>
        </form>

        <div class="footer-text">
          Already have an account?
          <a href="/auth/login">Sign in</a>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .accept-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2rem 1rem;
  }

  .card {
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 450px;
    width: 100%;
    overflow: hidden;
  }

  .loading-state,
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 2rem;
    text-align: center;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e0e0e0;
    border-top: 3px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .loading-state p,
  .error-state p {
    color: #666;
    margin: 0;
  }

  .error-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .error-state h1 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    color: #333;
  }

  .error-state p {
    margin-bottom: 1.5rem;
  }

  .btn-secondary {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background: #f5f5f5;
    color: #333;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: #e8e8e8;
    border-color: #d0d0d0;
  }

  .form-container {
    padding: 3rem 2rem;
  }

  .form-container h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
    font-weight: 600;
    color: #333;
    text-align: center;
  }

  .subtitle {
    margin: 0 0 2rem 0;
    color: #666;
    font-size: 0.875rem;
    text-align: center;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #333;
  }

  .form-group input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.2s;
  }

  .form-group input:focus:not(:disabled) {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .form-group input:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }

  .disabled-input {
    background: #f9f9f9 !important;
    color: #999;
  }

  .btn-primary {
    width: 100%;
    padding: 0.875rem 1.5rem;
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
    transform: none;
  }

  .error-message {
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-size: 0.875rem;
    margin-bottom: 1rem;
    background: #FEE2E2;
    color: #DC2626;
    border: 1px solid #FECACA;
  }

  .footer-text {
    margin-top: 1.5rem;
    text-align: center;
    font-size: 0.875rem;
    color: #666;
  }

  .footer-text a {
    color: #667eea;
    text-decoration: none;
    font-weight: 500;
  }

  .footer-text a:hover {
    text-decoration: underline;
  }

  @media (max-width: 640px) {
    .form-container {
      padding: 2rem 1.5rem;
    }

    .form-container h1 {
      font-size: 1.5rem;
    }
  }
</style>
