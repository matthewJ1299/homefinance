/**
 * Generates VAPID keys for Web Push. Set the output in your environment or .env:
 *   VAPID_PUBLIC_KEY=...
 *   VAPID_PRIVATE_KEY=...
 * Run: node scripts/generate-vapid-keys.mjs
 */
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("Add these to your environment (e.g. .env). Use BOTH from this single run:");
console.log("");
console.log("VAPID_PUBLIC_KEY=" + keys.publicKey);
console.log("VAPID_PRIVATE_KEY=" + keys.privateKey);
console.log("");
console.log("Verify in server logs after deploy: public key should end with:", keys.publicKey.slice(-8) + ", private key should start with:", keys.privateKey.slice(0, 6) + "...");
console.log("Keep VAPID_PRIVATE_KEY secret. The public key is sent to clients for subscription.");
