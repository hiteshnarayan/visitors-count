const { addUser, getUserCount, removeUser, resetKey } = require('./lib/storage');

async function run() {
  await resetKey('test-repo');
  console.log('After reset, count:', await getUserCount('test-repo'));
  console.log('Add user A:', await addUser('test-repo', 'A'));
  console.log('Add user B:', await addUser('test-repo', 'B'));
  console.log('Count now:', await getUserCount('test-repo'));
  console.log('Remove user A:', await removeUser('test-repo', 'A'));
  console.log('Count after remove:', await getUserCount('test-repo'));
  console.log('Reset key:', await resetKey('test-repo'));
  console.log('Final count:', await getUserCount('test-repo'));
}

run().catch(console.error);
