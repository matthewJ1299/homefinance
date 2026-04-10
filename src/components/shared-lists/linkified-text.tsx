"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";

/**
 * Detects http(s) and `www.` URLs (www gets https). Renders the rest as plain text (no HTML injection).
 */
const URL_SEGMENT = /(\bhttps?:\/\/[^\s<>[\]{}|\\^`"]+|\bwww\.[^\s<>[\]{}|\\^`"]+)/gi;

function hrefForSegment(segment: string): string {
  if (/^https?:\/\//i.test(segment)) return segment;
  if (/^www\./i.test(segment)) return `https://${segment}`;
  return segment;
}

export function LinkifiedText({
  text,
  className,
  linkClassName,
}: {
  text: string;
  className?: string;
  linkClassName?: string;
}) {
  if (!text) return null;
  const segments = text.split(URL_SEGMENT);
  return (
    <span className={className}>
      {segments.map((segment, i) => {
        const href = hrefForSegment(segment);
        const isUrl =
          /^https?:\/\//i.test(segment) || /^www\./i.test(segment);
        if (isUrl && href.startsWith("http")) {
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "text-primary underline underline-offset-2 hover:opacity-90 break-all cursor-pointer",
                linkClassName
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {segment}
            </a>
          );
        }
        return <Fragment key={i}>{segment}</Fragment>;
      })}
    </span>
  );
}
