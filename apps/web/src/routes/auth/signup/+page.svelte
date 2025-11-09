<script lang="ts">
  import { goto } from '$app/navigation';
  import { createSupabaseClient, hasValidInvitation, useInvitation } from '@home-dashboard/database';

  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let name = $state('');
  let loading = $state(false);
  let error = $state('');
  let step = $state<'check' | 'signup'>('check');

  const supabase = createSupabaseClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  async function checkInvitation() {
    if (!email) {
      error = 'Please enter your email';
      return;
    }

    loading = true;
    error = '';

    try {
      const isValid = await hasValidInvitation(supabase, email);

      if (!isValid) {
        error = 'No valid invitation found for this email. Please contact an admin.';
        return;
      }

      step = 'signup';
    } catch (err: any) {
      error = err.message || 'Failed to check invitation';
    } finally {
      loading = false;
    }
  }

  async function handleSignup() {
    if (!name || !password || !confirmPassword) {
      error = 'Please fill in all fields';
      return;
    }

    if (password !== confirmPassword) {
      error = 'Passwords do not match';
      return;
    }

    if (password.length < 8) {
      error = 'Password must be at least 8 characters';
      return;
    }

    loading = true;
    error = '';

    try {
      // Create user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      // Create user profile
      const { error: profileError } = await supabase.from('users').insert({
        id: authData.user.id,
        email,
        name,
        color: '#3B82F6',
      });

      if (profileError) throw profileError;

      // Mark invitation as used
      await useInvitation(supabase, email);

      // Redirect to calendar
      goto('/');
    } catch (err: any) {
      error = err.message || 'Failed to sign up';
    } finally {
      loading = false;
    }
  }
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

      {#if error}
        <div class="error-message">
          {error}
        </div>
      {/if}

      {#if step === 'check'}
        <form onsubmit={(e) => { e.preventDefault(); checkInvitation(); }}>
          <div class="form-group">
            <label for="email">Email Address</label>
            <input
              id="email"
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
        <form onsubmit={(e) => { e.preventDefault(); handleSignup(); }}>
          <div class="form-group">
            <label for="name">Full Name</label>
            <input
              id="name"
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
              type="password"
              bind:value={password}
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
              type="password"
              bind:value={confirmPassword}
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
            onclick={() => { step = 'check'; error = ''; }}
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
