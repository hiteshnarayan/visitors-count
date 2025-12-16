const { Redis } = require('@upstash/redis');

module.exports = async (req, res) => {
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    
    // Test basic operations
    const testKey = 'test:' + Date.now();
    await redis.set(testKey, 'hello');
    const val = await redis.get(testKey);
    await redis.del(testKey);
    
    // Test set operations (what addHit uses)
    const setKey = 'testset:' + Date.now();
    const addResult = await redis.sadd(setKey, 'item1');
    const addResult2 = await redis.sadd(setKey, 'item1'); // duplicate
    await redis.del(setKey);
    
    res.status(200).json({
      ok: true,
      basicTest: { set: 'hello', got: val },
      setTest: { first: addResult, duplicate: addResult2 }
    });
  } catch (e) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
};
