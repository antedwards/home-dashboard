# Cloudflare Pages Deployment Guide

This guide walks you through deploying your Home Dashboard web app to Cloudflare Pages with a custom subdomain.

## Prerequisites

- A domain managed by Cloudflare (e.g., `yourdomain.com`)
- GitHub repository access
- Cloudflare account

## Step 1: Configure SvelteKit for Cloudflare

✅ **Already done!** The Cloudflare adapter has been installed and configured.

## Step 2: Deploy to Cloudflare Pages

### 2.1 Access Cloudflare Pages

1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your account
3. Go to **Workers & Pages** in the left sidebar
4. Click **Create application** → **Pages** → **Connect to Git**

### 2.2 Connect Your GitHub Repository

1. Click **Connect GitHub** (or GitLab if you prefer)
2. Authorize Cloudflare to access your repositories
3. Select your repository: `antedwards/home-dashboard`
4. Click **Begin setup**

### 2.3 Configure Build Settings

Set up your build configuration:

| Setting | Value |
|---------|-------|
| **Project name** | `home-dashboard` (or your preferred name) |
| **Production branch** | `main` (or your default branch) |
| **Framework preset** | SvelteKit |
| **Build command** | `pnpm --filter @home-dashboard/web build` |
| **Build output directory** | `apps/web/.svelte-kit/cloudflare` |
| **Root directory** | `/` (leave empty or set to root) |
| **Node version** | `20` |

#### Important Build Settings

Click **Environment variables (advanced)** and add:

| Variable | Value | Notes |
|----------|-------|-------|
| `PNPM_VERSION` | `8` | Tells Cloudflare to use pnpm |
| `NODE_VERSION` | `20` | Use Node.js 20 |
| `PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Your Supabase URL |
| `PUBLIC_SUPABASE_ANON_KEY` | `your-anon-key` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | `your-service-role-key` | For server-side operations (keep secret!) |

**Where to find these values:**
- Supabase Dashboard → Settings → API
- `PUBLIC_SUPABASE_URL`: Project URL
- `PUBLIC_SUPABASE_ANON_KEY`: anon/public key
- `SUPABASE_SERVICE_ROLE_KEY`: service_role key (keep this secret!)

### 2.4 Deploy

1. Click **Save and Deploy**
2. Wait for the build to complete (usually 2-5 minutes)
3. You'll get a temporary URL like: `home-dashboard.pages.dev`

## Step 3: Set Up Custom Subdomain

### 3.1 Add Custom Domain

1. In your Cloudflare Pages project, go to **Custom domains** tab
2. Click **Set up a custom domain**
3. Enter your subdomain: `app.yourdomain.com` (or `dashboard.yourdomain.com`)
4. Click **Continue**

### 3.2 Automatic DNS Configuration

Cloudflare will automatically:
- Create a CNAME record pointing to your Pages deployment
- Enable SSL/TLS certificate
- Configure proxying through Cloudflare CDN

**DNS Record Created:**
```
Type: CNAME
Name: app
Target: home-dashboard.pages.dev
Proxy: Enabled (orange cloud)
```

### 3.3 Verify Domain

1. Wait a few seconds for DNS to propagate
2. Visit `https://app.yourdomain.com`
3. Your app should be live! 🎉

## Step 4: Update Environment Variables

Now that you have your subdomain, update your Electron app configuration:

### 4.1 Update `.env` Files

**apps/electron/.env:**
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_WEB_APP_URL=https://app.yourdomain.com
VITE_UPDATE_SERVER_URL=https://app.yourdomain.com/api/updates
```

### 4.2 Update GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions:

Add or update:
- `UPDATE_SERVER_URL`: `https://app.yourdomain.com/api/updates`
- `SUPABASE_URL`: `https://your-project.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key

## Step 5: Test the Deployment

### 5.1 Test Web App

Visit `https://app.yourdomain.com` and verify:
- [ ] Page loads correctly
- [ ] Can sign up / log in
- [ ] Calendar features work
- [ ] Device pairing works

### 5.2 Test Update API

```bash
curl https://app.yourdomain.com/api/updates/latest?platform=linux&arch=arm64&version=0.1.0
```

Expected response (if no updates exist yet):
```json
{
  "error": "Unauthorized"
}
```

This is correct - it means the endpoint is working but needs authentication.

### 5.3 Test Device Pairing

1. Run Electron app locally: `pnpm --filter @home-dashboard/electron dev`
2. Click "Open Web App for Automatic Pairing"
3. Should open to your production URL
4. Log in and verify device pairs automatically

## Cloudflare Pages Features You Get

