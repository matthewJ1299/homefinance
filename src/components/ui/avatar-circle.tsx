import * as React from "react";

function hashToHue(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

function computeInitials(name: string | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/g).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + second).slice(0, 2).toUpperCase();
}

export interface AvatarCircleProps {
  name?: string;
  initials?: string;
  size?: number; // px
  className?: string;
}

export function AvatarCircle({ name, initials, size = 32, className }: AvatarCircleProps) {
  const shown = (initials ?? computeInitials(name)).trim().slice(0, 2).toUpperCase() || "?";
  const hue = hashToHue(shown);
  const bg = `hsl(${hue} 70% 45% / 0.18)`;
  const fg = `hsl(${hue} 75% 70% / 0.95)`;

  return (
    <div
      aria-label={name ?? "Avatar"}
      className={[
        "flex items-center justify-center rounded-full border font-medium shrink-0 tabular-nums select-none",
        className ?? "",
      ].join(" ")}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        color: fg,
        borderColor: "hsl(0 0% 100% / 0.06)",
      }}
    >
      <span className="text-sm leading-none">{shown}</span>
    </div>
  );
}

