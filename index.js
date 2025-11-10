const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const COUNTS_FILE = path.join(DATA_DIR, 'counts.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(COUNTS_FILE)) fs.writeFileSync(COUNTS_FILE, JSON.stringify({}), 'utf8');

function readCounts() {
  try {
    return JSON.parse(fs.readFileSync(COUNTS_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function writeCounts(counts) {
  fs.writeFileSync(COUNTS_FILE, JSON.stringify(counts, null, 2), 'utf8');
}

// Return Shields-compatible JSON for a badge
// Example: /badge/my-project
app.get('/badge/:key', (req, res) => {
  const key = req.params.key;
  const counts = readCounts();
  const entry = counts[key] || { value: 0 };

  const badge = {
    schemaVersion: 1,
    label: entry.label || key,
    message: String(entry.value),
    color: 'green'
  };

  res.set('Content-Type', 'application/json');
  res.send(badge);
});

// Register a hit. Uses a simple unique-tracking by hashing IP + UA + key + day
app.get('/hit/:key', (req, res) => {
  const key = req.params.key;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const ua = req.headers['user-agent'] || '';

  // Use a daily window to allow one unique view per IP+UA per day
  const day = new Date().toISOString().slice(0, 10);
  const hash = crypto.createHash('sha256').update(`${key}|${ip}|${ua}|${day}`).digest('hex');

  const counts = readCounts();
  if (!counts[key]) counts[key] = { value: 0, seen: {} };

  if (!counts[key].seen[hash]) {
    counts[key].value += 1;
    counts[key].seen[hash] = Date.now();
    // Keep seen map small: trim older entries (7 days)
    const weekAgo = Date.now() - 1000 * 60 * 60 * 24 * 7;
    Object.keys(counts[key].seen).forEach(h => {
      if (counts[key].seen[h] < weekAgo) delete counts[key].seen[h];
    });
    writeCounts(counts);
  }

  res.json({ success: true, value: counts[key].value });
});

// Simple health
app.get('/', (req, res) => {
  res.send('Visitor count service is running');
});

app.listen(PORT, () => {
  console.log(`Visitor count service listening on port ${PORT}`);
});
