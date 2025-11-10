const { addUser, getUserCount } = require('./lib/storage');

async function run() {
  console.log('Initial user count:', await getUserCount('test-repo'));
  console.log('Add user 123:', await addUser('test-repo', '123'));
  console.log('Add user 123 again:', await addUser('test-repo', '123'));
  console.log('Add user 456:', await addUser('test-repo', '456'));
  console.log('Final user count:', await getUserCount('test-repo'));
}

run().catch(console.error);
