<script lang="ts">
  import { invalidateAll } from '$app/navigation';

  interface Calendar {
    name: string;
    url: string;
    description: string | null;
    eventCount: number;
    color: string;
    enabled: boolean;
  }

  interface Connection {
    id: string;
    email: string;
    password_encrypted: string;
    server_url: string;
    selected_calendars: any[];
    sync_past_days: string;
    sync_future_days: string;
  }

  interface Props {
    show: boolean;
    connection?: Connection | null;
    onClose: () => void;
  }

  let { show = $bindable(), connection = null, onClose }: Props = $props();

  // Step state - use $derived to react to connection changes
  let currentStep = $state(1);
  let totalSteps = $derived(connection ? 3 : 4); // Only 3 steps in edit mode (skip credentials)
  let isEditMode = $derived(connection !== null);

  // Update step when connection changes
  $effect(() => {
    currentStep = connection ? 2 : 1;
  });

  // Step 1: Connection
  let email = $state('');
  let password = $state('');
  let provider = $state<'icloud' | 'google'>('icloud');
  let step1Loading = $state(false);
  let step1Error = $state('');

  // Step 2: Calendar Selection
  let availableCalendars = $state<Calendar[]>([]);
  let step2Loading = $state(false);
  let step2Error = $state('');

  // Step 3: Sync Settings
  let syncPastDays = $state(connection?.sync_past_days ? parseInt(connection.sync_past_days) : 30);
  let syncFutureDays = $state(connection?.sync_future_days ? parseInt(connection.sync_future_days) : 365);

  // Step 4: Results
  let syncResults = $state<any>(null);
  let step4Loading = $state(false);

  // Load calendars when in edit mode
  $effect(() => {
    if (isEditMode && connection && show && availableCalendars.length === 0) {
      loadCalendarsForEdit();
    }
  });

  function loadCalendarsForEdit() {
    if (!connection) return;

    // Load calendars directly from the stored selected_calendars (which now contains ALL calendars)
    const storedCalendars = connection.selected_calendars || [];

    if (storedCalendars.length > 0) {
      // Check if this is old data (missing 'enabled' field means only selected calendars were stored)
      const hasEnabledField = storedCalendars.some((cal: any) => cal.enabled !== undefined);

      availableCalendars = storedCalendars.map((cal: any) => ({
        name: cal.name,
        url: cal.url,
        enabled: cal.enabled !== undefined ? cal.enabled : true, // Default to enabled for backwards compatibility
        eventCount: cal.eventCount || 0,
        color: cal.color || '#3b82f6',
        description: cal.description || null,
      }));

      // Warn if using old format
      if (!hasEnabledField) {
        step2Error = 'This connection uses old format. Only currently synced calendars are shown. To see all calendars, delete and reconnect.';
      }
    } else {
      // No stored calendars - this is an old connection, user needs to reconnect
      step2Error = 'No calendar data found. Please delete and reconnect this calendar.';
    }
  }

  function getServerUrl(prov: 'icloud' | 'google'): string {
    return prov === 'icloud'
      ? 'https://caldav.icloud.com'
      : 'https://apidata.googleusercontent.com/caldav/v2/';
  }

  async function handleStep1Next() {
    if (!email || !password) {
      step1Error = 'Please enter both email and password';
      return;
    }

    step1Loading = true;
    step1Error = '';

    try {
      const serverUrl = getServerUrl(provider);
      const response = await fetch('/api/caldav/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, serverUrl }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch calendars');
      }

      // Initialize calendars with all enabled by default (easier to uncheck unwanted ones)
      availableCalendars = result.calendars.map((cal: any) => ({
        ...cal,
        enabled: true,
      }));

      currentStep = 2;
    } catch (err: any) {
      step1Error = err.message || 'Failed to connect. Please check your credentials.';
    } finally {
      step1Loading = false;
    }
  }

  async function handleStep2Next() {
    const selectedCalendars = availableCalendars.filter(cal => cal.enabled);
    if (selectedCalendars.length === 0) {
      step2Error = 'Please select at least one calendar';
      return;
    }
    step2Error = '';
    currentStep = 3;
  }

  async function handleStep3Next() {
    currentStep = 4;
    await performSync();
  }

  async function performSync() {
    step4Loading = true;

    try {
      // Save ALL calendars with their enabled status (not just selected ones)
      const allCalendars = availableCalendars.map(cal => ({
        name: cal.name,
        url: cal.url,
        enabled: cal.enabled,
        eventCount: cal.eventCount,
        color: cal.color,
      }));

      let connectionId: string;

      if (isEditMode && connection) {
        // Update existing connection
        const updateResponse = await fetch('/api/caldav/connections/update-calendars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connectionId: connection.id,
            selectedCalendars: allCalendars,
            syncPastDays,
            syncFutureDays,
          }),
        });

        const updateResult = await updateResponse.json();

        if (!updateResponse.ok) {
          throw new Error(updateResult.error || 'Failed to update calendar settings');
        }

        connectionId = connection.id;
      } else {
        // Create new connection
        const serverUrl = getServerUrl(provider);
        const connectionResponse = await fetch('/api/caldav/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            serverUrl,
            displayName: email,
            selectedCalendars: allCalendars,
            syncPastDays,
            syncFutureDays,
          }),
        });

        const connectionResult = await connectionResponse.json();

        if (!connectionResponse.ok) {
          throw new Error(connectionResult.error || 'Failed to save connection');
        }

        connectionId = connectionResult.connection.id;
      }

      // Trigger sync
      const syncResponse = await fetch('/api/caldav/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });

      const syncResult = await syncResponse.json();

      if (!syncResponse.ok) {
        throw new Error(syncResult.error || 'Sync failed');
      }

      // Get only enabled calendars for results display
      const enabledCalendars = allCalendars.filter(cal => cal.enabled);

      syncResults = {
        calendarsCount: enabledCalendars.length,
        eventsCount: enabledCalendars.reduce((sum, cal) => sum + cal.eventCount, 0),
        calendars: enabledCalendars.map(cal => ({
          name: cal.name,
          eventCount: cal.eventCount,
          color: cal.color,
        })),
      };

      await invalidateAll();
    } catch (err: any) {
      syncResults = {
        error: err.message || 'Sync failed',
      };
    } finally {
      step4Loading = false;
    }
  }

  function toggleCalendar(index: number) {
    availableCalendars[index].enabled = !availableCalendars[index].enabled;
  }

  function toggleAllCalendars() {
    const allEnabled = availableCalendars.every(cal => cal.enabled);
    availableCalendars = availableCalendars.map(cal => ({
      ...cal,
      enabled: !allEnabled,
    }));
  }

  function handleClose() {
    // Reset state
    currentStep = connection ? 2 : 1; // Reset to appropriate starting step
    if (!connection) {
      email = '';
      password = '';
    }
    availableCalendars = [];
    syncResults = null;
    step1Error = '';
    step2Error = '';
    onClose();
  }

  function handleBack() {
    const minStep = connection ? 2 : 1; // Can't go back past step 2 in edit mode
    if (currentStep > minStep) {
      currentStep--;
    } else if (connection && currentStep === 2) {
      // In edit mode at first step - close modal instead
      handleClose();
    }
  }
