"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface FeaturedItem {
  id: string;
  name: string;
  category: string;
  summary: string;
  points: readonly string[];
  outcome: string;
  visual: React.ReactNode;
  visualDescription: string;
}

/**
 * Tabbed showcase (adapted from the 21st.dev featured-project hero): accessible tabs with
 * arrow-key navigation, a visual on the left and copy on the right.
 */
export function FeaturedHero({
  eyebrow,
  title,
  description,
  items,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  items: readonly FeaturedItem[];
  className?: string;
}) {
  const uid = React.useId();
  const tabs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const [index, setIndex] = React.useState(0);
  const item = items[index];

  function onKey(event: React.KeyboardEvent, at: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : (at + (event.key === "ArrowRight" ? 1 : -1) + items.length) % items.length;
    setIndex(next);
    tabs.current[next]?.focus();
  }

  return (
    <section className={cn("w-full", className)} aria-labelledby={`${uid}-title`}>
      <p className="mb-4 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        <span className="h-px w-6 bg-current" aria-hidden />
        {eyebrow}
      </p>
      <header className="grid items-end gap-6 md:grid-cols-[1.3fr_1fr] md:gap-10">
        <h2 id={`${uid}-title`} className="max-w-[18ch] text-4xl leading-[1.08] tracking-[-0.045em] md:text-5xl">
          {title}
        </h2>
        {description ? <p className="max-w-[42ch] text-[15px] text-muted-foreground">{description}</p> : null}
      </header>

      <div
        role="tablist"
        aria-label={eyebrow}
        className="mt-8 flex gap-2 overflow-x-auto border-b border-border pb-4"
      >
        {items.map((entry, at) => (
          <button
            key={entry.id}
            ref={(node) => {
              tabs.current[at] = node;
            }}
            type="button"
            role="tab"
            id={`${uid}-tab-${at}`}
            aria-controls={`${uid}-panel`}
            aria-selected={at === index}
            tabIndex={at === index ? 0 : -1}
            onClick={() => setIndex(at)}
            onKeyDown={(event) => onKey(event, at)}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2 text-sm whitespace-nowrap",
              at === index
                ? "border-border bg-card text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "grid size-6 place-items-center rounded-md text-[11px] tabular-nums",
                at === index ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {String(at + 1).padStart(2, "0")}
            </span>
            {entry.name}
          </button>
        ))}
      </div>

      {item ? (
        <article
          key={item.id}
          id={`${uid}-panel`}
          role="tabpanel"
          aria-labelledby={`${uid}-tab-${index}`}
          tabIndex={0}
          className="mt-8 grid items-center gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500 md:grid-cols-[1.2fr_1fr] md:gap-12"
        >
          <div
            role="img"
            aria-label={item.visualDescription}
            className="aspect-[1.2] overflow-hidden rounded-3xl border border-border bg-muted"
          >
            <div aria-hidden className="size-full">
              {item.visual}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {item.category}
            </p>
            <h3 className="mt-3 text-3xl tracking-[-0.04em] md:text-4xl">{item.name}</h3>
            <p className="mt-4 max-w-[42ch] text-muted-foreground">{item.summary}</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {item.points.map((point) => (
                <li key={point} className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
                  {point}
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t border-border pt-5">
              <p className="text-[11px] uppercase tracking-[0.13em] text-muted-foreground">The difference</p>
              <p className="mt-1.5 max-w-[40ch] text-sm">{item.outcome}</p>
            </div>
          </div>
        </article>
      ) : null}
    </section>
  );
}
