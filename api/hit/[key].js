const crypto = require('crypto');
const { addHit } = require('../../lib/storage');

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

  // Extract key from query (Vercel dynamic routes put path params in query)
  const { key } = req.query;
  if (!key) return res.status(400).json({ error: 'missing key' });

  // Normalize IP: X-Forwarded-For can contain multiple IPs (comma-separated)
  // Take the first one (client IP) and trim whitespace
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  ip = ip.trim();
  
  const ua = (req.headers['user-agent'] || '').trim();
  const day = new Date().toISOString().slice(0, 10);
  const cid = (req.query.cid || req.headers['x-visitor-cid'] || '').trim();
  
  // Always include cid in hash if provided, for better uniqueness
  const base = cid ? `${key}|${ip}|${ua}|${day}|${cid}` : `${key}|${ip}|${ua}|${day}`;
  const hash = crypto.createHash('sha256').update(base).digest('hex');

  try {
    const result = await addHit(key, hash);
    // Optional debug mode to help diagnose 'not incrementing' cases.
    // Use /api/hit/<key>?debug=1 to see dedupe inputs.
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
