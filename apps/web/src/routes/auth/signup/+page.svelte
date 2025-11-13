<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  interface Props {
    form?: ActionData;
  }

  let { form }: Props = $props();

  let email = $state(form?.email || '');
  let name = $state(form?.name || '');
  let loading = $state(false);
  let step = $state<'check' | 'signup'>(form?.step === 'signup' ? 'signup' : 'check');

  // Update step when form response changes
  $effect(() => {
    if (form?.step) {
      step = form.step as 'check' | 'signup';
    }
    if (form?.email) {
      email = form.email;
    }
    if (form?.name) {
      name = form.name;
    }
  });
</script>

<svelte:head>
  <title>Sign Up • Home Dashboard</title>
</svelte:head>

<div class="auth-page">
  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-header">
        <h1>{step === 'check' ? 'Check Invitation' : 'Create Account'}</h1>
        <p>
          {step === 'check'
            ? 'Enter your email to verify your invitation'
            : 'Complete your account setup'}
        </p>
      </div>

      {#if form?.error}
        <div class="error-message">
          {form.error}
        </div>
      {/if}

      {#if step === 'check'}
        <form
          method="POST"
          action="?/checkInvitation"
          use:enhance={() => {
            loading = true;
            return async ({ update }) => {
              await update();
              loading = false;
            };
          }}
        >
          <div class="form-group">
            <label for="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              bind:value={email}
              placeholder="you@example.com"
              disabled={loading}
              required
              autocomplete="email"
            />
          </div>

          <button type="submit" class="btn-primary" disabled={loading}>
            {loading ? 'Checking...' : 'Check Invitation'}
          </button>
        </form>
      {:else}
        <form
          method="POST"
          action="?/signup"
          use:enhance={() => {
            loading = true;
            return async ({ update }) => {
              await update();
              loading = false;
            };
          }}
        >
          <input type="hidden" name="email" value={email} />

          <div class="form-group">
            <label for="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              bind:value={name}
              placeholder="John Doe"
              disabled={loading}
              required
              autocomplete="name"
            />
          </div>

          <div class="form-group">
            <label for="email-display">Email</label>
            <input
              id="email-display"
              type="email"
              value={email}
              disabled
              readonly
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              disabled={loading}
              required
              autocomplete="new-password"
            />
          </div>

          <div class="form-group">
            <label for="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              disabled={loading}
              required
              autocomplete="new-password"
            />
          </div>

          <button type="submit" class="btn-primary" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          <button
            type="button"
            class="btn-secondary"
            onclick={() => { step = 'check'; }}
            disabled={loading}
          >
            Back
          </button>
        </form>
      {/if}

      <div class="auth-footer">
        <p>
          Already have an account?
          <a href="/auth/login">Sign in</a>
        </p>
      </div>
    </div>
  </div>
</div>

<style>
  .auth-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2rem;
  }

  .auth-container {
    width: 100%;
    max-width: 420px;
  }

  .auth-card {
    background: white;
    border-radius: 16px;
    padding: 2.5rem;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  .auth-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .auth-header h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
    font-weight: 700;
    color: #1a1a1a;
  }

  .auth-header p {
    margin: 0;
    color: #666;
    font-size: 0.95rem;
  }

  .error-message {
    background: #fee;
    border: 1px solid #fcc;
    color: #c33;
    padding: 0.75rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    font-size: 0.875rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #333;
    font-size: 0.875rem;
  }

  .form-group input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 0.95rem;
    transition: all 0.2s;
  }

  .form-group input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .form-group input:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }

  .btn-primary {
    width: 100%;
    padding: 0.875rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 0.75rem;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    width: 100%;
    padding: 0.875rem;
    background: white;
    color: #667eea;
    border: 1px solid #667eea;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #f7f8ff;
  }

  .btn-secondary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .auth-footer {
    margin-top: 1.5rem;
    text-align: center;
  }

  .auth-footer p {
    margin: 0;
    color: #666;
    font-size: 0.875rem;
  }

  .auth-footer a {
    color: #667eea;
    text-decoration: none;
    font-weight: 500;
  }

  .auth-footer a:hover {
    text-decoration: underline;
  }

  @media (max-width: 480px) {
    .auth-card {
      padding: 2rem 1.5rem;
    }

    .auth-header h1 {
      font-size: 1.5rem;
    }
  }
</style>
