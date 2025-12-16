const { resetKey } = require('./lib/storage');

async function reset() {
  try {
    const key = process.argv[2] || 'profile';
    console.log(`Resetting key: ${key}`);
    const result = await resetKey(key);
    console.log('Reset result:', result);
    console.log('Count should now be 0');
  } catch (e) {
    console.error('Error:', e.message);
  }
}

reset();
