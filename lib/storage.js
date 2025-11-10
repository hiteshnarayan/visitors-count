const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let useUpstash = false;
let redis = null;
try {
  const { Redis } = require('@upstash/redis');
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    useUpstash = true;
  }
} catch (e) {
  // package may not be installed locally; fallback will be used
}

const DATA_DIR = path.join(__dirname, '..', 'data');
const COUNTS_FILE = path.join(DATA_DIR, 'counts.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(COUNTS_FILE)) fs.writeFileSync(COUNTS_FILE, JSON.stringify({}), 'utf8');

function readFileCounts() {
  try {
    return JSON.parse(fs.readFileSync(COUNTS_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function writeFileCounts(counts) {
  fs.writeFileSync(COUNTS_FILE, JSON.stringify(counts, null, 2), 'utf8');
}

async function addHit(key, hash) {
  // returns { added: boolean, value: number }
  const day = new Date().toISOString().slice(0, 10);
  if (useUpstash && redis) {
    const daySet = `visitors:${key}:${day}`;
    const added = await redis.sadd(daySet, hash);
    if (added) {
      await redis.incr(`count:${key}`);
    }
    // set TTL to 8 days
    await redis.expire(daySet, 60 * 60 * 24 * 8);
    const value = parseInt((await redis.get(`count:${key}`)) || '0', 10);
    return { added: !!added, value };
  } else {
    const counts = readFileCounts();
    if (!counts[key]) counts[key] = { value: 0, seen: {} };
    if (!counts[key].seen[hash]) {
      counts[key].value += 1;
      counts[key].seen[hash] = Date.now();
      // trim seen older than 8 days
      const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 8;
      Object.keys(counts[key].seen).forEach(h => {
        if (counts[key].seen[h] < cutoff) delete counts[key].seen[h];
      });
      writeFileCounts(counts);
      return { added: true, value: counts[key].value };
    }
    return { added: false, value: counts[key].value };
  }
}

async function getCount(key) {
  if (useUpstash && redis) {
    return parseInt((await redis.get(`count:${key}`)) || '0', 10);
  }
  const counts = readFileCounts();
  return (counts[key] && counts[key].value) || 0;
}

// Track unique authenticated users (by userId string)
function hmacId(id) {
  const secret = process.env.VISITOR_HMAC_SECRET;
  if (!secret) return id;
  return crypto.createHmac('sha256', secret).update(String(id)).digest('hex');
}

async function addUser(key, userId) {
  const storedId = hmacId(userId);
  if (useUpstash && redis) {
    const setKey = `users:${key}`;
    const added = await redis.sadd(setKey, storedId);
    const value = await redis.scard(setKey);
    return { added: !!added, value };
  }
  const counts = readFileCounts();
  if (!counts[key]) counts[key] = { value: 0, seen: {}, users: {} };
  if (!counts[key].users) counts[key].users = {};
  if (!counts[key].users[storedId]) {
    counts[key].users[storedId] = Date.now();
    writeFileCounts(counts);
    return { added: true, value: Object.keys(counts[key].users).length };
  }
  return { added: false, value: Object.keys(counts[key].users).length };
}

async function getUserCount(key) {
  if (useUpstash && redis) {
    const setKey = `users:${key}`;
    return parseInt((await redis.scard(setKey)) || '0', 10);
  }
  const counts = readFileCounts();
  return (counts[key] && counts[key].users) ? Object.keys(counts[key].users).length : 0;
}

async function removeUser(key, userId) {
  const storedId = hmacId(userId);
  if (useUpstash && redis) {
    const setKey = `users:${key}`;
    const removed = await redis.srem(setKey, storedId);
    const value = await redis.scard(setKey);
    return { removed: !!removed, value };
  }
  const counts = readFileCounts();
  if (!counts[key] || !counts[key].users) return { removed: false, value: 0 };
  if (counts[key].users[storedId]) {
    delete counts[key].users[storedId];
    writeFileCounts(counts);
    return { removed: true, value: Object.keys(counts[key].users).length };
  }
  return { removed: false, value: Object.keys(counts[key].users).length };
}

async function resetKey(key) {
  if (useUpstash && redis) {
    await redis.del(`users:${key}`);
    await redis.del(`count:${key}`);
    // also delete daily sets is optional
    return { reset: true };
  }
  const counts = readFileCounts();
  if (counts[key]) {
    delete counts[key];
    writeFileCounts(counts);
  }
  return { reset: true };
}

module.exports = { addHit, getCount, addUser, getUserCount, removeUser, resetKey, useUpstash };
