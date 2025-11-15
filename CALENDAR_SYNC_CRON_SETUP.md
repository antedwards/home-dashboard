# Calendar Sync - Automatic Sync Setup

This document explains how to set up automatic 15-minute calendar syncing for the Home Dashboard.

## Overview

The calendar sync system includes an automatic cron endpoint that:
- Pulls events from all connected CalDAV servers (iCloud, Google, etc.)
- Handles event updates and cancellations
- Runs every 15 minutes
- Syncs events from 30 days ago to 365 days in the future

## Cron Endpoint

**URL**: `https://your-domain.com/api/caldav/cron`

**Method**: GET

**Authentication**: Requires `x-cron-secret` header with your secret token

## Setup Options

### Option 1: Cloudflare Cron Triggers (Recommended for Cloudflare Pages)

If you're deploying to Cloudflare Pages:

1. Create a `wrangler.toml` file in your project root:

```toml
name = "home-dashboard"
compatibility_date = "2024-01-01"

[triggers]
crons = ["*/15 * * * *"]  # Every 15 minutes
```

2. Set the `CRON_SECRET` environment variable in Cloudflare Pages settings:
   - Go to your project settings
   - Add environment variable: `CRON_SECRET=your-random-secret-here`
   - Generate a secure random string for the secret

3. Deploy - Cloudflare will automatically call your cron endpoint

### Option 2: External Cron Service

Use a service like cron-job.org, EasyCron, or GitHub Actions:

1. **Set up environment variable**:
   - Add `CRON_SECRET` to your deployment platform's environment variables
   - Use a secure random string (e.g., generate with `openssl rand -hex 32`)

2. **Configure the cron job**:
   - URL: `https://your-domain.com/api/caldav/cron`
   - Method: GET
   - Schedule: Every 15 minutes (`*/15 * * * *`)
   - Custom header: `x-cron-secret: your-secret-here`

#### Example with cron-job.org:
1. Sign up at https://cron-job.org
2. Create new job:
   - Title: "Home Dashboard Calendar Sync"
   - URL: `https://your-domain.com/api/caldav/cron`
   - Schedule: Every 15 minutes
   - Click "HTTP Headers"
   - Add header: `x-cron-secret: your-secret-here`

#### Example with GitHub Actions:

Create `.github/workflows/calendar-sync.yml`:

```yaml
name: Calendar Sync

on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes
  workflow_dispatch:  # Allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Calendar Sync
        run: |
          curl -X GET \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" \
            https://your-domain.com/api/caldav/cron
```

Then add `CRON_SECRET` to your repository secrets.

### Option 3: Manual Sync

Users can also manually trigger a sync from the Calendar Sync settings page by clicking the "Sync Now" button.

## Security

- The cron endpoint requires authentication via the `x-cron-secret` header
- Never commit the secret to your repository
- Use a strong random string (at least 32 characters)
- Rotate the secret if it becomes compromised

## Monitoring

The cron endpoint returns JSON with sync results:

```json
{
  "success": true,
  "results": [
    {
      "connectionId": "...",
      "email": "user@icloud.com",
      "success": true,
      "eventsFound": 45,
      "syncedEvents": 45
    }
  ],
  "message": "Synced 1 of 1 connection(s)"
}
```

You can monitor sync status in the Calendar Sync settings page, which shows:
- Last sync time
- Sync status (success/error)
- Error messages if any

## Troubleshooting

### Cron not running
- Check that the `x-cron-secret` header is correct
- Verify the endpoint URL is correct
- Check server logs for errors

### Events not syncing
- Check connection status in settings page
- Verify CalDAV credentials are still valid
- Check for sync errors in the UI

### Rate limiting
- The default 15-minute interval should be safe for most CalDAV servers
- If you get rate limited, increase the interval to 30 minutes

## Testing

Test the cron endpoint manually:

```bash
curl -X GET \
  -H "x-cron-secret: your-secret-here" \
  https://your-domain.com/api/caldav/cron
```

You should see a JSON response with sync results.
