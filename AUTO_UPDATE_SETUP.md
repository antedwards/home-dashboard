# Auto-Update System Setup Guide

This guide explains how to set up the automatic update system for the Home Dashboard Electron app.

## Overview

The auto-update system uses:
- **Supabase Storage** for hosting update files (with authentication)
- **GitHub Actions** for automated building and deployment
- **electron-updater** for client-side update checking and installation
- **SHA-256 checksums** for verifying file integrity

## Architecture

```
┌─────────────┐     Push Tag      ┌──────────────┐
│   GitHub    │ ─────────────────▶│ GitHub       │
│ Repository  │                   │ Actions      │
└─────────────┘                   └──────┬───────┘
                                         │
                                         │ Build & Upload
                                         ▼
                                  ┌──────────────┐
                                  │  Supabase    │
                                  │  Storage     │
                                  │ (app-updates)│
                                  └──────┬───────┘
                                         │
                                         │ Authenticated Download
                                         ▼
                                  ┌──────────────┐
                                  │  Electron    │
                                  │  Desktop App │
                                  └──────────────┘
```

## Prerequisites

1. **Supabase Project**
   - Active Supabase project
   - Service role key (for CI/CD uploads)

2. **GitHub Repository**
   - Write access to configure secrets
   - Ability to create tags/releases

3. **Domain with Cloudflare** (optional)
   - For putting CDN in front of Supabase Storage
   - Improves download speeds and reduces costs

## Step 1: Configure Supabase Storage

### 1.1 Run the Migration

The storage bucket is created automatically via migration:

```bash
cd supabase
supabase db push
```

This creates:
- `app-updates` storage bucket (private)
- RLS policies for authenticated device access
- Service role upload permissions

### 1.2 Verify Bucket Creation

In Supabase Dashboard:
1. Go to **Storage** section
2. Verify `app-updates` bucket exists
3. Check it's marked as **Private**

## Step 2: Configure GitHub Secrets

Add the following secrets to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:

| Secret Name | Description | Where to Find |
|------------|-------------|---------------|
| `SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (NOT anon key!) | Supabase Dashboard → Settings → API → service_role (secret) |
| `UPDATE_SERVER_URL` | Your web app URL + `/api/updates` | e.g., `https://yourdomain.com/api/updates` |

### Important Security Notes

⚠️ **NEVER** commit these secrets to git
⚠️ **USE** the service_role key (NOT the anon key) for GitHub Actions
⚠️ **KEEP** service_role key secure - it bypasses RLS

## Step 3: Configure Electron App

### 3.1 Update Environment Variables

Create/update `apps/electron/.env`:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Web App URL (for device pairing and API calls)
VITE_WEB_APP_URL=https://yourdomain.com

# Update Server URL (must match GitHub secret)
VITE_UPDATE_SERVER_URL=https://yourdomain.com/api/updates
```

### 3.2 Verify package.json Version

Ensure `apps/electron/package.json` has the correct version:

```json
{
  "version": "0.1.0"
}
```

This version is used by:
- Electron app metadata
- Update comparison logic
- GitHub Actions tagging

## Step 4: Deploy Web App

The web app must be deployed and accessible at `VITE_UPDATE_SERVER_URL` for the update API to work.

### 4.1 Deploy to Production

```bash
# Build web app
pnpm --filter @home-dashboard/web build

# Deploy to your hosting provider
# (Vercel, Netlify, or your own server)
```

### 4.2 Verify API Endpoint

Test the update endpoint:

```bash
curl -H "Authorization: Bearer YOUR_DEVICE_TOKEN" \
  "https://yourdomain.com/api/updates/latest?platform=linux&arch=x64&version=0.1.0"
```

Expected response (when no updates):
```json
{
  "updateAvailable": false
}
```

## Step 5: Build and Release

### 5.1 Create a Version Tag

```bash
# Commit all changes
git add .
git commit -m "Release v0.1.0"

# Create and push version tag
git tag v0.1.0
git push origin v0.1.0
```

### 5.2 Monitor GitHub Actions

1. Go to **Actions** tab in GitHub
2. Watch the "Build and Release Electron App" workflow
3. Wait for all build jobs to complete

The workflow will:
- Build for macOS (x64, ARM64)
- Build for Linux (x64, ARM64, ARMv7)
- Build for Windows (x64)
- Generate SHA-256 checksums
- Upload all files to Supabase Storage

### 5.3 Verify Upload

In Supabase Dashboard → Storage → app-updates:

You should see files like:
```
home-dashboard-0.1.0-linux-x64.AppImage
home-dashboard-0.1.0-linux-x64.AppImage.sha256
home-dashboard-0.1.0-linux-arm64.AppImage
home-dashboard-0.1.0-linux-arm64.AppImage.sha256
... (etc for each platform)
```

## Step 6: Install on Raspberry Pi

### 6.1 Download Initial Version

For Raspberry Pi (ARM64):

```bash
# Get signed download URL from web app (requires authentication)
# Or download from Supabase Storage directly with service role

