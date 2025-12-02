# Testimonials Pages

A simple testimonials display system that pulls data from Google Sheets and displays testimonials in a clean list format.

## Features

- **Simple List Format**: Testimonials displayed in a clean, readable list (not cards)
- **Header & Footer**: Reuses MRF header with logo and back button, plus footer with links and social icons
- **Top Navbar**: Non-sticky navigation bar with Home, Latest Posts, Categories, Advertise with Us, and Search (non-functional)
- **Google Sheets Integration**: Pulls data from Google Sheets via Apps Script JSON endpoint
- **Filtering**: Only displays testimonials where Show/Hide = "Show"
- **Sorting**: Sorted by date, newest first
- **Refresh Mechanism**: POST `/refresh` endpoint to refresh data from Google Sheets

## Repository Structure

```
testimonials-pages/
├── functions/
│   ├── _lib.js          # Shared utilities (getHost, loadSitesRegistry, KV_KEYS, etc.)
│   ├── index.js          # Main SSR handler - renders testimonials page
│   ├── data.json.js      # JSON API endpoint for testimonials data
│   ├── refresh.js        # POST endpoint to refresh from Google Sheets
│   ├── health.js         # Health check endpoint
│   └── robots.txt.js     # Robots.txt handler
├── public/
│   └── styles.css        # Custom CSS (header/footer styles, testimonial list styles)
├── sites.json            # Site configuration (host → config mapping)
├── package.json          # Dependencies (minimal)
└── README.md             # This file
```

## Google Sheet Structure

Expected columns:
- **Testimonial** (text): The testimonial text
- **Name** (text): Name of the person giving the testimonial
- **Date** (date or text): Date of the testimonial
- **Show/Hide** (text): Must be "Show" or "Hide" to control visibility

## Configuration

Edit `sites.json` to configure your site:

```json
{
  "your-domain.com": {
    "sheet": {
      "type": "apps_script_json",
      "url": "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
    },
    "page_title": "Testimonials",
    "return_url": "https://www.mineralrightsforum.com",
    "seo": {
      "title": "Testimonials - Your Site",
      "description": "Read testimonials from our community."
    }
  }
}
```

## Environment Variables

- `REFRESH_KEY`: Secret key for the `/refresh` endpoint
- `TESTIMONIALS_KV`: Cloudflare KV namespace binding for storing testimonials data

## API Endpoints

### `GET /`
Main page that renders testimonials in HTML format.

### `GET /data.json`
Returns testimonials data as JSON:
```json
{
  "ok": true,
  "updated_at": "2024-01-01T00:00:00Z",
  "etag": "abc123",
  "count": 10,
  "testimonials": [...]
}
```

### `POST /refresh`
Refreshes testimonials data from Google Sheets. Requires `X-Refresh-Key` header.

### `GET /health`
Health check endpoint that returns status information.

### `GET /robots.txt`
Returns robots.txt file.

## Differences from County Directory

- **No cards**: Simple list format instead of card-based layout
- **No category grouping**: Single list sorted by date
- **No search/filter functionality**: Just displays all visible testimonials
- **No premium/free distinction**: All testimonials treated equally
- **Simpler data structure**: Only testimonial, name, date, and show/hide fields
- **Non-sticky navbar**: Navbar scrolls with the page (not sticky)

## Testing

1. Verify Google Sheets data loads correctly
2. Test date sorting (newest first)
3. Verify Show/Hide filtering works
4. Test header/footer display
5. Verify navbar links (Home, Latest Posts, Categories, Advertise with Us)
6. Test refresh endpoint with X-Refresh-Key header

## Deployment

This is designed to run on Cloudflare Pages with Functions. The KV namespace should be bound as `TESTIMONIALS_KV` in your Cloudflare Pages settings.
