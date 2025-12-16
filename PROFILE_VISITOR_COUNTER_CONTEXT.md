# Visitor Counter Project – Full Context for Profile Repository

This document summarizes everything implemented in the `Visitors-Count` service you can reference or adapt in your GitHub profile repository (`hiteshnarayan/hiteshnarayan`).

---
## 1. Purpose
A privacy-conscious visitor tracking + badge service you host on Vercel that:
- Counts unique daily visitors per logical key (e.g., `profile`).
- Maintains a cumulative total.
- Supports a branded SVG badge and Shields-compatible JSON.
- Provides an embeddable tracking pixel and a real visit landing page.
- Allows admin reset & inspection.
- Avoids storing raw personal data (IP/User-Agent not stored directly; only hashed signatures).

---
## 2. High-Level Architecture
| Component | Description |
|-----------|-------------|
| Vercel Serverless Functions | Host all API endpoints under `/api/*`. |
| Upstash Redis | Primary persistent storage (counters, daily sets, user sets). |
| Fallback Storage (/tmp + memory) | Used locally or if Redis creds missing. |
| Public Pages | `/` (landing), `/profile` (interactive visit page with pixel + scripted hit). |
| Client ID (cid) | LocalStorage-generated entropy to distinguish users sharing IP + UA. |

**Daily Uniqueness Logic:** Per day we build a hash from: `key|ip|userAgent|day(|cid)`. If it hasn’t appeared in today’s Redis Set, total increments.

---
## 3. Privacy Notes
- No raw IP/User-Agent persists beyond hashing; hash is SHA-256 of the signature string.
- Optional HMAC secret (`VISITOR_HMAC_SECRET`) can be applied for user-related identifiers (future user tracking endpoints).
- GDPR-friendly: Users can request deletion if identities were ever tracked using an auth flow (current implementation focuses on anonymous visitor counting).

---
## 4. Environment Variables
| Variable | Purpose |
|----------|---------|
| `UPSTASH_REDIS_REST_URL` | Upstash REST API URL |
| `UPSTASH_REDIS_REST_TOKEN` | Token for Redis operations |
| `VISITOR_HMAC_SECRET` | HMAC key for privacy hashing of user IDs |
| `ADMIN_TOKEN` | Protects admin/reset/inspection endpoints |

Recommendation: Rotate leaked or older tokens promptly; update Vercel production env & redeploy.

---
## 5. Endpoints Overview
### Counting & Display
- `GET /api/hit/<key>` – registers a visit; returns JSON `{ success, added, value }`.
- `GET /api/hit?key=<key>` – query param fallback to same logic.
- Optional query/header parameters:
  - `cid` (query or `x-visitor-cid` header) – persistent client id for uniqueness.
  - `debug=1` – includes diagnostic `{ ip, ua, day, cid, hash, deduped }`.
- `GET /api/pixel/<key>` – 1×1 PNG + registers visit (with optional `cid`).
- `GET /api/badge/<key>` – Shields-compatible JSON badge.
- `GET /api/svg/<key>` – Branded custom SVG (gradient, shadow, circle mark). Read-only.

### Admin / Diagnostics
- `POST /api/admin/reset` – Reset totals & today set for a key (header: `x-admin-token`).
- `GET /api/admin/visitors/<key>` – Inspect today’s visitor hashes (requires `x-admin-token`).
- `GET /api/health` – Shows env wiring: Upstash enabled, presence of secrets.

### Auth (Scaffolded)
- `/api/auth/login`, `/api/auth/callback`, `/api/auth/delete` – prepared for future account-level features (not essential for basic visitor counting).

---
## 6. Data Model (Redis)
| Key Pattern | Contents | TTL |
|-------------|----------|-----|
| `visitors:<key>:YYYY-MM-DD` | Set of daily unique hashes | ~8 days (configurable) |
| `count:<key>` | Integer cumulative total | Persistent |
| `users:<key>` | Set of unique HMAC’d user IDs (future use) | Persistent |

---
## 7. Real Visit Flow
1. User opens `/profile` page.
2. Page generates or reuses `vc_cid` (localStorage).
3. JS sets tracking pixel src `/api/pixel/profile?cid=<cid>&t=<timestamp>`.
4. Backup fetch fires `/api/hit/profile?cid=<cid>&t=<timestamp>`.
5. First unique signature for the day increments total.

Incognito windows generate new cid each time (count once per day per incognito session). Repeats on same day with same signature are deduped.

---
## 8. GitHub README & Pages Behavior
- **README Badge**: GitHub proxies images (camo) and caches aggressively; not every view triggers a new request.
  - To force periodic refresh: append a timestamp or 8h rotating token to the query string.
  - Example: `https://visitorcountproject.vercel.app/api/svg/profile?b=SEED&refresh=2025-11-10T08`
- **GitHub Pages**: Direct browser fetch (no camo proxy) so pixel/hit requests are real.

---
## 9. Debugging Increments
Use debug mode:
```
GET /api/hit/profile?debug=1
```
Response fields:
- `added`: whether total incremented.
- `deduped`: `true` if signature already seen today.
- `hash`: SHA-256 of signature components.
- `cid`: null or client id used.

