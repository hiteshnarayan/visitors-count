const crypto = require('crypto');
const { addHit } = require('../../lib/storage');

// Fallback route to support /api/hit?key=<key>
// Mirrors logic in /api/hit/[key].js so existing links using ?key=... work.
module.exports = async (req, res) => {
  // Set CORS headers to allow requests from GitHub Pages and other origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-visitor-cid');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const key = req.query.key;
  if (!key) return res.status(400).json({ error: 'missing key' });

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const ua = req.headers['user-agent'] || '';
  const day = new Date().toISOString().slice(0, 10);
  const cid = req.query.cid || req.headers['x-visitor-cid'] || '';
  const base = cid ? `${key}|${ip}|${ua}|${day}|${cid}` : `${key}|${ip}|${ua}|${day}`;
  const hash = crypto.createHash('sha256').update(base).digest('hex');

  try {
    const result = await addHit(key, hash);
    if (req.query.debug) {
      return res.status(200).json({
        success: true,
        ...result,
        debug: { key, ip, ua, day, cid: cid || null, hash, deduped: !result.added }
      });
    }
    res.status(200).json({ success: true, ...result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'internal' });
  }
};
