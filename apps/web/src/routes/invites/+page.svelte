<script lang="ts">
  import { onMount } from 'svelte';

  interface Invitation {
    id: string;
    email: string;
    status: string;
    createdAt: string;
    expiresAt: string;
    acceptedAt: string | null;
  }

  let invitations = $state<Invitation[]>([]);
  let loading = $state(false);
  let error = $state('');
  let successMessage = $state('');

  // Form state
  let email = $state('');
  let sendingInvite = $state(false);

  onMount(async () => {
    await loadInvitations();
  });

  async function loadInvitations() {
    try {
      loading = true;
      error = '';
      const response = await fetch('/api/invitations');
      if (!response.ok) throw new Error('Failed to load invitations');
      invitations = await response.json();
    } catch (err: any) {
      error = err.message || 'Failed to load invitations';
    } finally {
      loading = false;
    }
  }

  async function handleSendInvite(e: Event) {
    e.preventDefault();

    if (!email.trim()) {
      error = 'Please enter an email address';
      return;
    }

    try {
      sendingInvite = true;
      error = '';
      successMessage = '';

      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send invitation');
      }

      successMessage = `Invitation sent to ${email}`;
      email = '';
      await loadInvitations();
    } catch (err: any) {
      error = err.message || 'Failed to send invitation';
    } finally {
      sendingInvite = false;
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'accepted':
        return '#10B981';
      case 'expired':
        return '#EF4444';
      case 'cancelled':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  }

  function isExpired(expiresAt: string): boolean {
    return new Date(expiresAt) < new Date();
  }
</script>

<svelte:head>
  <title>Invite Members • Home Dashboard</title>
</svelte:head>

<div class="invites-page">
  <div class="page-header">
    <div>
      <h1>Invite Family Members</h1>
      <p class="subtitle">Invite others to join your family on Home Dashboard</p>
    </div>
  </div>

  <!-- Invite form -->
  <div class="invite-form-card">
    <h2>Send Invitation</h2>
    <p class="description">
      Enter an email address to invite someone to join the platform and your family.
      They will receive an email with a link to create their account.
    </p>

    <form onsubmit={handleSendInvite}>
      <div class="form-group">
        <label for="email">Email Address</label>
        <input
          type="email"
          id="email"
          bind:value={email}
          placeholder="friend@example.com"
          required
          disabled={sendingInvite}
        />
      </div>

      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      {#if successMessage}
        <div class="success-message">{successMessage}</div>
      {/if}

      <button type="submit" class="btn-primary" disabled={sendingInvite}>
        {sendingInvite ? 'Sending...' : 'Send Invitation'}
      </button>
    </form>
  </div>

  <!-- Invitations list -->
  <div class="invitations-card">
    <h2>Pending & Recent Invitations</h2>

    {#if loading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading invitations...</p>
      </div>
    {:else if invitations.length === 0}
      <div class="empty-state">
        <p>No invitations sent yet</p>
      </div>
    {:else}
      <div class="invitations-list">
        {#each invitations as invitation}
          <div class="invitation-item">
            <div class="invitation-info">
              <div class="email">{invitation.email}</div>
              <div class="meta">
                <span class="status" style="color: {getStatusColor(invitation.status)}">
                  {invitation.status}
                </span>
                <span class="separator">•</span>
                <span class="date">
                  Sent {formatDate(invitation.createdAt)}
                </span>
                {#if invitation.status === 'pending'}
                  <span class="separator">•</span>
                  <span class="expires" class:expired={isExpired(invitation.expiresAt)}>
                    {isExpired(invitation.expiresAt) ? 'Expired' : `Expires ${formatDate(invitation.expiresAt)}`}
                  </span>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .invites-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .page-header h1 {
    margin: 0;
    font-size: 2rem;
    font-weight: 600;
    color: #333;
  }

  .subtitle {
    margin: 0.5rem 0 0 0;
    color: #666;
    font-size: 0.875rem;
  }

  .invite-form-card,
  .invitations-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    padding: 2rem;
    margin-bottom: 2rem;
  }

  .invite-form-card h2,
  .invitations-card h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #333;
  }

  .description {
    margin: 0 0 1.5rem 0;
    color: #666;
    font-size: 0.875rem;
    line-height: 1.5;
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
    padding: 0.75rem 1.5rem;
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

  .error-message,
  .success-message {
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .error-message {
    background: #FEE2E2;
    color: #DC2626;
    border: 1px solid #FECACA;
  }

  .success-message {
    background: #D1FAE5;
    color: #059669;
    border: 1px solid #A7F3D0;
  }

  .loading-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    color: #666;
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

  .invitations-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .invitation-item {
    padding: 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    transition: all 0.2s;
  }

  .invitation-item:hover {
    border-color: #d0d0d0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .invitation-info .email {
    font-weight: 500;
    color: #333;
    margin-bottom: 0.25rem;
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: #666;
  }

  .status {
    font-weight: 600;
    text-transform: capitalize;
  }

  .separator {
    color: #d0d0d0;
  }

  .expires.expired {
    color: #EF4444;
    font-weight: 500;
  }

  @media (max-width: 640px) {
    .invites-page {
      padding: 1.5rem 1rem;
    }

    .page-header h1 {
      font-size: 1.5rem;
    }

    .invite-form-card,
    .invitations-card {
      padding: 1.5rem;
    }
  }
</style>