✅ **Automatic deployments** - Every push to `main` triggers a new deployment
✅ **Preview deployments** - Every PR gets a unique preview URL
✅ **Instant rollbacks** - One-click rollback to any previous deployment
✅ **Global CDN** - Your app served from 200+ data centers worldwide
✅ **Free SSL/TLS** - Automatic HTTPS certificates
✅ **DDoS protection** - Enterprise-grade security
✅ **Analytics** - Built-in Web Analytics (optional)
✅ **Zero cost** - Free for most use cases (500 builds/month)

## Advanced Configuration

### Custom Build Script (Optional)

If you need more control, create `apps/web/build-cloudflare.sh`:

```bash
#!/bin/bash
set -e

echo "Building Home Dashboard for Cloudflare Pages..."

# Install dependencies
pnpm install --frozen-lockfile

# Build the web app
pnpm --filter @home-dashboard/web build

echo "Build complete!"
```

Then update build command in Cloudflare Pages:
```bash
bash apps/web/build-cloudflare.sh
```

### Environment-Specific Settings

Cloudflare Pages supports multiple environments:

**Production** (main branch):
- Domain: `app.yourdomain.com`
- Environment: `production`

**Preview** (all other branches):
- Domain: `{branch}.home-dashboard.pages.dev`
- Environment: `preview`

You can set different environment variables for each.

### Headers and Redirects

Create `apps/web/static/_headers`:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()

/api/*
  Cache-Control: no-store
```

Create `apps/web/static/_redirects`:

```
# Redirect root to app (if needed)
/  /app  301
```

## Monitoring and Logs

### View Deployment Logs

1. Go to Cloudflare Pages project
2. Click **Deployments** tab
3. Click on any deployment to see build logs

### View Runtime Logs

1. Go to **Functions** tab
2. View real-time logs for your API routes
3. Useful for debugging the update API

### Set Up Notifications

1. Go to **Settings** → **Notifications**
2. Enable notifications for:
   - Deployment failures
   - Deployment success (optional)

## Troubleshooting

### Build Fails with "pnpm not found"

Add environment variable:
- `PNPM_VERSION`: `8`

### Build Fails with Module Errors

Check:
1. All dependencies in `package.json`
2. Build command points to correct directory
3. Node version is 20

### Custom Domain Not Working

1. Verify DNS record exists (Cloudflare DNS page)
2. Check SSL/TLS mode is "Full" (Cloudflare SSL/TLS settings)
3. Wait 5-10 minutes for propagation
4. Clear browser cache and try incognito mode

### API Routes Return 404

1. Verify adapter is set to `@sveltejs/adapter-cloudflare`
2. Check API routes are in `apps/web/src/routes/api/`
3. Rebuild and redeploy

### Environment Variables Not Working

1. Redeploy after adding variables
2. Check variable names match exactly
3. Public variables must start with `PUBLIC_`

## Alternative: Subdomain with External Hosting

If you want to host elsewhere (Vercel, Netlify, etc.) and just use Cloudflare DNS:

### Step 1: Deploy to Your Host

Deploy to Vercel/Netlify/etc. and get deployment URL.

### Step 2: Add DNS Record in Cloudflare

1. Go to Cloudflare Dashboard → Your domain → DNS → Records
2. Click **Add record**
3. Configure:
   - **Type**: `CNAME`
   - **Name**: `app` (for app.yourdomain.com)
   - **Target**: Your hosting URL (e.g., `your-app.vercel.app`)
   - **Proxy status**: Proxied (orange cloud) - for CDN + DDoS protection
   - **TTL**: Auto

4. Click **Save**

### Step 3: Configure Host

Follow your hosting provider's instructions to add custom domain.

## Security Best Practices

1. **Never commit secrets** - Use environment variables only
2. **Use service_role key carefully** - Only in server-side code
3. **Enable Cloudflare WAF** - Web Application Firewall (optional)
4. **Monitor logs** - Check for suspicious activity
5. **Rotate keys regularly** - Update Supabase keys periodically

## Cost Estimate

**Cloudflare Pages Free Tier:**
- 500 builds/month (more than enough)
- Unlimited requests
- Unlimited bandwidth
- Unlimited sites

**If you exceed free tier:**
- $20/month for Workers Paid plan
- 5000 builds/month
- Still unlimited bandwidth

**Typical usage for this project:** $0/month (stays within free tier)

## Support

If you encounter issues:

1. Check [Cloudflare Pages docs](https://developers.cloudflare.com/pages/)
2. View build logs in Cloudflare Dashboard
3. Check [SvelteKit Cloudflare adapter docs](https://kit.svelte.dev/docs/adapter-cloudflare)
4. Cloudflare Community forum

---

**Last Updated:** 2025-01-13