# Make executable
chmod +x home-dashboard-0.1.0-linux-arm64.AppImage

# Run
./home-dashboard-0.1.0-linux-arm64.AppImage
```

### 6.2 Pair Device

1. App will show pairing screen
2. Click "Open Web App for Automatic Pairing"
3. Log in with your account
4. Device automatically pairs via deep link

### 6.3 Verify Auto-Update

The app will:
- Check for updates on startup (5 seconds after launch)
- Show update notification banner when available
- Allow manual "Check for Updates" button

## Step 7: Testing Updates

### 7.1 Create a New Version

1. Update version in `apps/electron/package.json`:
   ```json
   {
     "version": "0.2.0"
   }
   ```

2. Make some visible changes (e.g., add a feature)

3. Commit and tag:
   ```bash
   git add .
   git commit -m "Release v0.2.0 - Added new feature"
   git tag v0.2.0
   git push origin v0.2.0
   ```

### 7.2 Wait for Build

- GitHub Actions will build and upload new version
- Usually takes 15-30 minutes for all platforms

### 7.3 Test Update on Device

On your Raspberry Pi:
1. Open the app (should be on v0.1.0)
2. Click "Check for Updates" button
3. Should see "Update Available! Version 0.2.0"
4. Click "Download Update"
5. Wait for download to complete
6. App installs update and restarts
7. Verify new version is running

## Optional: Cloudflare CDN Setup

### Why Use Cloudflare?

- Faster downloads (CDN caching)
- Reduced Supabase bandwidth costs
- Better reliability
- Custom domain

### Setup Steps

1. **Add Domain to Cloudflare**
   - Add your domain to Cloudflare
   - Update nameservers at your registrar

2. **Create CNAME Record**
   ```
   Type: CNAME
   Name: updates
   Target: your-project.supabase.co
   Proxied: Yes (orange cloud)
   ```

3. **Update Environment Variables**
   ```bash
   VITE_UPDATE_SERVER_URL=https://updates.yourdomain.com/api/updates
   ```

4. **Configure Cloudflare Page Rules**
   - URL: `updates.yourdomain.com/storage/v1/object/sign/*`
   - Cache Level: Standard
   - Edge Cache TTL: 2 hours

## Troubleshooting

### Update Check Fails

**Error:** "Unauthorized"
- Verify device token is valid
- Check token hasn't expired (90 days)
- Extend token in web app if needed

**Error:** "No updates available" (but you know there is)
- Check version number in electron package.json
- Verify files uploaded to Supabase Storage
- Check UPDATE_SERVER_URL is correct

### Download Fails

**Error:** "Checksum verification failed"
- Re-upload files to Supabase Storage
- Ensure .sha256 files are uploaded correctly

**Error:** "Download failed"
- Check Supabase Storage permissions
- Verify signed URL is valid (1 hour expiry)

### App Won't Update

**Linux AppImage:**
- Ensure AppImage is executable: `chmod +x`
- May need manual installation on Linux
- Auto-update works best on macOS/Windows

**Permissions Error:**
- Check app has write access to temp directory
- Verify system permissions for auto-update

## Security Considerations

1. **Device Authentication**
   - All update downloads require valid device token
   - Tokens expire after 90 days
   - Users can extend tokens via web app

2. **Checksum Verification**
   - SHA-256 checksums verified on download
   - Prevents corrupted or tampered files

3. **HTTPS Only**
   - All communications over HTTPS
   - Supabase Storage uses signed URLs

4. **Service Role Key**
   - Only used in GitHub Actions
   - Never exposed to client apps
   - Stored as GitHub Secret

## Monitoring

### Track Update Adoption

Query Supabase to see device versions:

```sql
SELECT
  device_name,
  device_type,
  last_used_at,
  created_at
FROM device_tokens
WHERE user_id = 'your-user-id'
ORDER BY last_used_at DESC;
```

### Monitor Storage Usage

Supabase Dashboard → Storage → app-updates:
- Check total storage used
- Monitor bandwidth usage
- Clean up old versions if needed

## Cost Estimation

### Supabase Free Tier

- **Storage:** 1 GB included
- **Bandwidth:** 2 GB/month included

### Typical Usage

- Each full release: ~200-500 MB (all platforms)
- Per device update: ~100 MB download
- 10 devices × 1 update/month = ~1 GB bandwidth

### Tips to Reduce Costs

1. Use Cloudflare CDN (free tier)
2. Delete old releases after 30 days
3. Use delta updates (future enhancement)
4. Compress builds with brotli/gzip

## Future Enhancements

- [ ] Delta/incremental updates (only download changes)
- [ ] Update scheduling (install at specific time)
- [ ] Rollback capability
- [ ] Beta/alpha channels
- [ ] Update analytics dashboard
- [ ] Automatic old version cleanup

## Support

If you encounter issues:

1. Check GitHub Actions logs for build errors
2. Verify Supabase Storage permissions
3. Test API endpoint with curl
4. Check Electron app console logs
5. Review device token validity

---

**Last Updated:** 2025-01-13
