// Run with: npm run hash-password
// Prompts for a plain-text password and prints a bcrypt hash you can
// paste into server/config.js -> USERS[].passwordHash
const readline = require('readline');
const bcrypt = require('bcryptjs');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Enter the plain-text password to hash: ', (password) => {
  if (!password) {
    console.error('No password entered.');
    rl.close();
    process.exit(1);
  }
  const hash = bcrypt.hashSync(password, 10);
  console.log('\nCopy this hash into server/config.js:\n');
  console.log(hash);
  console.log('');
  rl.close();
});
