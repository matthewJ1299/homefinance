# Lists feature

## Overview

Shared and personal todo-style lists with label and quantity per item. Items can be completed, incremented/decremented, deleted, or **reordered** (grip handle on the left; persisted `sort_order`). Open items and completed items each have their own order; completed rows stay grouped below open rows.

**Related**: The **Add** hub (`/add`) includes **New task**, which opens the shared `AddListItemDialog` (shared vs personal scope, list picker, label, quantity).

## Navigation and pages

- **`/lists`**: **My lists** overview for the current scope (`?scope=shared` default, or `personal`). Shows filter chips (**All** + one per list), a progress bar per list, the latest items inline, and **Open** linking to `/lists/[id]`. If there are no lists, the page explains how to add one in Settings.
- **`/lists/[id]`**: Single-list management: rename/delete list, add items, full item rows with quantity, **drag-to-reorder** (same pattern as Manage categories), and delete, **Delete all completed**.
- **Settings > Lists**: After creating lists, **List items** offers a list dropdown and the same add/remove/complete/quantity/reorder/clear-completed flows as the list detail page (`SharedListItemsManage`).

## Data and actions

- Repositories: `ISharedListRepository`, `ISharedListItemRepository`.
- **Optional notes per item**: Shown on **My lists**, **`/lists/[id]`**, and **Settings > Lists > List items** as a **single-line** subtitle under the label (ellipsized). Tap the label row (chevron) to expand a **read-only** note preview (scroll-capped height); **tap the preview** to open the textarea, **Save note** / **Cancel** (`setListItemNote` replaces your notes when saved). Paste `http(s)` or `www.` URLs; they are clickable in the subtitle and preview (new tab; link click does not toggle the row). Backed by `notes` rows (`NOTE_LINKED_TYPE_SHARED_LIST_ITEM`, `linked_id` = item id). Deleting a list, item, or completed items removes linked notes via repositories.
- Server actions: `shared-list.actions` (create/update/delete list, create/update/delete items, **reorder items** (`reorderListItems`), delete completed).

## UI components

- `MyListsOverview` – client; scope + filter state.
- `SharedListItemRow` – optional `dateLabel` and `listId` (chevron to detail) for the overview; detail page uses rows without `listId`. Sortable wiring: `SortableSharedListItemRow` + `SharedListSortableItemList` (`@dnd-kit` + `reorderListItems`).
- `SharedListsManage` / `ListPicker` – Settings: create/delete lists by scope.
- `SharedListItemsManage` – Settings: pick a list and manage its rows (reuses `SharedListItemRow` and list server actions).
- `AddListItemDialog` – shared modal for adding an item (used by Add hub and `QuickAddTrigger` / `QuickAddFab` if enabled elsewhere). On success it calls `onSuccess({ listId })` so the host can navigate (e.g. to `/lists/[id]`).
