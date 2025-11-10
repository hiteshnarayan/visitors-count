const { useUpstash } = require('../lib/storage');

module.exports = async (req, res) => {
  try {
    const hasUrlEnv = Boolean(process.env.UPSTASH_REDIS_REST_URL);
    const hasTokenEnv = Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);
    const hasHmacSecret = Boolean(process.env.VISITOR_HMAC_SECRET);
    const hasAdminToken = Boolean(process.env.ADMIN_TOKEN);

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      ok: true,
      useUpstash,
      hasUrlEnv,
      hasTokenEnv,
      hasHmacSecret,
      hasAdminToken,
      node: process.version,
      env: process.env.VERCEL ? 'vercel' : 'local'
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'health_failed' });
  }
};
