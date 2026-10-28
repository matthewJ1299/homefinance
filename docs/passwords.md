# Password management

Related: [admin-portal](./admin-portal.md), [onboarding](./onboarding.md).

## Model

| Column | Purpose |
|--------|---------|
| `users.must_change_password` | When true, user is redirected to `/change-password` before any app route |
| `users.password_changed_at` | Timestamp of last voluntary change |

Passwords are hashed with bcrypt (10 rounds). Minimum length 10 characters (Zod in `src/lib/validators/password.schema.ts`).

## Flows

### Forced change (admin reset or new temp password)

1. Admin resets password from `/admin/users` — temp password shown once in a dialog.
2. User signs in → middleware and `(app)/layout` redirect to `/change-password`.
3. User sets a new password (no current password field) → `must_change_password` cleared.

### Voluntary change (Settings)

**Settings → Profile → Change password** uses `ChangePasswordForm` and `changePasswordAction` with current-password verification via `PasswordService.changeOwnPassword`.

## Service

`src/lib/services/password.service.ts` — `changeOwnPassword`, `adminResetPassword`, `verifyPassword`.

## Public registration

`/register` creates a pending household with a user-chosen password (not temp). Approval is separate from password policy; see [admin-portal](./admin-portal.md).
