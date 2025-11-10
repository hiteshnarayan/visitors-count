// Correct relative path depth: svg/[key].js is two levels under project root (api/svg), so use '../../lib/storage'
const { getCount } = require('../../lib/storage');

// Custom branded SVG badge (no Shields dependency)
// Route: /api/svg/<key>
module.exports = async (req, res) => {
  const { key } = req.query;
  if (!key) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="40"><text x="10" y="25" font-size="14" fill="red">missing key</text></svg>');
  }
  try {
    const value = await getCount(key);
    const label = key.toUpperCase();
    // Basic dimensions
    const width = 320;
    const height = 64;
    // SVG gradient & styling
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n`
      + `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label} visitors ${value}">\n`
      + `<defs>\n`
      + `  <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">\n`
      + `    <stop offset="0%" stop-color="#2E9AFE"/>\n`
      + `    <stop offset="50%" stop-color="#7FDBDA"/>\n`
      + `    <stop offset="100%" stop-color="#1B1F23"/>\n`
      + `  </linearGradient>\n`
      + `  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">\n`
      + `    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#0A0A0A" flood-opacity="0.35"/>\n`
      + `  </filter>\n`
      + `</defs>\n`
      + `<rect rx="14" width="${width}" height="${height}" fill="url(#grad)" filter="url(#shadow)"/>\n`
      + `<g font-family="'Fira Code', 'JetBrains Mono', monospace" font-size="16" fill="#ffffff">\n`
      + `  <text x="28" y="28" font-size="13" letter-spacing="2" opacity="0.85">${label}</text>\n`
      + `  <text x="28" y="50" font-size="22" font-weight="600">${value} visitors</text>\n`
      + `</g>\n`
      + `<circle cx="12" cy="14" r="6" fill="#ffffff" opacity="0.92"/>\n`
      + `<circle cx="12" cy="14" r="4" fill="#2E9AFE"/>\n`
      + `<title>${label} visitors ${value}</title>\n`
      + `</svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.status(200).end(svg);
  } catch (e) {
    console.error('svg badge error', e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="40"><text x="10" y="25" font-size="14" fill="red">error</text></svg>');
  }
};
