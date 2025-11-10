const fetch = require('node-fetch');
const { addUser } = require('../../lib/storage');

module.exports = async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) return res.status(400).send('missing code/state');
  const { key, redirect } = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));

  try {
    // Exchange code for access token
    const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code }),
    });
    const tokenJson = await tokenResp.json();
    const accessToken = tokenJson.access_token;
    if (!accessToken) return res.status(400).send('no access token');

    // Fetch user
    const userResp = await fetch('https://api.github.com/user', {
      headers: { Authorization: `token ${accessToken}`, Accept: 'application/json', 'User-Agent': 'visitor-count-service' }
    });
    const userJson = await userResp.json();
    const userId = String(userJson.id || userJson.login || 'unknown');

    // Register user
    const result = await addUser(key, userId);

    // Redirect back
    if (redirect) {
      res.writeHead(302, { Location: redirect + `?added=${result.added}&value=${result.value}` });
      res.end();
    } else {
      res.json({ success: true, added: result.added, value: result.value });
    }
  } catch (e) {
    console.error(e);
    res.status(500).send('error');
  }
};
