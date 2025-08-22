#!/usr/bin/env node

const crypto = require('crypto');

console.log('🔐 Generating secure encryption keys for Vercel deployment...\n');

// Generate a 32-character encryption key
const encryptionKey = crypto.randomBytes(32).toString('base64').slice(0, 32);
// Generate a 16-character salt
const encryptionSalt = crypto.randomBytes(16).toString('base64').slice(0, 16);

console.log('✅ Generated secure keys:\n');
console.log(`ENCRYPTION_KEY=${encryptionKey}`);
console.log(`ENCRYPTION_SALT=${encryptionSalt}\n`);

console.log('📋 Copy these values to your Vercel environment variables:');
console.log('1. Go to your Vercel dashboard');
console.log('2. Select your project');
console.log('3. Go to Settings > Environment Variables');
console.log('4. Add each variable with the values above');
console.log('5. Make sure to set them for "Production" environment');
console.log('6. Redeploy your application\n');

console.log('⚠️  Security Notes:');
console.log('- Keep these keys secure and private');
console.log('- Never commit them to your repository');
console.log('- Use different values for development and production');
console.log('- Consider rotating these values periodically');
