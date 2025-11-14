# How to Set Up Calendar Sync

This guide will walk you through connecting your iPhone/iCloud calendar to your Home Dashboard so all your events sync automatically.

## What You'll Need (5 minutes)

For each family member who wants to sync their calendar:

1. ✅ **Apple ID email** (e.g., `you@icloud.com`)
2. ✅ **App-specific password** (generated once, never expires)

## Step 1: Generate App-Specific Password (One-Time Setup)

Apple requires app-specific passwords for security. This is a one-time setup per person.

### On Your iPhone:

1. Open **Settings** app
2. Tap your **name** at the top
3. Tap **Sign-In & Security**
4. Tap **App-Specific Passwords**
5. Tap **+** (or "Generate an app-specific password...")
6. Enter "Home Dashboard" as the password label
7. Tap **Create**
8. **Important**: Copy the password that appears (format: `xxxx-xxxx-xxxx-xxxx`)
   - You won't be able to see it again!
   - Save it somewhere safe temporarily

### On Mac/PC:

1. Go to https://appleid.apple.com
2. Sign in with your Apple ID
3. In the **Security** section, click **App-Specific Passwords**
4. Click **Generate Password** (the + icon)
5. Enter "Home Dashboard" as the label
6. Click **Create**
7. **Copy the password** that appears (format: `xxxx-xxxx-xxxx-xxxx`)
   - Save it somewhere safe temporarily

## Step 2: Connect Calendar in Home Dashboard

1. **Open your Home Dashboard** web app
   - Visit: `https://app.yourdomain.com` (or your deployed URL)
   - Log in with your account

2. **Go to Settings → Calendar Sync**
   - Click your profile picture (top right)
   - Select **Settings**
   - Click **Calendar Sync** in the sidebar

3. **Click "Connect Calendar"** button

4. **Fill in the form:**
   - **Calendar Provider**: Select "iCloud Calendar"
   - **Email Address**: Enter your Apple ID email (e.g., `you@icloud.com`)
   - **App-Specific Password**: Paste the password from Step 1

5. **Click "Connect & Sync"**

6. **Wait for sync to complete**
   - You'll see "Connecting..." then "Syncing..."
   - First sync takes 1-5 minutes (depending on event count)
   - Status will show "✓ Success" when done

## Step 3: Verify It's Working

### Check in Home Dashboard:

1. Go to your **Calendar view** (main screen)
2. You should see all your iPhone calendar events
3. Events are color-coded by calendar (Personal, Work, Family, etc.)

### Test Bidirectional Sync:

**From iPhone → Dashboard:**
1. Open **Calendar app** on your iPhone
2. Create a test event: "Test from iPhone"
3. Wait ~15 minutes (or manually sync in settings)
4. Check Home Dashboard - event should appear

**From Dashboard → iPhone:**
1. Create an event in Home Dashboard
2. Wait ~15 minutes
3. Check **Calendar app** on iPhone - event should appear

🎉 **You're all set!** Events now sync automatically every 15 minutes.

## For Multiple Family Members

Repeat Steps 1-3 for each person in your family:
- Partner creates their own app-specific password
- They log into Home Dashboard with their account
- They connect their own iCloud calendar
- All family events appear together on wall display

## Sync Behavior

### What Syncs:
- ✅ All calendar events (past 30 days, future 365 days)
- ✅ Event titles, descriptions, times, locations
- ✅ All-day events
- ✅ Recurring events (daily, weekly, monthly, etc.)
- ✅ Event colors (from calendar color)

### When Syncs Happen:
- **Automatically**: Every 15 minutes
- **Initial sync**: When you first connect (1-5 minutes)
- **Manual sync**: Click "⟳" button next to connection

### Bidirectional:
- Changes on iPhone → sync to Dashboard
- Changes in Dashboard → sync to iPhone
- Changes sync both ways automatically

## Troubleshooting

### "Failed to connect" Error

**Most common cause**: Wrong password

**Solution**:
1. Generate a NEW app-specific password (Step 1)
2. Try connecting again with new password
3. Make sure you're copying the FULL password (16 characters with dashes)

### "Not authenticated" Error

**Cause**: Not logged in to Home Dashboard

**Solution**:
1. Log out completely
2. Log back in
3. Try connecting calendar again

### "No family found" Error

**Cause**: Your account isn't part of a family yet

**Solution**:
1. Go to **Settings** → **Family**
2. Either:
   - Create a new family, OR
   - Accept a family invitation
3. Then connect your calendar

### Events Not Appearing

**Check these:**
1. Is sync status showing "✓ Success"? (not "⚠ Error")
2. Is sync enabled? (not paused with ⏸ icon)
3. Has it been 15+ minutes since you created the event?
4. Try manual sync: Click "⟳" button

**Force a sync:**
1. Go to **Settings** → **Calendar Sync**
2. Click "⟳" button next to your connection
3. Wait 1-2 minutes
4. Check calendar view again

### "Last synced: Never" Won't Update

**Solution**:
1. Click the "⟳ Sync Now" button
2. Wait 1-2 minutes
3. Refresh the page
4. Status should update

### Want to Stop Syncing Temporarily

**Pause sync:**
1. Go to **Settings** → **Calendar Sync**
2. Click "⏸" button next to connection
3. Sync stops until you click "▶" to resume

**Delete connection:**
1. Click "🗑" button next to connection
2. Confirm deletion
3. Events already synced will remain in Dashboard
4. No new syncs will happen

## Security & Privacy

### Your Data:
- ✅ App-specific password is encrypted in database
- ✅ Only you can see your calendar connection
- ✅ Password never sent to client/browser
- ✅ All communication over HTTPS

### App-Specific Password:
- ❌ Does NOT give access to your main Apple ID
- ✅ Only works for calendar access (CalDAV protocol)
- ✅ Can be revoked anytime at appleid.apple.com
- ✅ If compromised, revoke and generate new one

### Revoking Access:
If you want to stop Home Dashboard from accessing your calendar:

**Option 1: Delete in Dashboard**
1. Settings → Calendar Sync
2. Click "🗑" next to connection

**Option 2: Revoke on Apple**
1. Go to https://appleid.apple.com
2. Security → App-Specific Passwords
3. Find "Home Dashboard"
4. Click "Revoke"

## Advanced

### Connect Google Calendar Too

Same process works for Google Calendar!

1. Go to https://myaccount.google.com/apppasswords
2. Generate app password for "Home Dashboard"
3. In Calendar Sync settings, select "Google Calendar"
4. Enter Gmail address and app password
5. Connect!

Both iCloud and Google calendars can sync simultaneously.

### Sync Multiple Calendars

Each family member can connect their own calendar:
- You connect your iPhone calendar
- Partner connects their iPhone calendar
- Kids connect their Google calendars (if applicable)

All events appear together on wall display, color-coded by person.

### Change Sync Frequency

Currently syncs every 15 minutes. Want faster?

Contact support to enable 5-minute sync intervals (may impact battery on Raspberry Pi).

## Getting Help

### Connection Issues:
- Check your internet connection
- Try generating a fresh app-specific password
- Make sure your Apple ID is active

### Sync Issues:
- Check sync status in Settings → Calendar Sync
- Look for error messages
- Try manual sync with "⟳" button

### Still Need Help?
- Check logs in Settings → Calendar Sync → Advanced → View Sync Log
- Contact support with error message

---

**Need more help?** Check the [full technical documentation](CALENDAR_SYNC_PLAN.md) or reach out to support.
