const crypto = require('crypto');
// Correct relative path depth: pixel/[key].js is two levels under project root (api/pixel), so use '../../lib/storage'
const { addHit } = require('../../lib/storage');

// 1x1 transparent PNG buffer
// Source: a minimal transparent PNG (base64)
const PNG_1x1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
const PNG_BUF = Buffer.from(PNG_1x1_BASE64, 'base64');

module.exports = async (req, res) => {
  // Set CORS headers to allow requests from GitHub Pages and other origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-visitor-cid');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Content-Type', 'image/png');
    return res.status(200).end(PNG_BUF);
  }

  const { key } = req.query;
  if (!key) return res.status(400).send('missing key');

  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';
    const day = new Date().toISOString().slice(0, 10);
    // Support client ID (cid) for better uniqueness tracking
    const cid = req.query.cid || req.headers['x-visitor-cid'] || '';
    const base = cid ? `${key}|${ip}|${ua}|${day}|${cid}` : `${key}|${ip}|${ua}|${day}`;
    const hash = crypto.createHash('sha256').update(base).digest('hex');

    // Fire-and-forget hit registration; don't block pixel response
    try {
      await addHit(key, hash);
    } catch (_) {}

    // Set strong anti-caching headers to improve counting likelihood
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Length', String(PNG_BUF.length));
    res.status(200).end(PNG_BUF);
  } catch (e) {
    console.error(e);
    res.status(500).send('error');
  }
};
