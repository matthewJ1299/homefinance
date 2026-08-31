# Push notifications

Web Push uses VAPID keys (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`) and the service worker in `src/sw.ts`.

## Client flow

1. User enables notifications in Settings (`subscribeToPush`).
2. Subscription is stored in `push_subscriptions` via `POST /api/push/subscribe`.
3. `PushSubscriptionRepair` in the app shell re-subscribes after SW updates, resume, bfcache, going online, and `pushsubscriptionchange`.

## Android PWA notes

- The service worker **always** calls `showNotification` (even when the push payload is empty) to satisfy Chrome's user-visible requirement.
- Real-time sends use **TTL 3600s** and **urgency: high** via `web-push`.
- `pushsubscriptionchange` notifies open clients to run repair and re-register with the server.
- `expirationTime` from the browser subscription is not persisted; stale endpoints are removed when sends return 410/401/403.

## Related

- [README](../README.md) — env vars and PWA install
- Settings UI: `src/components/push/push-notifications-settings.tsx`
