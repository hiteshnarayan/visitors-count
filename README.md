# Visitor Count Badge

Simple visitor counter with custom SVG badges. Counts daily unique visitors without cookies or tracking nonsense.

**Live at:** https://badge-visitor-count.vercel.app

## Usage

Track a visitor by hitting:

```
GET /api/hit/:key
```

Show the count with a badge:

```html
<img src="https://badge-visitor-count.vercel.app/api/svg/my-project" alt="views" />
```

Or use Shields.io:

```markdown
![views](https://img.shields.io/endpoint?url=https://badge-visitor-count.vercel.app/api/badge/my-project)
```

Replace `my-project` with whatever key you want. Each key gets its own counter.

## How it works

Counts one visit per day per visitor by hashing IP + user agent + date. No personal data stored, daily visitor lists expire after 8 days.

Runs on Vercel serverless functions. Uses Upstash Redis in production, falls back to local JSON for dev.

## Deploy your own

Fork this repo and connect to Vercel. It'll auto-detect the `/api` folder.

For persistent storage, create a free Redis instance at [upstash.com](https://upstash.com) and add these to Vercel environment variables:

```
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

Without Redis it still works, just resets on each deploy.

## Embed anywhere

**In your README:**

```markdown
![visitors](https://img.shields.io/endpoint?url=https://your-deploy.vercel.app/api/badge/readme)
```

**On your website:**

```html
<script>
  fetch('https://badge-visitor-count.vercel.app/api/hit/homepage', 
    { mode: 'no-cors' }).catch(() => {});
</script>
```

**Custom styling:**

The `/api/svg/:key` endpoint returns a clean SVG you can style however you want.

## Admin stuff

Set `ADMIN_TOKEN` in environment variables to enable admin endpoints.

Reset a counter:
```bash
curl -X POST https://your-deploy.vercel.app/api/admin/reset \
  -H "x-admin-token: your-token" \
  -d '{"key": "my-project"}'
```

Check today's visitors:
```bash
curl https://your-deploy.vercel.app/api/admin/visitors/my-project \
  -H "x-admin-token: your-token"
```

## Local testing

```bash
node test_local.js
```

Works without any setup. Uses `data/counts.json` for storage.

## License

MIT

---

*Runs on Vercel + Upstash Redis*
