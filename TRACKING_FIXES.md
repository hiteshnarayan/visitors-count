# Tracking Fixes - Phase 1

## Issues Fixed

### 1. **Missing CORS Headers** ✅
**Problem:** Requests from GitHub Pages (`hiteshnarayan.github.io`) to your Vercel API were being blocked by CORS policy.

**Fix:** Added CORS headers to all tracking endpoints:
- `/api/hit/[key]` - Now allows cross-origin requests
- `/api/hit/index.js` - Now allows cross-origin requests  
- `/api/pixel/[key]` - Now allows cross-origin requests

### 2. **Pixel Endpoint Missing Client ID Support** ✅
**Problem:** The pixel endpoint (`/api/pixel/[key]`) wasn't accepting or using the `cid` (client ID) parameter, which meant multiple visitors behind the same IP (like NAT networks) would be counted as one.

**Fix:** Updated pixel endpoint to:
- Accept `cid` from query parameters or headers
- Include `cid` in the hash calculation for better uniqueness

### 3. **Missing Client ID in Tracking Script** ✅
**Problem:** Your `docs/index.html` script wasn't generating or sending a client ID, which reduces tracking accuracy.

**Fix:** Created an improved tracking script (`docs-index-template.html`) that:
- Generates and stores a persistent client ID in localStorage
- Includes the client ID in tracking requests
- Has better error handling and timing
- Uses `keepalive: true` to ensure requests complete even during redirect

## What You Need to Do

### Step 1: Update Your `docs/index.html`

Replace the content of your `docs/index.html` in your `hiteshnarayan/hiteshnarayan` repository with the improved version. The new script is saved as `docs-index-template.html` in this project.

**Copy the content from:** `/Users/hitesh/visitor_count_project/docs-index-template.html`

**To your GitHub repo:** `hiteshnarayan/hiteshnarayan/docs/index.html`

### Step 2: Deploy the Updated API

The API endpoints have been fixed. You need to:
1. Commit these changes to your repository
2. Push to trigger Vercel deployment (or manually deploy)
3. Wait for deployment to complete

### Step 3: Test the Tracking

1. **Test the hit endpoint directly:**
   ```bash
   curl "https://badge-visitor-count.vercel.app/api/hit/profile?debug=1"
   ```
   This should return JSON with `added: true` on first visit, and `deduped: true` on repeat visits.

2. **Test with client ID:**
   ```bash
   curl "https://badge-visitor-count.vercel.app/api/hit/profile?cid=test123&debug=1"
   ```

3. **Check the count:**
   ```bash
   curl "https://badge-visitor-count.vercel.app/api/badge/profile"
   ```

4. **Test from browser:**
   - Visit your GitHub profile: `https://github.com/hiteshnarayan`
   - The badge should load (it's read-only, doesn't track)
   - Visit: `https://hiteshnarayan.github.io` (or your GitHub Pages URL)
   - It should redirect to your GitHub profile
   - Check if the count incremented

### Step 4: Verify GitHub Pages Setup

Make sure your GitHub Pages is configured correctly:
1. Go to your repository settings
2. Navigate to Pages section
3. Ensure it's pointing to `/docs` folder
4. Your `docs/index.html` should be the redirect page

## How It Works Now

1. **User visits GitHub profile** → Badge image loads (read-only, no tracking)
2. **User clicks link or visits GitHub Pages** → `docs/index.html` loads
3. **Script generates/stores client ID** → Unique ID per browser (stored in localStorage)
4. **Tracking request sent** → `GET /api/hit/profile?cid=<unique-id>&t=<timestamp>`
5. **API processes visit** → Creates hash from: `profile|IP|UserAgent|Date|CID`
6. **If unique for today** → Counter increments
7. **Redirect happens** → User redirected to GitHub profile

## Debugging

If tracking still doesn't work:

1. **Check browser console** (F12) for errors
2. **Use debug mode:**
   ```
   https://badge-visitor-count.vercel.app/api/hit/profile?debug=1
   ```
3. **Check health endpoint:**
   ```
   https://badge-visitor-count.vercel.app/api/health
   ```
   Verify `useUpstash: true` if you're using Redis

4. **Check localStorage:**
   - Open browser DevTools → Application → Local Storage
   - Look for `visitor_cid` key
   - If missing, the script will generate one

5. **Test CORS:**
   - Open browser console on your GitHub Pages site
   - Run: `fetch('https://badge-visitor-count.vercel.app/api/hit/profile?debug=1').then(r => r.json()).then(console.log)`
   - Should return JSON without CORS errors

## Important Notes

- **Badge image is read-only:** The `/api/svg/profile` endpoint only displays the count, it doesn't track visits
- **Tracking happens via script:** Only the `docs/index.html` script actually tracks visits
- **Daily uniqueness:** Same visitor (same IP+UA+CID) only counts once per day
- **Client ID persistence:** The `visitor_cid` in localStorage ensures the same browser counts as one visitor even across sessions

## Next Steps (Future Phases)

Once tracking is confirmed working, we can:
- Add rate limiting
- Improve analytics
- Add more endpoints
- Enhance the badge design
- Add more features
