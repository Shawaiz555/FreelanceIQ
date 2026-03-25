# FreelanceIQ Chrome Extension

AI-powered bid intelligence for Upwork, Fiverr, and Freelancer.com.

---

## Loading in Chrome (Developer Mode)

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `extension/` folder inside this project (`d:\FreelanceIQ\extension`)
5. The FreelanceIQ extension will appear in your extensions list

> **Tip:** Pin it to your toolbar by clicking the puzzle-piece icon → pin FreelanceIQ.

---

## Testing the Extension

### Quick test (Upwork)

1. Go to any Upwork job detail page, e.g.:
   `https://www.upwork.com/jobs/~01234567890abcdef`
2. The **FreelanceIQ** button appears on the right edge of the screen
3. Click it — the sidebar slides in, extracts the job, and calls the AI pipeline
4. Sign in via the popup if prompted (click the extension icon in the toolbar)

### Platforms supported

| Platform | URL pattern | Notes |
|---|---|---|
| Upwork | `/jobs/*` or `~hex` paths | Job detail pages |
| Fiverr | `/find_work/*`, `/request/*` | Buyer request pages |
| Freelancer.com | `/projects/*` | Project detail pages |

---

## Testing Checklist (20 Upwork Job Pages)

Run through these page types to verify DOM extraction works:

- [ ] Fixed-price job — budget displayed as "$500"
- [ ] Fixed-price job — budget range "$500–$1,000"
- [ ] Hourly job — rate "$25–$50/hr"
- [ ] Job with 10+ skills listed
- [ ] Job with no skills listed
- [ ] Long description (2,000+ chars)
- [ ] Short description (<100 chars)
- [ ] Client with many hires (verified badge)
- [ ] New client (0 hires)
- [ ] Job loaded via SPA navigation (click from search results — do NOT refresh)
- [ ] SPA back navigation (back button from job page)
- [ ] Page reload on job URL (hard refresh)
- [ ] Upwork search results page — sidebar should NOT appear
- [ ] Profile page — sidebar should NOT appear
- [ ] Fiverr buyer request page
- [ ] Freelancer.com project page
- [ ] Free tier: 5th analysis shows quota warning
- [ ] Free tier: 6th analysis is blocked
- [ ] Re-analyse button resets and re-runs analysis
- [ ] Cover letter regeneration with different tones

---

## Environment Variables

The extension talks to the FreelanceIQ API. Ensure your `.env` has:

```
OPENAI_API_KEY=sk-...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

The extension's `background.js` points to:
```js
const API_BASE = 'https://freelance-iq.vercel.app/api';
```

For local development, change this to:
```js
const API_BASE = 'http://localhost:3001/api';
```

Then reload the extension in `chrome://extensions` after changing the file.

---

## Chrome Web Store Submission

### Pre-submission checklist

- [ ] Icons look clean at all sizes (16, 32, 48, 128px)
- [ ] Replace placeholder icons with production-quality artwork
- [ ] Test on Chrome stable (not just Canary/Beta)
- [ ] Remove all `console.log` statements from production build
- [ ] Set `API_BASE` to production URL in `background.js`
- [ ] Review [Chrome Web Store policies](https://developer.chrome.com/docs/webstore/program-policies/)

### Required assets for submission

| Asset | Size | Notes |
|---|---|---|
| Icon | 128×128 PNG | Extension icon (already in `icons/`) |
| Promo tile (small) | 440×280 PNG | Required for listing |
| Promo tile (large) | 920×680 PNG | Optional but recommended |
| Screenshots | 1280×800 or 640×400 | At least 1 required |

### Submission steps

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click **New Item**
3. Zip the entire `extension/` folder: `zip -r freelanceiq-extension.zip extension/`
4. Upload the zip
5. Fill in: name, description, category ("Productivity"), screenshots
6. Set **Visibility** to "Public" or "Unlisted" for beta
7. Submit for review (typically 1–3 business days)

---

## File Structure

```
extension/
├── manifest.json          # MV3 manifest
├── background.js          # Service worker: auth, token refresh, API relay
├── content.js             # Injected into job pages: sidebar + extraction
├── extractors/
│   ├── upwork.js          # Upwork DOM selectors (reference — inlined in content.js)
│   ├── fiverr.js          # Fiverr DOM selectors (reference)
│   └── freelancer.js      # Freelancer.com DOM selectors (reference)
├── sidebar/
│   ├── sidebar.html       # Full sidebar UI (self-contained)
│   ├── sidebar.css        # Minimal shared styles
│   └── sidebar.js         # Sidebar logic, gauge rendering, message handling
├── popup/
│   ├── popup.html         # Extension popup UI
│   └── popup.js           # Popup logic: login, stats, settings
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

## Architecture Notes

- **No bundler required** — vanilla JS throughout, no React/build step
- **Content script** is a single classic script (no ES modules) with all extractor logic inlined
- **Background service worker** handles all API calls to avoid CORS restrictions on job sites
- **Sidebar** runs in an iframe with `postMessage` communication to the content script
- **Auth** stored in `chrome.storage.local` (JWT token + user object), refreshed every 12 minutes via `chrome.alarms`
