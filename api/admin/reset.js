const { resetKey } = require('../../lib/storage');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!token || token !== process.env.ADMIN_TOKEN) return res.status(403).json({ error: 'forbidden' });

  let body = {};
  try { body = req.body || {}; } catch (e) {}
  const { key } = body;
  if (!key) return res.status(400).json({ error: 'missing key' });

  try {
    const result = await resetKey(key);
    res.json({ success: true, ...result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false });
  }
};
