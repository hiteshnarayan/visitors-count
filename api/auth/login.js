module.exports = (req, res) => {
  const { key, redirect } = req.query;
  if (!key) return res.status(400).send('missing key');
  const clientId = process.env.GITHUB_CLIENT_ID;
  const state = Buffer.from(JSON.stringify({ key, redirect })).toString('base64');
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=read:user&state=${state}`;
  res.writeHead(302, { Location: url });
  res.end();
};
