"use client";

import { NeedsYouRow } from "./needs-you-row";
import { NEEDS_YOU_ICONS } from "./needs-you-icons";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { useDashboardTilesSettings } from "@/components/settings/dashboard-tiles-settings";
import type { NeedsYouItem } from "./needs-you-list";

/**
 * Renders the one prioritised stream.
 *
 * The Settings toggles used to switch whole tiles on and off; they now gate row
 * kinds instead, so every existing preference keeps working with no schema
 * change. A row with no `tile` is always shown -- there was never a toggle for
 * "you are over budget".
 */
export function NeedsYouStream({ items }: { items: NeedsYouItem[] }) {
  const { state } = useDashboardTilesSettings();
  const visible = items.filter((i) => i.tile == null || state[i.tile]);

  if (visible.length === 0) {
    return (
      <section className="space-y-2">
        <SectionHeader title="Needs you" />
        <EmptyState
          title="Nothing needs you today"
          message="Everything's assigned, nothing's over, and the house is quiet."
        />
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <SectionHeader title="Needs you" />
      <div className="space-y-1.5">
        {/* Six is what fits above the fold on a 390px screen with the hero in
            place. A stream that grows without limit becomes a feed. */}
        {visible.slice(0, 6).map((item, i) => (
          <NeedsYouRow
            key={item.key}
            icon={NEEDS_YOU_ICONS[item.icon]}
            title={item.title}
            // The top row explains itself; the rest are a title and a verb, so
            // six fit a phone screen without scrolling.
            detail={i === 0 ? item.detail : undefined}
            actionLabel={item.actionLabel}
            href={item.href}
            rowTone={item.tone}
          />
        ))}
        {visible.length > 6 ? (
          <p className="pt-1 text-center text-xs text-muted-foreground">
            +{visible.length - 6} more
          </p>
        ) : null}
      </div>
    </section>
  );
}
