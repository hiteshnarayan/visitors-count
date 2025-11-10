const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  const { key } = req.query;
  if (!key) return res.status(400).json({ error: 'missing key' });
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!token || token !== process.env.ADMIN_TOKEN) return res.status(403).json({ error: 'forbidden' });

  const day = new Date().toISOString().slice(0, 10);

  try {
    // Prefer Upstash direct read of the daily set
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const { Redis } = require('@upstash/redis');
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      const setKey = `visitors:${key}:${day}`;
      const size = await redis.scard(setKey);
      // Return up to first 50 hashes to avoid huge payloads
      const members = size ? await redis.smembers(setKey) : [];
      return res.status(200).json({ key, day, uniqueVisitorsToday: size, sample: members.slice(0, 50) });
    }

    // Fallback to file store
    const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data');
    const COUNTS_FILE = path.join(DATA_DIR, 'counts.json');
    let counts = {};
    if (fs.existsSync(COUNTS_FILE)) {
      counts = JSON.parse(fs.readFileSync(COUNTS_FILE, 'utf8'));
    }
    const daySeen = counts[key] && counts[key].days && counts[key].days[day] && counts[key].days[day].seen;
    const entries = daySeen ? Object.keys(daySeen) : [];
    return res.status(200).json({ key, day, uniqueVisitorsToday: entries.length, sample: entries.slice(0, 50) });
  } catch (e) {
    console.error('admin visitors error', e);
    return res.status(500).json({ error: 'internal' });
  }
};
