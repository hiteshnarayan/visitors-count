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

// In serverless (e.g., Vercel), the filesystem is read-only except /tmp
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const DATA_DIR = isServerless
  ? path.join('/tmp', 'visitor-count-data')
  : path.join(__dirname, '..', 'data');
const COUNTS_FILE = path.join(DATA_DIR, 'counts.json');
try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(COUNTS_FILE)) fs.writeFileSync(COUNTS_FILE, JSON.stringify({}), 'utf8');
} catch (e) {
  // If we cannot initialize the file store (e.g., read-only FS), we'll operate with in-memory fallback.
}

let memoryCounts = {};
function readFileCounts() {
  try {
    if (fs.existsSync(COUNTS_FILE)) {
      return JSON.parse(fs.readFileSync(COUNTS_FILE, 'utf8'));
    }
  } catch (e) {
    // fall through to memory
  }
  return memoryCounts;
}

function writeFileCounts(counts) {
  try {
    fs.writeFileSync(COUNTS_FILE, JSON.stringify(counts, null, 2), 'utf8');
  } catch (e) {
    // fallback to memory only in environments where writing is not allowed
    memoryCounts = counts;
  }
}

async function addHit(key, hash) {
  // returns { added: boolean, value: number }
  const day = new Date().toISOString().slice(0, 10);
  if (useUpstash && redis) {
    try {
      // Add a timeout to prevent hanging on slow/dead Redis
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis timeout')), 5000)
      );
      const daySet = `visitors:${key}:${day}`;
      const added = await Promise.race([
        redis.sadd(daySet, hash),
        timeoutPromise
      ]);
      if (added) {
        await Promise.race([
          redis.incr(`count:${key}`),
          timeoutPromise
        ]);
      }
      // set TTL to 8 days
      await Promise.race([
        redis.expire(daySet, 60 * 60 * 24 * 8),
        timeoutPromise
      ]);
      const value = parseInt((await Promise.race([
        redis.get(`count:${key}`),
        timeoutPromise
      ]) || '0'), 10);
      return { added: !!added, value };
    } catch (redisError) {
      // Fall through to file-based storage on Redis error
      console.error('Redis error, falling back to file storage:', redisError.message);
    }
  }
  
  if (true) {  // Fallback or non-Upstash path
    const counts = readFileCounts();
    const day = new Date().toISOString().slice(0, 10);
    // initialize structure: per-key total and per-day seen maps
    if (!counts[key]) counts[key] = { value: 0, days: {} };
    if (!counts[key].days) counts[key].days = {};
    if (!counts[key].days[day]) counts[key].days[day] = { seen: {} };

    if (!counts[key].days[day].seen[hash]) {
      // new for this day -> increment total (mirrors Upstash behavior)
      counts[key].value += 1;
      counts[key].days[day].seen[hash] = Date.now();

      // remove day entries older than 8 days
      const cutoffDay = new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString().slice(0, 10);
      Object.keys(counts[key].days).forEach(d => {
        if (d < cutoffDay) delete counts[key].days[d];
      });

      writeFileCounts(counts);
      return { added: true, value: counts[key].value };
    }
    return { added: false, value: counts[key].value };
  }
}

async function getCount(key) {
  if (useUpstash && redis) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis timeout')), 5000)
      );
      return parseInt((await Promise.race([
        redis.get(`count:${key}`),
        timeoutPromise
      ]) || '0'), 10);
    } catch (redisError) {
      console.error('Redis error in getCount, falling back:', redisError.message);
    }
  }
  if (true) {  // Fallback
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
    // Delete recent daily visitor sets (covering TTL window)
    const today = new Date();
    for (let i = 0; i < 10; i++) {
      const d = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
      try { await redis.del(`visitors:${key}:${d}`); } catch (_) {}
    }
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
