const { getCount } = require('../../lib/storage');

module.exports = async (req, res) => {
  const { key } = req.query;
  if (!key) return res.status(400).json({ error: 'missing key' });

  try {
    const value = await getCount(key);
    const badge = {
      schemaVersion: 1,
      label: key,
      message: String(value),
      color: 'green'
    };
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(badge);
  } catch (e) {
    console.error(e);
    res.status(500).json({ schemaVersion: 1, label: key, message: 'error', color: 'red' });
  }
};
