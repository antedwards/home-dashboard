<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';

  interface CalDAVConnection {
    id: string;
    email: string;
    display_name: string | null;
    server_url: string;
    enabled: boolean;
    last_sync_at: string | null;
    last_sync_status: string | null;
    last_sync_error: string | null;
  }

  let connections = $state<CalDAVConnection[]>([]);
  let loading = $state(true);
  let error = $state('');
  let showAddForm = $state(false);

  // Form state
  let formEmail = $state('');
  let formPassword = $state('');
  let formProvider = $state<'icloud' | 'google'>('icloud');
  let formSubmitting = $state(false);
  let formError = $state('');

  onMount(async () => {
    await loadConnections();
  });

  async function loadConnections() {
    loading = true;
    error = '';

    try {
      const { data, error: fetchError } = await supabase
        .from('caldav_connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      connections = data || [];
    } catch (err: any) {
      error = err.message || 'Failed to load calendar connections';
      console.error('Failed to load connections:', err);
    } finally {
      loading = false;
    }
  }

  function getServerUrl(provider: 'icloud' | 'google'): string {
    return provider === 'icloud'
      ? 'https://caldav.icloud.com'
      : 'https://apidata.googleusercontent.com/caldav/v2/';
  }

  async function testConnection() {
    if (!formEmail || !formPassword) {
      formError = 'Please enter both email and password';
      return;
    }

    formSubmitting = true;
    formError = '';

    try {
      const serverUrl = getServerUrl(formProvider);

      const response = await fetch('/api/caldav/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formEmail,
          password: formPassword,
          serverUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Connection test failed');
      }

      // Connection successful, save it
      await saveConnection(result.displayName);
    } catch (err: any) {
      formError = err.message || 'Failed to connect. Please check your credentials.';
      console.error('Connection test failed:', err);
      formSubmitting = false;
    }
  }

  async function saveConnection(displayName?: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's family
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('family_id')
        .eq('id', user.id)
        .single();

      if (!profile?.family_id) {
        throw new Error('No family found. Please create or join a family first.');
      }

      const serverUrl = getServerUrl(formProvider);

      const { error: insertError } = await supabase
        .from('caldav_connections')
        .insert({
          user_id: user.id,
          family_id: profile.family_id,
          email: formEmail,
          password_encrypted: formPassword, // TODO: Encrypt this properly
          server_url: serverUrl,
          display_name: displayName || formEmail,
          enabled: true,
          last_sync_status: 'pending',
        });

      if (insertError) throw insertError;

      // Reset form
      formEmail = '';
      formPassword = '';
      formSubmitting = false;
      showAddForm = false;

      // Reload connections
      await loadConnections();

      // Trigger initial sync
      await triggerSync();
    } catch (err: any) {
      formError = err.message || 'Failed to save connection';
      console.error('Failed to save connection:', err);
      formSubmitting = false;
    }
  }

  async function triggerSync(connectionId?: string) {
    try {
      const response = await fetch('/api/caldav/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Sync failed');
      }

      // Reload connections to see updated status
      await loadConnections();
    } catch (err: any) {
      console.error('Sync failed:', err);
      error = err.message || 'Failed to sync calendars';
    }
  }

  async function toggleConnection(connection: CalDAVConnection) {
    try {
      const { error: updateError } = await supabase
        .from('caldav_connections')
        .update({ enabled: !connection.enabled })
        .eq('id', connection.id);

      if (updateError) throw updateError;

      await loadConnections();
    } catch (err: any) {
      error = err.message || 'Failed to toggle connection';
      console.error('Failed to toggle connection:', err);
    }
  }

  async function deleteConnection(connection: CalDAVConnection) {
    if (!confirm(`Delete calendar sync for ${connection.email}?`)) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('caldav_connections')
        .delete()
        .eq('id', connection.id);

      if (deleteError) throw deleteError;

      await loadConnections();
    } catch (err: any) {
      error = err.message || 'Failed to delete connection';
      console.error('Failed to delete connection:', err);
    }
  }

  function formatLastSync(timestamp: string | null): string {
    if (!timestamp) return 'Never';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  function getStatusIcon(status: string | null): string {
    switch (status) {
      case 'success': return '✓';
      case 'error': return '⚠';
      case 'pending': return '⟳';
      default: return '○';
    }
  }

  function getStatusColor(status: string | null): string {
    switch (status) {
      case 'success': return '#22c55e';
      case 'error': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  }
</script>

<div class="container">
  <header class="header">
    <h1>Calendar Sync</h1>
    <p class="subtitle">Connect your iCloud or Google Calendar for automatic syncing</p>
  </header>

  {#if error}
    <div class="alert alert-error">
      <span class="alert-icon">⚠</span>
      <span>{error}</span>
      <button class="alert-close" onclick={() => (error = '')}>×</button>
    </div>
  {/if}

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading connections...</p>
    </div>
  {:else}
    <div class="content">
      <!-- Connected Calendars -->
      <section class="section">
        <div class="section-header">
          <h2>Connected Calendars</h2>
          {#if !showAddForm}
            <button class="btn btn-primary" onclick={() => (showAddForm = true)}>
              + Add Calendar
            </button>
          {/if}
        </div>

        {#if connections.length === 0 && !showAddForm}
          <div class="empty-state">
            <div class="empty-icon">📅</div>
            <h3>No calendars connected</h3>
            <p>Connect your iCloud or Google Calendar to sync events automatically</p>
            <button class="btn btn-primary" onclick={() => (showAddForm = true)}>
              Connect Calendar
            </button>
          </div>
        {/if}

        {#if showAddForm}
          <div class="connection-form">
            <div class="form-header">
              <h3>Connect Your Calendar</h3>
              <button class="btn-close" onclick={() => (showAddForm = false)}>×</button>
            </div>

            {#if formError}
              <div class="alert alert-error">
                <span class="alert-icon">⚠</span>
                <span>{formError}</span>
              </div>
            {/if}

            <!-- Step-by-step instructions -->
            <div class="instructions-box">
              <h4>📱 Quick Setup (5 minutes)</h4>

              <!-- Sync capabilities info -->
              <div class="sync-info">
                <span class="sync-badge">🔄 Bidirectional Sync</span>
                <p class="sync-description">
                  Changes sync both ways - create events in Home Dashboard or your calendar app, they'll appear everywhere!
                </p>
              </div>

              {#if formProvider === 'icloud'}
                <ol class="setup-steps">
                  <li>
                    <strong>On your iPhone:</strong>
                    <div class="step-detail">Settings → Your Name → Sign-In & Security → App-Specific Passwords → Create one for "Home Dashboard"</div>
                  </li>
                  <li>
                    <strong>Or on Mac/PC:</strong>
                    <div class="step-detail">
                      Go to <a href="https://appleid.apple.com" target="_blank" rel="noopener">appleid.apple.com</a> → Security → App-Specific Passwords → Generate
                    </div>
                  </li>
                  <li>
                    <strong>Copy the password</strong>
                    <div class="step-detail">It looks like: xxxx-xxxx-xxxx-xxxx (16 characters)</div>
                  </li>
                  <li>
                    <strong>Paste it below</strong>
                    <div class="step-detail">Your calendar will sync automatically every 15 minutes</div>
                  </li>
                </ol>
              {:else}
                <ol class="setup-steps">
                  <li>
                    <strong>Visit Google Account:</strong>
                    <div class="step-detail">
                      Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener">myaccount.google.com/apppasswords</a>
                    </div>
                  </li>
                  <li>
                    <strong>Create app password:</strong>
                    <div class="step-detail">Click "Create" → Name it "Home Dashboard" → Copy the 16-character password</div>
                  </li>
                  <li>
                    <strong>Paste it below</strong>
                    <div class="step-detail">Your calendar will sync automatically every 15 minutes</div>
                  </li>
                </ol>
              {/if}
            </div>

            <div class="form-group">
              <label for="provider">Which calendar do you use?</label>
              <select id="provider" bind:value={formProvider} class="input">
                <option value="icloud">📱 iCloud Calendar (iPhone)</option>
                <option value="google">📧 Google Calendar (Gmail)</option>
              </select>
            </div>

            <div class="form-group">
              <label for="email">Your email address</label>
              <input
                id="email"
                type="email"
                bind:value={formEmail}
                placeholder={formProvider === 'icloud' ? 'you@icloud.com' : 'you@gmail.com'}
                class="input"
                disabled={formSubmitting}
              />
              <p class="help-text-inline">Use your {formProvider === 'icloud' ? 'Apple ID' : 'Gmail address'}</p>
            </div>

            <div class="form-group">
              <label for="password">App-specific password (not your regular password)</label>
              <input
                id="password"
                type="password"
                bind:value={formPassword}
                placeholder="xxxx-xxxx-xxxx-xxxx"
                class="input"
                disabled={formSubmitting}
              />
              <p class="help-text-inline">
                ✨ This is a special password just for this app. Generate one using the steps above.
              </p>
            </div>

            <div class="security-note">
              <span class="security-icon">🔒</span>
              <div class="security-text">
                <strong>Secure & Private</strong>
                <p>This password only works for calendar access. Your main password stays safe. You can revoke it anytime.</p>
              </div>
            </div>

            <div class="form-actions">
              <button
                class="btn btn-primary btn-large"
                onclick={testConnection}
                disabled={formSubmitting || !formEmail || !formPassword}
              >
                {formSubmitting ? '⟳ Connecting...' : '✓ Connect & Start Syncing'}
              </button>
              <button class="btn btn-secondary" onclick={() => (showAddForm = false)} disabled={formSubmitting}>
                Cancel
              </button>
            </div>
          </div>
        {/if}

        {#if connections.length > 0}
          <div class="connections-list">
            {#each connections as connection (connection.id)}
              <div class="connection-card">
                <div class="connection-header">
                  <div class="connection-info">
                    <span class="connection-status" style="color: {getStatusColor(connection.last_sync_status)}">
                      {getStatusIcon(connection.last_sync_status)}
                    </span>
                    <div>
                      <h3 class="connection-email">{connection.email}</h3>
                      <p class="connection-provider">
                        {connection.server_url.includes('icloud') ? 'iCloud Calendar' : 'Google Calendar'}
                      </p>
                    </div>
                  </div>
                  <div class="connection-actions">
                    <button
                      class="btn btn-icon"
                      title={connection.enabled ? 'Pause sync' : 'Resume sync'}
                      onclick={() => toggleConnection(connection)}
                    >
                      {connection.enabled ? '⏸' : '▶'}
                    </button>
                    <button
                      class="btn btn-icon"
                      title="Sync now"
                      onclick={() => triggerSync(connection.id)}
                    >
                      ⟳
                    </button>
                    <button
                      class="btn btn-icon btn-danger"
                      title="Delete"
                      onclick={() => deleteConnection(connection)}
                    >
                      🗑
                    </button>
                  </div>
                </div>

                <div class="connection-details">
                  <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value" style="color: {getStatusColor(connection.last_sync_status)}">
                      {connection.enabled ? (connection.last_sync_status || 'Unknown') : 'Paused'}
                    </span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Last synced:</span>
                    <span class="detail-value">{formatLastSync(connection.last_sync_at)}</span>
                  </div>
                  {#if connection.last_sync_error}
                    <div class="detail-row error">
                      <span class="detail-label">Error:</span>
                      <span class="detail-value">{connection.last_sync_error}</span>
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>

      <!-- Sync Settings -->
      <section class="section">
        <h2>Sync Settings</h2>
        <div class="settings-grid">
          <div class="setting-item">
            <h3>Sync Frequency</h3>
            <p>Every 15 minutes (automatic)</p>
          </div>
          <div class="setting-item">
            <h3>Sync Range</h3>
            <p>30 days past, 365 days future</p>
          </div>
          <div class="setting-item">
            <h3>Direction</h3>
            <p>Bidirectional (both ways)</p>
          </div>
        </div>
      </section>
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .header {
    margin-bottom: 2rem;
  }

  .header h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: #6b7280;
    font-size: 1rem;
  }

  .alert {
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .alert-error {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }

  .alert-icon {
    font-size: 1.25rem;
  }

  .alert-close {
    margin-left: auto;
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
  }

  .alert-close:hover {
    opacity: 1;
  }

  .loading {
    text-align: center;
    padding: 3rem;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #e5e7eb;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .section {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .section h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }

  .btn {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .btn-secondary {
    background: #e5e7eb;
    color: #374151;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #d1d5db;
  }

  .btn-icon {
    padding: 0.5rem;
    font-size: 1.25rem;
    background: transparent;
    border: 1px solid #e5e7eb;
  }

  .btn-icon:hover:not(:disabled) {
    background: #f9fafb;
  }

  .btn-danger:hover:not(:disabled) {
    background: #fee2e2;
    border-color: #fecaca;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .empty-state h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .empty-state p {
    color: #6b7280;
    margin-bottom: 1.5rem;
  }

  .connection-form {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .form-header h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }

  .btn-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #6b7280;
  }

  .btn-close:hover {
    color: #1f2937;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    transition: border-color 0.2s;
  }

  .input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .input:disabled {
    background: #f9fafb;
    cursor: not-allowed;
  }

  .help-text {
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }

  .help-text a {
    color: #667eea;
    text-decoration: none;
  }

  .help-text a:hover {
    text-decoration: underline;
  }

  .help-text-inline {
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 0.5rem;
  }

  .instructions-box {
    background: #f0f9ff;
    border: 2px solid #bae6fd;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .instructions-box h4 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #0c4a6e;
    margin: 0 0 1rem 0;
  }

  .sync-info {
    background: #dcfce7;
    border: 1px solid #86efac;
    border-radius: 6px;
    padding: 0.75rem 1rem;
    margin-bottom: 1rem;
  }

  .sync-badge {
    display: inline-block;
    background: #16a34a;
    color: white;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    margin-bottom: 0.5rem;
  }

  .sync-description {
    color: #15803d;
    font-size: 0.875rem;
    margin: 0.5rem 0 0 0;
    line-height: 1.5;
  }

  .setup-steps {
    margin: 0;
    padding-left: 1.5rem;
    list-style: decimal;
  }

  .setup-steps li {
    margin-bottom: 1rem;
    color: #0c4a6e;
  }

  .setup-steps li:last-child {
    margin-bottom: 0;
  }

  .setup-steps strong {
    display: block;
    margin-bottom: 0.25rem;
    color: #0c4a6e;
  }

  .step-detail {
    font-size: 0.875rem;
    color: #075985;
    margin-top: 0.25rem;
    line-height: 1.5;
  }

  .step-detail a {
    color: #0284c7;
    text-decoration: underline;
    font-weight: 500;
  }

  .step-detail a:hover {
    color: #0369a1;
  }

  .security-note {
    display: flex;
    gap: 0.75rem;
    background: #fef3c7;
    border: 1px solid #fde047;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .security-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .security-text strong {
    display: block;
    color: #78350f;
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }

  .security-text p {
    color: #92400e;
    font-size: 0.875rem;
    margin: 0;
    line-height: 1.5;
  }

  .btn-large {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }

  .connections-list {
    display: grid;
    gap: 1rem;
  }

  .connection-card {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1rem;
  }

  .connection-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .connection-info {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .connection-status {
    font-size: 1.5rem;
    line-height: 1;
  }

  .connection-email {
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 0.25rem;
  }

  .connection-provider {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }

  .connection-actions {
    display: flex;
    gap: 0.5rem;
  }

  .connection-details {
    display: grid;
    gap: 0.5rem;
  }

  .detail-row {
    display: flex;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .detail-row.error {
    color: #dc2626;
  }

  .detail-label {
    font-weight: 500;
    color: #6b7280;
  }

  .detail-value {
    color: #1f2937;
  }

  .settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .setting-item h3 {
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .setting-item p {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }
</style>
