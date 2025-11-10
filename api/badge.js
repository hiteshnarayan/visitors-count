const { getCount } = require('../lib/storage');

module.exports = async (req, res) => {
  const key = req.query.key;
  if (!key) return res.status(400).json({ error: 'missing key' });
  try {
    const value = await getCount(key);
    res.json({ schemaVersion: 1, label: key, message: String(value), color: 'green' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ schemaVersion: 1, label: key, message: 'error', color: 'red' });
  }
};
