# Cloudflare Pages Deployment Guide

## Prerequisites

- Cloudflare account
- Git repository (GitHub, GitLab, or Bitbucket)
- Google Apps Script URL for your testimonials sheet

## Step-by-Step Deployment

### 1. Create KV Namespace

**Option A: From Workers & Pages Overview**
1. Log into Cloudflare Dashboard
2. Go to **Workers & Pages** (in the left sidebar)
3. Look for **KV** in the submenu or tabs at the top
4. If you see **KV**, click it, then click **Create a namespace**
5. Name it: `TESTIMONIALS_KV`
6. Click **Add** or **Create**

**Option B: From Workers & Pages → Overview**
1. Go to **Workers & Pages** → **Overview**
2. Look for a **KV** section or tab
3. Click **Create a namespace** or **Add namespace**
4. Name it: `TESTIMONIALS_KV`
5. Click **Add** or **Create**

**Option C: Direct URL**
1. Navigate directly to: `https://dash.cloudflare.com/[your-account-id]/workers/kv/namespaces`
2. Replace `[your-account-id]` with your account ID (found in the URL when you're in the dashboard)
3. Click **Create a namespace**
4. Name it: `TESTIMONIALS_KV`
5. Click **Add**

**Option D: If you can't find KV at all**
- KV namespaces can also be created from within a Pages project (see Step 3 below)
- You can skip this step for now and create the KV namespace when configuring the Pages project bindings

**Note the namespace ID** after creation (you'll see it in the namespace list)

### 2. Create Pages Project

**IMPORTANT**: Make sure you're creating a **Pages** project, NOT a Worker project!

1. Go to **Workers & Pages** → **Pages** (NOT Workers)
2. Click **Create a project**
3. Choose **Connect to Git** (recommended) or **Upload assets**
4. If connecting to Git:
   - Authorize Cloudflare to access your repository
   - Select the `list-pages` repository
   - Click **Begin setup**
5. Configure build settings:
   - **Project name**: `testimonials-pages` (or your preferred name)
   - **Production branch**: `main` (or your default branch)
   - **Framework preset**: **None** (or "None" from dropdown)
   - **Build command**: **DELETE/REMOVE** any default value - leave it completely empty
   - **Build output directory**: **DELETE/REMOVE** any default value - leave it completely empty
   - **Root directory**: (leave as `/` - default)
6. **DO NOT** add any "Deploy command" or "Wrangler" settings
7. Click **Save and Deploy**

**Troubleshooting**: If you see `npx wrangler deploy` in the logs, you've accidentally created a Worker project. Delete it and create a new **Pages** project instead.

### 3. Configure KV Namespace Binding

**Note**: If you couldn't find KV in Step 1, you can create the namespace here instead!

1. In your Pages project, go to **Settings** → **Functions**
2. Scroll down to **KV Namespace Bindings**
3. Click **Add binding**
4. If you see **"Create a new namespace"** or **"Add namespace"** link, click it:
   - Name it: `TESTIMONIALS_KV`
   - Click **Create** or **Add**
5. Configure the binding:
   - **Variable name**: `TESTIMONIALS_KV` (must match exactly)
   - **KV namespace**: Select `TESTIMONIALS_KV` from dropdown (or the namespace you just created)
6. Click **Save**

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
     # https   ://www.random.org/strings/
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
         "url": "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?sheetId=YOUR_SHEET_ID"
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
   
   **Important**: The URL must include:
   - Your **Apps Script deployment ID** (the long string after `/macros/s/`)
   - Your **Google Sheet ID** as a query parameter: `?sheetId=YOUR_SHEET_ID`
   
   To find your Sheet ID:
   - Open your Google Sheet
   - Look at the URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`
   - Copy the `SHEET_ID_HERE` part and add it to the URL as `?sheetId=SHEET_ID_HERE`
   
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

**Troubleshooting 401 Unauthorized Error:**

If you get a 401 error when calling `/refresh`, check:

1. **Verify Environment Variable is Set:**
   - Go to your Pages project → **Settings** → **Environment Variables**
   - Make sure `REFRESH_KEY` exists and has a value
   - Check which environment it's set for (Production, Preview, or both)
   - If using a custom domain, make sure it's set for **Production**

2. **Check for Exact Match:**
   - Copy the value from Cloudflare (click the eye icon to reveal it)
   - Make sure there are no extra spaces before or after
   - The header value must match **exactly** (case-sensitive)

3. **Verify Header Name:**
   - Header must be exactly: `X-Refresh-Key` (capital X, capital R, capital K)
   - Not `x-refresh-key` or `X-REFRESH-KEY`

4. **Test with curl:**
   ```bash
   # Replace YOUR_DOMAIN and YOUR_KEY
   curl -v -X POST https://YOUR_DOMAIN/refresh \
     -H "X-Refresh-Key: YOUR_KEY_HERE" \
     -H "Content-Type: application/json"
   ```
   The `-v` flag will show you the full request/response

5. **Check Deployment:**
   - Make sure you've deployed after setting the environment variable
   - Environment variables require a new deployment to take effect
   - Go to **Deployments** tab and trigger a new deployment if needed

6. **Alternative: Use Cloudflare Dashboard:**
   - You can also test via the Cloudflare dashboard
   - Go to **Workers & Pages** → Your project → **Functions** → **Quick edit**
   - This lets you test without worrying about headers

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

### 502 Bad Gateway Error

A 502 error means authentication worked, but there's an issue fetching or processing data from Google Sheets.

**Step 1: Check the error details**
1. Visit: `https://YOUR_DOMAIN/health`
2. Look for `last_error` in the response - this will tell you what went wrong

**Step 2: Test your Google Apps Script URL directly**
1. Open your Apps Script URL in a browser:
   ```
   https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?sheetId=YOUR_SHEET_ID
   ```
2. You should see JSON output. If you see an error or HTML, that's the problem.

**Step 3: Verify the data format**
Your Apps Script must return JSON in this exact format:
```json
{
  "ok": true,
  "testimonials": [
    {
      "Testimonial": "Great service!",
      "Name": "John Doe",
      "Date": "2024-01-15",
      "Show/Hide": "Show"
    }
  ],
  "updated_at": "2024-01-15T12:00:00Z"
}
```

**Common issues:**
- **Apps Script returns HTML/error**: Check that your Apps Script is deployed correctly and accessible
- **Missing "ok": true**: Your Apps Script must return `"ok": true` in the response
- **Wrong property name**: Must be `testimonials` (lowercase), not `Testimonials` or `testimonial`
- **Not an array**: The `testimonials` value must be an array `[]`, not an object `{}`
- **CORS issues**: Make sure your Apps Script deployment allows "Anyone" to execute

**Step 4: Check Apps Script deployment**
1. In Google Apps Script, go to **Deploy** → **Manage deployments**
2. Make sure deployment is set to:
   - **Execute as**: Me (your account)
   - **Who has access**: Anyone (or "Anyone with Google account" if you want to restrict)
3. The URL should end with `/exec` (not `/dev`)

**Step 5: Verify column names**
Your Google Sheet should have these columns (case-sensitive):
- `Testimonial` (or `testimonial`)
- `Name` (or `name`)
- `Date` (or `date`)
- `Show/Hide` (or `show_hide`)

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