Common reasons for `added:false`:
- Same IP + same UA + same cid (repeat visit).
- Missing cid behind a shared NAT environment causing collisions.
- Previous visit already registered earlier today.

---
## 10. Security Practices
- Keep `ADMIN_TOKEN` secret; rotate if exposed.
- Rotate Upstash token if checked into history or shared.
- Limit debug usage publicly (no sensitive raw IP is returned—only hashed signature—but volume could reveal traffic patterns).

---
## 11. Future Enhancements (Optional)
- `/api/admin/users/<key>` to list (hashed/HMAC’d) user IDs.
- Click-through redirect endpoint (`/api/click/<key>`) that records a hit then 302s to an external URL.
- Scheduled GitHub Action in profile repo to update badge cache-buster param every 8h.
- Secret rotation section in README (still a pending doc improvement).

---
## 12. Example Curl Commands
```bash
# Current total
curl -s https://visitorcountproject.vercel.app/api/badge/profile | jq .

# Register a visit with a test cid
curl -s 'https://visitorcountproject.vercel.app/api/hit/profile?cid=test123&debug=1' | jq .

# Pixel request
curl -s -D - 'https://visitorcountproject.vercel.app/api/pixel/profile?cid=test456' -o /dev/null

# Health
curl -s https://visitorcountproject.vercel.app/api/health | jq .

# Admin reset (replace ADMIN_TOKEN)
curl -s -X POST -H 'x-admin-token: YOUR_ADMIN_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"key":"profile"}' \
  https://visitorcountproject.vercel.app/api/admin/reset | jq .
```

---
## 13. Branded SVG Badge Notes
- Endpoint: `/api/svg/<key>`
- Dynamic content (label uppercase + "<count> visitors").
- Non-caching headers to encourage fresh fetch when not proxied.
- Recommended in README: fallback to Shields JSON if reliability is a concern.

---
## 14. File Map (Key Ones)
| File | Purpose |
|------|---------|
| `lib/storage.js` | Upstash + fallback logic, HMAC support, counter ops |
| `api/hit/[key].js` | Registers visit (path param) with cid + debug support |
| `api/hit/index.js` | Query param variant (supports `?key=`) |
| `api/pixel/[key].js` | Tracking pixel (1×1 PNG) + visit registration |
| `api/svg/[key].js` | Branded SVG badge output |
| `api/badge/[key].js` | Shields-style JSON output |
| `api/admin/reset.js` | Reset counts for key |
| `api/admin/visitors/[key].js` | Inspect today’s hashed visitors |
| `api/health.js` | Environment status diagnostics |
| `public/index.html` | Landing page describing service |
| `public/profile.html` | Real visit page with persistent cid injection |
| `vercel.json` | Minimal Vercel config relying on automatic routing |

---
## 15. Operational Notes
- First daily visit for a signature increments; subsequent identical signatures are deduped (added:false).
- LocalStorage persistence means same browser counts once per day even after refresh (desired behavior).
- Incognito resets localStorage; considered a new browser identity.
- If Upstash env vars are missing at runtime, fallback storage is used; counts won’t persist across deployments—check `/api/health`.

---
## 16. Troubleshooting Checklist
1. Badge not increasing? Use `/api/hit/profile?debug=1` to inspect signature.
2. Upstash not in use? Verify `/api/health` shows `useUpstash:true`.
3. Multiple people not registering separately? Ensure cid is included (visit `/profile` page rather than raw pixel). Clear localStorage if needed.
4. Frequent resets? Confirm `ADMIN_TOKEN` not leaking. Rotate on suspicion.

---
## 17. Deployment / Rotation Steps (Recommended)
**Rotating Upstash Token:**
1. Create new token in Upstash dashboard.
2. Update `UPSTASH_REDIS_REST_TOKEN` in Vercel Production Environment.
3. Redeploy (Vercel will pick up new env automatically).
4. Invalidate old token in Upstash.

**Rotating VISITOR_HMAC_SECRET:**
1. Set new secret in Vercel.
2. (Optional) Add versioning if you start storing user-centric identifiers.
3. Existing hashed records remain valid (unless you require full re-hash logic).

---
## 18. Why Some README Views Don’t Increment
- GitHub’s image proxy caches images; your API isn’t hit per viewer.
- Use a periodically changing query param or link viewers to the active `/profile` page for real-time counting.

---
## 19. Potential Additions (If Needed Later)
- Rate limiting (prevent abuse / scripted floods).
- Aggregated analytics (just counts, not personal data). 
- “Heartbeat” scheduled increments to smooth out profile badge stagnation due to caching.

---
## 20. Summary
You now have a robust, privacy-friendly visitor counter with:
- Reliable daily uniqueness (extended via cid entropy).
- Multiple display formats (JSON + custom SVG).
- Debug & admin tooling.
- Secure environment separation.
- Minimal code footprint optimized for Vercel serverless.

You can paste relevant portions of this document into your profile README or keep it as a reference for collaborators.

---
## 21. License / Attribution (If Publishing Publicly)
Include appropriate MIT or Apache license info if you open-source the service logic. Mention Upstash Redis usage and that IP/User-Agent are only hashed and not stored in raw form.

---
End of context.
