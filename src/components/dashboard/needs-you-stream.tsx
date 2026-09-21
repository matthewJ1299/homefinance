"use client";

import { useState } from "react";
import { NeedsYouRow } from "./needs-you-row";
import { NeedsYouGroupRow } from "./needs-you-group-row";
import { NEEDS_YOU_GROUP_META, NEEDS_YOU_ICONS } from "./needs-you-icons";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { useDashboardTilesSettings } from "@/components/settings/dashboard-tiles-settings";
import type { NeedsYouGroup, NeedsYouItem } from "./needs-you-list";

/** A source with at least this many rows collapses into one summary row. */
const FLOOD_THRESHOLD = 3;
/** Top-level rows shown before "+N more"; a collapsed group counts as one. */
const VISIBLE_LIMIT = 6;

type StreamNode =
  | { kind: "item"; item: NeedsYouItem }
  | { kind: "group"; group: NeedsYouGroup; items: NeedsYouItem[] };

/**
 * Renders the one prioritised stream.
 *
 * The Settings toggles gate row kinds (a row with no `tile` is always shown).
 * When a single source floods the stream its rows collapse into one summary row
 * -- except calendar, which stays individual so a time-sensitive event is never
 * buried. "+N more" reveals the rest; a collapsed group expands in place.
 */
export function NeedsYouStream({ items }: { items: NeedsYouItem[] }) {
  const { state } = useDashboardTilesSettings();
  const [showAll, setShowAll] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<NeedsYouGroup>>(new Set());

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

  // Which sources have flooded. Calendar is never collapsed.
  const counts = new Map<NeedsYouGroup, number>();
  const grouped = new Map<NeedsYouGroup, NeedsYouItem[]>();
  for (const it of visible) {
    counts.set(it.group, (counts.get(it.group) ?? 0) + 1);
    const arr = grouped.get(it.group) ?? [];
    arr.push(it);
    grouped.set(it.group, arr);
  }
  const collapsed = new Set<NeedsYouGroup>();
  for (const [g, n] of counts) {
    if (g !== "calendar" && n >= FLOOD_THRESHOLD) collapsed.add(g);
  }

  // `visible` is already priority-sorted, so a group node lands at its most
  // urgent member's position and everything else keeps its place.
  const nodes: StreamNode[] = [];
  const emitted = new Set<NeedsYouGroup>();
  for (const it of visible) {
    if (collapsed.has(it.group)) {
      if (!emitted.has(it.group)) {
        emitted.add(it.group);
        nodes.push({ kind: "group", group: it.group, items: grouped.get(it.group)! });
      }
    } else {
      nodes.push({ kind: "item", item: it });
    }
  }

  const shown = showAll ? nodes : nodes.slice(0, VISIBLE_LIMIT);

  const toggleGroup = (g: NeedsYouGroup) =>
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });

  return (
    <section className="space-y-2">
      <SectionHeader title="Needs you" />
      <div className="space-y-1.5">
        {shown.map((node, i) => {
          if (node.kind === "item") {
            return (
              <NeedsYouRow
                key={node.item.key}
                icon={NEEDS_YOU_ICONS[node.item.icon]}
                title={node.item.title}
                // The first row explains itself; the rest are a title and a verb.
                detail={i === 0 ? node.item.detail : undefined}
                actionLabel={node.item.actionLabel}
                href={node.item.href}
                rowTone={node.item.tone}
              />
            );
          }
          const meta = NEEDS_YOU_GROUP_META[node.group];
          const isExpanded = expandedGroups.has(node.group);
          return (
            <div key={`group-${node.group}`} className="space-y-1.5">
              <NeedsYouGroupRow
                icon={NEEDS_YOU_ICONS[meta.icon]}
                label={meta.label}
                count={node.items.length}
                topTitle={node.items[0].title}
                rowTone={node.items[0].tone}
                expanded={isExpanded}
                onToggle={() => toggleGroup(node.group)}
              />
              {isExpanded ? (
                <div className="space-y-1.5 pl-3">
                  {node.items.map((it) => (
                    <NeedsYouRow
                      key={it.key}
                      icon={NEEDS_YOU_ICONS[it.icon]}
                      title={it.title}
                      actionLabel={it.actionLabel}
                      href={it.href}
                      rowTone={it.tone}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}

        {nodes.length > VISIBLE_LIMIT ? (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="w-full pt-1 text-center text-xs font-medium text-muted-foreground"
          >
            {showAll ? "Show less" : `+${nodes.length - VISIBLE_LIMIT} more`}
          </button>
        ) : null}
      </div>
    </section>
  );
}
