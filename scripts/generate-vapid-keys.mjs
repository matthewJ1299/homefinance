/**
 * Generates VAPID keys for Web Push. Set the output in your environment or .env:
 *   VAPID_PUBLIC_KEY=...
 *   VAPID_PRIVATE_KEY=...
 * Run: node scripts/generate-vapid-keys.mjs
 */
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("Add these to your environment (e.g. .env):");
console.log("");
console.log("VAPID_PUBLIC_KEY=" + keys.publicKey);
console.log("VAPID_PRIVATE_KEY=" + keys.privateKey);
console.log("");
console.log("Keep VAPID_PRIVATE_KEY secret. The public key is sent to clients for subscription.");
