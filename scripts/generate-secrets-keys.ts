#!/usr/bin/env npx tsx

/**
 * Generate API keys for use with Encore secrets
 * Run: npx tsx scripts/generate-secrets-keys.ts
 */

// Generate a new API key (copied from auth.ts to avoid Encore runtime dependency)
function generateAPIKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

console.log("🔑 Generated API Keys for Encore Secrets");
console.log("=========================================");
console.log("");

const adminKey = generateAPIKey();
const writeKey = generateAPIKey();
const readKey = generateAPIKey();

console.log("Copy these values to your Encore Cloud dashboard under Settings > Secrets:");
console.log("");
console.log(`ADMIN_API_KEY=${adminKey}`);
console.log(`WRITE_API_KEY=${writeKey}`);
console.log(`READ_API_KEY=${readKey}`);
console.log("");

console.log("🚀 How to set these in Encore Cloud:");
console.log("1. Go to your Encore Cloud dashboard");
console.log("2. Navigate to your app > Environment (staging/production)");
console.log("3. Go to Settings > Secrets");
console.log("4. Add each secret with the key name and generated value");
console.log("");

console.log("💡 For testing your deployed API:");
console.log(`curl -H "Authorization: Bearer ${readKey}" https://staging-tinycdp-s3b2.encr.app/ingest/health`);
console.log("");

console.log("✅ Keys generated successfully!");
