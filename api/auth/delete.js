const { removeUser } = require('../../lib/storage');

module.exports = async (req, res) => {
  // Expect POST with JSON { key, userId }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  let body = {};
  try { body = req.body || {}; } catch (e) { }
  const { key, userId } = body;
  if (!key || !userId) return res.status(400).json({ error: 'missing key or userId' });

  try {
    const result = await removeUser(key, userId);
    res.json({ success: true, ...result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false });
  }
};
