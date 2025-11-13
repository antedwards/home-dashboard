<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData, PageData } from './$types';

  interface Props {
    form?: ActionData;
    data: PageData;
  }

  let { form, data }: Props = $props();

  let loading = $state(false);
</script>

<svelte:head>
  <title>Complete Your Profile • Home Dashboard</title>
</svelte:head>

<div class="auth-page">
  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-header">
        <h1>Welcome!</h1>
        <p>Complete your profile to get started</p>
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
            type="email"
            value={data.email}
            disabled
            class="disabled-input"
          />
        </div>

        <div class="form-group">
          <label for="name">Full Name</label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Enter your full name"
            disabled={loading}
            required
            autofocus
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Choose a password (min 6 characters)"
            disabled={loading}
            required
            minlength="6"
          />
        </div>

        <button type="submit" class="btn-primary" disabled={loading}>
          {loading ? 'Setting up...' : 'Complete Profile'}
        </button>
      </form>
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
    padding: 2rem 1rem;
  }

  .auth-container {
    width: 100%;
    max-width: 420px;
  }

  .auth-card {
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    padding: 3rem 2rem;
  }

  .auth-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .auth-header h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
    font-weight: 600;
    color: #333;
  }

  .auth-header p {
    margin: 0;
    color: #666;
    font-size: 0.875rem;
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

  @media (max-width: 640px) {
    .auth-card {
      padding: 2rem 1.5rem;
    }

    .auth-header h1 {
      font-size: 1.5rem;
    }
  }
</style>
