# Feedback

People report problems from inside the app; a super-admin reads them in one place.

## How a report starts

Two entry points, both landing in the same modal:

- **"Send feedback"** in the sidebar and the mobile menu. A button, not a route —
  navigating away would lose the screen the report is about.
- **A "Tell us" action on an error toast**, when something genuinely failed. The
  modal then shows the error read-only and pre-fills what was being attempted.

## Which failures offer to become a report

`authedAction` marks a failure `reportable` when it came from an exception rather
than a rule the person broke:

| Case | Toast | Why |
|---|---|---|
| Validation (`Pick a day between 1 and 28`) | plain | The app is working correctly |
| Not entitled to a feature | plain | A billing conversation, not a bug |
| Unexpected throw in an action | **"Tell us"** | Something is wrong |
| Crash contained by `ErrorBoundary` | **"Tell us"** | Automatic |
| Unhandled promise rejection | **"Tell us"** | Automatic |

Only the server can tell validation from an exception — a call site sees
`{ success: false, error }` either way — so the flag is set in the wrapper's
`catch` and read by `toastActionFailure`.

New mutation call sites should use `toastActionFailure(result, { attemptedAction })`
rather than `toast.error(result.error)`, so the affordance appears where it should.

## What is stored

`feedback`, one row per report:

| Column | Notes |
|---|---|
| `body` | The report. Non-empty by CHECK constraint |
| `user_id` / `household_id` | Composite tenant FK, per the 0048 convention |
| `attempted_action` | Auto-filled from a failure, otherwise typed |
| `pathname` | The route they were on |
| `error_message` | Set when raised from a failure |
| `source` | `menu` or `error` — a suggestion versus a bug report |

## The unread badge

`users.feedback_last_seen_at`, per admin: one super-admin reading the list does
not clear it for another. `FeedbackService.openInbox` reads the count *before*
moving the marker, so the screen says "1 new" on the visit that clears it rather
than on the visit after.

The admin reads are deliberately **not** tenant-scoped — `/admin` is global — so
they call `requireSuperAdmin()` where the rest of the repository layer calls
`requireHouseholdId()`.

## Related

- `src/components/feedback/` — provider, modal, menu item
- `src/lib/feedback/` — the error-path bridge and the toast helper
- `src/app/admin/feedback/page.tsx` — the inbox
- `drizzle/0052_feedback_pg.sql`
