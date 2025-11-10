# Visitors Count · Badge Service

Privacy-friendly daily-unique visitor tracking with a custom, trademark-style SVG badge. Deployed on Vercel, backed by Upstash Redis.

Quick start

Production URL: https://visitorcountproject.vercel.app


- Register a hit (daily-unique by IP + UA + day):

  GET /api/hit/:key

  Example:

  https://your-deploy-url.com/api/hit/my-repo

- Badges:

  - Custom SVG (no Shields):

    <img alt="unique views" src="https://visitorcountproject.vercel.app/api/svg/profile" />

  - Shields endpoint:

    ![unique views](https://img.shields.io/endpoint?url=https://visitorcountproject.vercel.app/api/badge/profile)

Notes and customization

- The service uses a simple unique detection by hashing IP + User-Agent + day. It allows one unique view per (IP+UA) per day.
- Locally the code can fall back to `data/counts.json` but in production we use Upstash Redis for durability and scale.

Deployment (Vercel + Upstash Redis)

1. Create a Vercel account and connect your repository. Vercel auto-detects the `api/` folder and creates serverless endpoints.

2. (Optional but recommended) Create an Upstash Redis database:
   - Sign up at https://upstash.com
   - Create a Redis database (choose free plan if you want)
   - Copy the REST URL and REST token

3. In your Vercel Project Settings, add two Environment Variables:
   - UPSTASH_REDIS_REST_URL with the REST URL value
   - UPSTASH_REDIS_REST_TOKEN with the REST token value

4. Deploy. Your public endpoints will look like:

   - https://<your-deploy-url>/api/hit/<key>
   - https://<your-deploy-url>/api/badge/<key>

5. Embed the badge in your GitHub README using Shields or the custom SVG:

  ```markdown
  <!-- Shields endpoint style -->
  ![unique views](https://img.shields.io/endpoint?url=https://<your-deploy-url>/api/badge/my-repo)

  <!-- Custom branded SVG (no Shields) -->
  <img alt="unique views" src="https://<your-deploy-url>/api/svg/my-repo" />
  ```

Quick Redis primer (for this project)

- Redis is an in-memory key-value store. Upstash offers a serverless Redis with an HTTP REST API, perfect for serverless usage.
- Pattern used by this project:
  - Per-day Set: `visitors:<key>:<YYYY-MM-DD>` — store hashed visitor identifiers (so each visitor counts once per day).
  - Counter: `count:<key>` — integer total unique views.
- Flow: SADD the visitor hash into the daily Set. If SADD returns 1 (new member), INCR the counter. Set expiry on daily set (8 days) so old hashes get cleaned.

Local fallback and testing

- If the Upstash env vars are not set, the code falls back to `data/counts.json` for local testing.
- To run local tests that exercise the Vercel handlers without deploying, use:

  node test_local.js

Privacy note

- We hash visitor identifiers (IP + UA + day) but still store hashed values. If you need stricter privacy, reduce retention or only store daily aggregates.

Vercel CLI quick deploy & env setup

1. Install Vercel CLI (you already ran this):

  npm i -g vercel

2. From your project directory, run:

  vercel login
  vercel --prod

3. To add Upstash env vars via the CLI (replace values):

  vercel env add UPSTASH_REDIS_REST_URL production
  # paste the REST URL when prompted
  vercel env add UPSTASH_REDIS_REST_TOKEN production
  # paste the REST token when prompted

Using the client-side ping snippet (optional)

- Edit `public/ping.js`, set `repoKey` to the key you want to track (for example, your repo name).
- Host `public/ping.js` on your site (or copy the inline snippet) and include it on pages you want to track.

Example inline usage:

```html
<script>
  (function(){
   const repoKey = 'my-repo';
   fetch('https://<your-deploy-url>/api/hit/' + repoKey, { mode: 'no-cors' }).catch(()=>{});
  })();
</script>
```

Security & secret rotation

- If a token leaks, rotate immediately in Upstash and update Vercel envs, then redeploy.
- Recommended secrets:
  - UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
  - VISITOR_HMAC_SECRET (hash user IDs when using OAuth flow)
  - ADMIN_TOKEN (protects admin endpoints)

Admin endpoints

- Reset a key: POST /api/admin/reset  header: x-admin-token: <ADMIN_TOKEN>  body: {"key":"profile"}
- Inspect today’s visitors: GET /api/admin/visitors/:key  header: x-admin-token: <ADMIN_TOKEN>

Custom branded SVG badge

- You can embed a proprietary-looking badge without Shields:

  ```html
  <img alt="unique views" src="https://<your-deploy-url>/api/svg/my-repo" />
  ```

- This SVG uses a gradient, drop-shadow and monospaced typography to create a trademark-style look.

GitHub OAuth (unique-account tracking) — optional

If you want to count unique *accounts* (GitHub users) rather than raw visitors, you can let users optionally sign in via GitHub and register their visit. Steps:

1. Create a GitHub OAuth App: https://github.com/settings/developers -> New OAuth App
  - Authorization callback URL: https://<your-deploy-url>/api/auth/callback
  - Note the Client ID and Client Secret

2. Add these env vars to Vercel (production):
  - GITHUB_CLIENT_ID
  - GITHUB_CLIENT_SECRET

3. Usage flow:
  - User clicks a login link that opens `/api/auth/login?key=my-repo&redirect=/thanks`
  - After they authorize the app, GitHub redirects to `/api/auth/callback` which registers the user id and redirects back.

4. The service stores unique GitHub user ids in `users:<key>` (Upstash). Use `/api/badge/users/:key` to show the unique-account count.

Environment variables summary

- UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN (optional but recommended)
- GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET (optional for unique-account tracking)


