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

## When a push is sent

Only payloads whose `kind` is in `PUSHABLE_KINDS` (`split`, `calendar`, `reminder`) ever leave the server; anything else (`in_app_only`) is logged as suppressed. The `NotificationService` gate is what enforces this, so a new sender has to opt in deliberately.

| Trigger | Who is told | Kind |
|---|---|---|
| Shared spend added (Add sheet, `addExpenseWithParticipants`) | the other participants, each with their own share | `split` |
| Shared spend(s) filed from the bank (recon **Accept all** / **File it** / **Process marked**) | the other participants, one summary each: count, total, their share | `split` |
| Calendar event created | everyone except the creator | `calendar` |
| Per-event reminder (scheduler, every minute at the reminder instant) | the creator, or everyone if the event is shared | `reminder` |
| Daily summary of today's events (scheduler at `DAILY_NOTIFICATION_HOUR`, default 09:00 SAST) | each person with events that day | `reminder` |
| Manual test (`POST /api/push/send`) | yourself only | `reminder` |

Deliberately **in-app only** (never pushed): shared-list items being added. Editing an existing split does not push.

## Related

- [README](../README.md) — env vars and PWA install
- Settings UI: `src/components/push/push-notifications-settings.tsx`
