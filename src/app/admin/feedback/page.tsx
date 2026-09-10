import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { FeedbackService } from "@/lib/services/feedback.service";
import { formatDisplayDateTime } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

/**
 * Everything people have sent in, newest first, across every household.
 *
 * Opening the page marks it read for THIS admin — the badge is per-person, so
 * one super-admin reading the list does not clear it for another.
 */
export default async function AdminFeedbackPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  setRequestContextFromSession(session);

  const { items, unreadCount } = await new FeedbackService().openInbox(
    Number(session.user.id)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Feedback</h1>
        <p className="text-sm text-muted-foreground">
          {items.length === 0
            ? "Nothing yet"
            : `${items.length} total${unreadCount > 0 ? ` · ${unreadCount} new` : ""}`}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            When someone sends feedback — from the menu, or from an error — it lands here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => {
            // The newest `unreadCount` rows are the ones that arrived since this
            // admin last looked; the list is already in that order.
            const isNew = index < unreadCount;
            return (
              <li
                key={item.id}
                className={`rounded-lg border p-4 ${isNew ? "border-primary/50 bg-primary/5" : ""}`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {isNew ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 font-semibold text-primary-foreground">
                      New
                    </span>
                  ) : null}
                  <span
                    className={
                      item.source === "error"
                        ? "rounded bg-destructive/10 px-2 py-0.5 font-medium text-destructive"
                        : "rounded bg-muted px-2 py-0.5 font-medium"
                    }
                  >
                    {item.source === "error" ? "From an error" : "From the menu"}
                  </span>
                  <span className="font-medium text-foreground">{item.userName}</span>
                  <span>{item.userEmail}</span>
                  <span>· {item.householdName}</span>
                  <span className="ml-auto tabular-nums">
                    {formatDisplayDateTime(item.createdAt)}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm">{item.body}</p>

                <dl className="mt-3 grid gap-1 border-t pt-3 text-xs sm:grid-cols-[10rem_1fr]">
                  <dt className="text-muted-foreground">Trying to</dt>
                  <dd className="font-medium">{item.attemptedAction ?? "—"}</dd>
                  <dt className="text-muted-foreground">Screen</dt>
                  <dd className="font-mono">{item.pathname}</dd>
                  {item.errorMessage ? (
                    <>
                      <dt className="text-muted-foreground">Error shown</dt>
                      <dd className="font-mono text-destructive break-words">
                        {item.errorMessage}
                      </dd>
                    </>
                  ) : null}
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