</script>

{#if show}
  <div class="modal-overlay" onclick={handleClose}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <!-- Progress indicator -->
      <div class="progress-bar">
        {#each Array(totalSteps) as _, i}
          {@const stepNum = isEditMode ? i + 2 : i + 1}
          {@const displayNum = isEditMode ? i + 1 : i + 1}
          <div class="progress-step" class:active={stepNum <= currentStep} class:current={stepNum === currentStep}>
            <div class="step-number">{displayNum}</div>
            <div class="step-label">
              {#if isEditMode}
                {i === 0 ? 'Select' : i === 1 ? 'Settings' : 'Done'}
              {:else}
                {i === 0 ? 'Connect' : i === 1 ? 'Select' : i === 2 ? 'Settings' : 'Done'}
              {/if}
            </div>
          </div>
          {#if i < totalSteps - 1}
            <div class="progress-line" class:active={stepNum < currentStep}></div>
          {/if}
        {/each}
      </div>

      <!-- Step content -->
      <div class="modal-body">
        {#if currentStep === 1}
          <!-- Step 1: Connection -->
          <div class="step-content">
            <h2>Connect Your Calendar</h2>
            <p class="step-description">Enter your calendar credentials to get started</p>

            {#if step1Error}
              <div class="error-message">{step1Error}</div>
            {/if}

            <div class="form-group">
              <label for="provider">Calendar Provider</label>
              <select id="provider" bind:value={provider} class="input">
                <option value="icloud">📱 iCloud Calendar</option>
                <option value="google">📧 Google Calendar</option>
              </select>
            </div>

            <div class="form-group">
              <label for="email">Email Address</label>
              <input
                id="email"
                type="email"
                bind:value={email}
                placeholder={provider === 'icloud' ? 'you@icloud.com' : 'you@gmail.com'}
                class="input"
              />
            </div>

            <div class="form-group">
              <label for="password">App-Specific Password</label>
              <input
                id="password"
                type="password"
                bind:value={password}
                placeholder="xxxx-xxxx-xxxx-xxxx"
                class="input"
              />
              <p class="help-text">
                {#if provider === 'icloud'}
                  Generate at <a href="https://appleid.apple.com" target="_blank">appleid.apple.com</a> → Security → App-Specific Passwords
                {:else}
                  Generate at <a href="https://myaccount.google.com/apppasswords" target="_blank">myaccount.google.com/apppasswords</a>
                {/if}
              </p>
            </div>
          </div>
        {:else if currentStep === 2}
          <!-- Step 2: Calendar Selection -->
          <div class="step-content">
            <h2>{isEditMode ? 'Manage Calendars' : 'Select Calendars to Sync'}</h2>
            <p class="step-description">
              {#if step2Loading}
                Loading calendars...
              {:else}
                Found {availableCalendars.length} calendars
                <button class="link-button" onclick={toggleAllCalendars}>
                  {availableCalendars.every(cal => cal.enabled) ? 'Deselect All' : 'Select All'}
                </button>
              {/if}
            </p>

            {#if step2Error}
              <div class="error-message">{step2Error}</div>
            {/if}

            <div class="calendars-list">
              {#each availableCalendars as calendar, index}
                <label class="calendar-item">
                  <input
                    type="checkbox"
                    checked={calendar.enabled}
                    onchange={() => toggleCalendar(index)}
                  />
                  <div class="calendar-color" style="background-color: {calendar.color}"></div>
                  <div class="calendar-details">
                    <div class="calendar-name">{calendar.name}</div>
                    <div class="calendar-count">{calendar.eventCount} events</div>
                  </div>
                </label>
              {/each}
            </div>
          </div>
        {:else if currentStep === 3}
          <!-- Step 3: Sync Settings -->
          <div class="step-content">
            <h2>Sync Settings</h2>
            <p class="step-description">Configure how far back and forward to sync events</p>

            <div class="settings-grid">
              <div class="setting-group">
                <label>Sync Past Events</label>
                <div class="radio-group">
                  <label class="radio-option">
                    <input type="radio" name="past" value={30} bind:group={syncPastDays} />
                    <span>30 days</span>
                  </label>
                  <label class="radio-option">
                    <input type="radio" name="past" value={90} bind:group={syncPastDays} />
                    <span>90 days</span>
                  </label>
                  <label class="radio-option">
                    <input type="radio" name="past" value={365} bind:group={syncPastDays} />
                    <span>1 year</span>
                  </label>
                </div>
              </div>

              <div class="setting-group">
                <label>Sync Future Events</label>
                <div class="radio-group">
                  <label class="radio-option">
                    <input type="radio" name="future" value={365} bind:group={syncFutureDays} />
                    <span>1 year</span>
                  </label>
                  <label class="radio-option">
                    <input type="radio" name="future" value={730} bind:group={syncFutureDays} />
                    <span>2 years</span>
                  </label>
                  <label class="radio-option">
                    <input type="radio" name="future" value={1825} bind:group={syncFutureDays} />
                    <span>5 years</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="sync-summary">
              <strong>Selected:</strong>
              {availableCalendars.filter(cal => cal.enabled).length} calendars,
              approximately {availableCalendars.filter(cal => cal.enabled).reduce((sum, cal) => sum + cal.eventCount, 0)} events
            </div>
          </div>
        {:else if currentStep === 4}
          <!-- Step 4: Results -->
          <div class="step-content">
            {#if step4Loading}
              <div class="loading-state">
                <div class="spinner"></div>
                <p>Syncing calendars...</p>
              </div>
            {:else if syncResults?.error}
              <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h2>Sync Failed</h2>
                <p>{syncResults.error}</p>
              </div>
            {:else if syncResults}
              <div class="success-state">
                <div class="success-icon">✓</div>
                <h2>Sync Complete!</h2>
                <p class="success-message">
                  Successfully synced {syncResults.calendarsCount} calendars
                  with {syncResults.eventsCount} events
                </p>

                <div class="results-list">
                  {#each syncResults.calendars as calendar}
                    <div class="result-item">
                      <div class="calendar-color" style="background-color: {calendar.color}"></div>
                      <div class="result-name">{calendar.name}</div>
                      <div class="result-count">{calendar.eventCount} events</div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Footer with navigation buttons -->
      <div class="modal-footer">
        {#if currentStep > 1 && currentStep < 4}
          <button class="btn btn-secondary" onclick={handleBack}>
            ← Back
          </button>
        {/if}

        {#if currentStep < 4}
          <button
            class="btn btn-primary"
            onclick={() => {
              if (currentStep === 1) handleStep1Next();
              else if (currentStep === 2) handleStep2Next();
              else if (currentStep === 3) handleStep3Next();
            }}
            disabled={step1Loading || step2Loading}
          >
            {currentStep === 3 ? 'Sync' : 'Next'} →
          </button>
        {:else}
          <button class="btn btn-primary" onclick={handleClose}>
            Done
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  .progress-bar {
    display: flex;
    align-items: center;
    padding: 2rem 2rem 1rem;
    gap: 0.5rem;
  }

  .progress-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
  }

  .step-number {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #e5e7eb;
    color: #9ca3af;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.875rem;
    transition: all 0.3s;
  }

  .progress-step.active .step-number {
    background: #3b82f6;
    color: white;
  }

  .progress-step.current .step-number {
    background: #3b82f6;
    color: white;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
  }

  .step-label {
    font-size: 0.75rem;
    color: #6b7280;
    font-weight: 500;
  }

  .progress-step.active .step-label {
    color: #111827;
  }

  .progress-line {
    height: 2px;
    flex: 1;
    background: #e5e7eb;
    transition: background 0.3s;
  }

  .progress-line.active {
    background: #3b82f6;
  }

  .modal-body {
    padding: 1.5rem 2rem;
    overflow-y: auto;
    flex: 1;
  }

  .step-content {
    animation: fadeIn 0.3s;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #111827;
  }

  .step-description {
    color: #6b7280;
    margin: 0 0 1.5rem 0;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  .input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    transition: border-color 0.2s;
  }

  .input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .help-text {
    font-size: 0.75rem;
    color: #6b7280;
    margin: 0.5rem 0 0 0;
  }

  .help-text a {
    color: #3b82f6;
    text-decoration: none;
  }

  .help-text a:hover {
    text-decoration: underline;
  }

  .link-button {
    background: none;
    border: none;
    color: #3b82f6;
    font-size: 0.875rem;
    cursor: pointer;
    padding: 0;
    text-decoration: underline;
  }

  .calendars-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 300px;
    overflow-y: auto;
  }

  .calendar-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .calendar-item:hover {
    border-color: #d1d5db;
    background: #f9fafb;
  }

  .calendar-item input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  .calendar-color {
    width: 4px;
    height: 32px;
    border-radius: 2px;
  }

  .calendar-details {
    flex: 1;
  }

  .calendar-name {
    font-weight: 500;
    color: #111827;
    margin-bottom: 0.25rem;
  }

  .calendar-count {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .settings-grid {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .setting-group label {
    margin-bottom: 0.75rem;
  }

  .radio-group {
    display: flex;
    gap: 1rem;
  }

  .radio-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-weight: normal;
  }

  .radio-option input[type="radio"] {
    cursor: pointer;
  }

  .sync-summary {
    margin-top: 2rem;
    padding: 1rem;
    background: #f3f4f6;
    border-radius: 8px;
    font-size: 0.875rem;
    color: #374151;
  }

  .loading-state,
  .error-state,
  .success-state {
    text-align: center;
    padding: 2rem;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #e5e7eb;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .success-icon,
  .error-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .success-icon {
    color: #10b981;
  }

  .error-icon {
    color: #ef4444;
  }

  .success-message {
    color: #6b7280;
    margin-bottom: 2rem;
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 200px;
    overflow-y: auto;
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: #f9fafb;
    border-radius: 8px;
  }

  .result-name {
    flex: 1;
    font-weight: 500;
    color: #111827;
  }

  .result-count {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .error-message {
    background: #fee2e2;
    color: #991b1b;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .modal-footer {
    display: flex;
    justify-content: space-between;
    padding: 1.5rem 2rem;
    border-top: 1px solid #e5e7eb;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #2563eb;
  }

  .btn-secondary {
    background: #f3f4f6;
    color: #374151;
  }

  .btn-secondary:hover {
    background: #e5e7eb;
  }
</style>
