# Cloudflare Pages Deployment Guide

## Prerequisites

- Cloudflare account
- Git repository (GitHub, GitLab, or Bitbucket)
- Google Apps Script URL for your testimonials sheet

## Step-by-Step Deployment

### 1. Create KV Namespace

1. Log into Cloudflare Dashboard
2. Go to **Workers & Pages** → **KV**
3. Click **Create a namespace**
4. Name it: `TESTIMONIALS_KV`
5. Click **Add**
6. **Note the namespace ID** (you'll need it later)

### 2. Create Pages Project

1. Go to **Workers & Pages** → **Pages**
2. Click **Create a project**
3. Choose **Connect to Git** (recommended) or **Upload assets**
4. If connecting to Git:
   - Authorize Cloudflare to access your repository
   - Select the `list-pages` repository
   - Click **Begin setup**
5. Configure build settings:
   - **Project name**: `testimonials-pages` (or your preferred name)
   - **Production branch**: `main` (or your default branch)
   - **Framework preset**: None
   - **Build command**: (leave empty)
   - **Build output directory**: (leave empty)
6. Click **Save and Deploy**

### 3. Configure KV Namespace Binding

1. In your Pages project, go to **Settings** → **Functions**
2. Scroll down to **KV Namespace Bindings**
3. Click **Add binding**
4. Configure:
   - **Variable name**: `TESTIMONIALS_KV` (must match exactly)
   - **KV namespace**: Select `TESTIMONIALS_KV` from dropdown
5. Click **Save**

### 4. Set Environment Variables

1. In your Pages project, go to **Settings** → **Environment Variables**
2. Click **Add variable**
3. Add the refresh key:
   - **Variable name**: `REFRESH_KEY`
   - **Value**: Generate a secure random string:
     ```bash
     # On macOS/Linux:
     openssl rand -hex 32
     
     # Or use an online generator:
     # https://www.random.org/strings/
     ```
   - **Environment**: Select **Production** (and **Preview** if you want it there too)
4. Click **Save**

### 5. Configure Custom Domain (Optional)

1. In your Pages project, go to **Settings** → **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain: `testimonials.mineralrightsforum.com`
4. Cloudflare will provide DNS instructions:
   - Add a CNAME record pointing to your Pages domain
   - Or use Cloudflare's automatic DNS if domain is already on Cloudflare
5. Wait for DNS propagation (usually a few minutes)

### 6. Update sites.json

1. Edit `sites.json` in your repository
2. Update the host and Google Apps Script URL:
   ```json
   {
     "testimonials.mineralrightsforum.com": {
       "sheet": {
         "type": "apps_script_json",
         "url": "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
       },
       "page_title": "Testimonials",
       "return_url": "https://www.mineralrightsforum.com",
       "seo": {
         "title": "Testimonials - Mineral Rights Forum",
         "description": "Read testimonials from our community members."
       }
     }
   }
   ```
3. Commit and push to trigger a new deployment

### 7. Test the Deployment

1. Visit your Pages URL: `https://testimonials-pages.pages.dev` (or your custom domain)
2. You should see "No data yet" - this is expected until you refresh
3. Test the refresh endpoint:
   ```bash
   curl -X POST https://your-domain.com/refresh \
     -H "X-Refresh-Key: YOUR_REFRESH_KEY_VALUE" \
     -H "Content-Type: application/json"
   ```
4. If successful, you should see:
   ```json
   {
     "status": "ok",
     "count": 10,
     "etag": "abc123",
     "updated_at": "2024-01-01T00:00:00Z",
     "duration_ms": 1234
   }
   ```
5. Refresh the page - testimonials should now appear

### 8. Set Up Automatic Refresh (Optional)

You can set up a cron job or scheduled task to automatically refresh the data:

**Option A: Cloudflare Cron Triggers** (if using Workers)
- Not directly available in Pages, but you can use a Worker scheduled event

**Option B: External Cron Service**
- Use a service like cron-job.org or EasyCron
- Set up a POST request to `https://your-domain.com/refresh` with the `X-Refresh-Key` header
- Schedule it to run every hour or as needed

**Option C: GitHub Actions**
Create `.github/workflows/refresh.yml`:
```yaml
name: Refresh Testimonials
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Manual trigger

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: Refresh testimonials
        run: |
          curl -X POST https://your-domain.com/refresh \
            -H "X-Refresh-Key: ${{ secrets.REFRESH_KEY }}" \
            -H "Content-Type: application/json"
```

## Troubleshooting

### "No data yet" error
- Make sure you've called the `/refresh` endpoint at least once
- Check that your Google Apps Script URL is correct
- Verify the Apps Script returns data in the expected format:
  ```json
  {
    "ok": true,
    "testimonials": [...],
    "updated_at": "2024-01-01T00:00:00Z"
  }
  ```

### 401 Unauthorized on /refresh
- Verify the `REFRESH_KEY` environment variable is set correctly
- Check that you're sending the header: `X-Refresh-Key: YOUR_KEY`
- Make sure the key matches exactly (no extra spaces)

### KV namespace not found
- Verify the binding name is exactly `TESTIMONIALS_KV` (case-sensitive)
- Check that the KV namespace exists and is bound to your Pages project
- Try redeploying after adding the binding

### Testimonials not showing
- Check that testimonials have `Show/Hide` column set to "Show"
- Verify date column is formatted correctly
- Check browser console for JavaScript errors
- Verify the data structure matches expected format

## Monitoring

- **Health Check**: Visit `https://your-domain.com/health` to check status
- **Data Endpoint**: Visit `https://your-domain.com/data.json` to see raw data
- **Cloudflare Analytics**: Check your Pages project dashboard for traffic and errors

## Security Notes

- Never commit `REFRESH_KEY` to your repository
- Use environment variables for all secrets
- Consider restricting `/refresh` endpoint by IP if possible
- Regularly rotate your `REFRESH_KEY`

