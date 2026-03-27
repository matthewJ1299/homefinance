# Mutations UX (Optimistic UI + toasts)

Whenever the app creates, updates, or deletes data, it follows the same contract:

- **Optimistic update**: apply the change in the UI immediately (so the interface feels instant).
- **Success**: show a success toast after the write completes, then refresh/revalidate in the background so server-rendered data stays consistent.
- **Failure**: show an error toast and **roll back** the optimistic change (remove the optimistic row, restore the deleted row, or restore the previous value).

## Implementation notes

- **Server actions** often return `{ success: false, error: string }` instead of throwing. Client components treat this as a failure and roll back explicitly.
- For **server-provided lists** (RSC props), client parents mirror props into local state and keep it synced. This keeps the UI snappy while `router.refresh()` reconciles.
- For **React Query** collections (Calendar), mutations update the query cache optimistically and roll back via `onError`.

