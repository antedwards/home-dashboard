<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  interface Props {
    form?: ActionData;
  }

  let { form }: Props = $props();

  let email = $state(form?.email || '');
  let loading = $state(false);
</script>

<svelte:head>
  <title>Login • Home Dashboard</title>
</svelte:head>

<div class="auth-page">
  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-header">
        <h1>Welcome Back</h1>
        <p>Sign in to your Home Dashboard</p>
      </div>

      {#if form?.error}
        <div class="error-message">
          {form.error}
        </div>
      {/if}

      <form
        method="POST"
        use:enhance={() => {
          loading = true;
          return async ({ update }) => {
            await update();
            loading = false;
          };
        }}
      >
        <div class="form-group">
          <label for="email">Email</label>
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

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            disabled={loading}
            required
            autocomplete="current-password"
          />
        </div>

        <button type="submit" class="btn-primary" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div class="auth-footer">
        <p>
          Need an account?
          <a href="/auth/signup">Contact an admin for an invitation</a>
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
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .btn-primary:disabled {
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
