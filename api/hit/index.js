const crypto = require('crypto');
const { addHit } = require('../../lib/storage');

// Fallback route to support /api/hit?key=<key>
// Mirrors logic in /api/hit/[key].js so existing links using ?key=... work.
module.exports = async (req, res) => {
  const key = req.query.key;
  if (!key) return res.status(400).json({ error: 'missing key' });

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const ua = req.headers['user-agent'] || '';
  const day = new Date().toISOString().slice(0, 10);
  const hash = crypto.createHash('sha256').update(`${key}|${ip}|${ua}|${day}`).digest('hex');

  try {
    const result = await addHit(key, hash);
    if (req.query.debug) {
      return res.status(200).json({
        success: true,
        ...result,
        debug: { key, ip, ua, day, hash, deduped: !result.added }
      });
    }
    res.status(200).json({ success: true, ...result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'internal' });
  }
};
