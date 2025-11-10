const crypto = require('crypto');
// Correct relative path depth: pixel/[key].js is two levels under project root (api/pixel), so use '../../lib/storage'
const { addHit } = require('../../lib/storage');

// 1x1 transparent PNG buffer
// Source: a minimal transparent PNG (base64)
const PNG_1x1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
const PNG_BUF = Buffer.from(PNG_1x1_BASE64, 'base64');

module.exports = async (req, res) => {
  const { key } = req.query;
  if (!key) return res.status(400).send('missing key');

  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';
    const day = new Date().toISOString().slice(0, 10);
    const hash = crypto
      .createHash('sha256')
      .update(`${key}|${ip}|${ua}|${day}`)
      .digest('hex');

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
