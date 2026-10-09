import { cn } from "@/lib/utils";

/* Small, realistic product snippets for the landing page. Pure markup, no images. */

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-float)]", className)}>
      {children}
    </div>
  );
}

const dot = { high: "bg-[var(--risk-high-fg)]", medium: "bg-[var(--risk-medium-fg)]", low: "bg-[var(--risk-low-fg)]" };

export function PriorityGridPreview() {
  const rows = [
    { name: "Priya Nair", note: "Phone visible while tab hidden", score: 52, level: "high" as const },
    { name: "Rohan Das", note: "Left the exam tab 4 times", score: 31, level: "medium" as const },
    { name: "Meera Iyer", note: "No incidents", score: 3, level: "low" as const },
  ];
  return (
    <Frame>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Live monitoring</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-[var(--risk-low-fg)]" /> Live
        </span>
      </div>
      <ul className="mt-3 divide-y divide-border">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium">{row.name}</p>
              <p className="truncate text-xs text-muted-foreground">{row.note}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm tabular-nums">
              <span className={cn("size-1.5 rounded-full", dot[row.level])} />
              {row.score}
            </span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

export function SnapshotStripPreview() {
  const frames = [
    { label: "Reference", tone: "bg-muted" },
    { label: "Routine", tone: "bg-muted" },
    { label: "Phone", tone: "bg-[var(--risk-high-bg)]", flag: true },
    { label: "Routine", tone: "bg-muted" },
  ];
  return (
    <Frame>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Snapshot timeline</span>
        <span>No video stored</span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {frames.map((frame, index) => (
          <div key={index}>
            <div
              className={cn(
                "relative aspect-[4/3] overflow-hidden rounded-lg border",
                frame.tone,
                frame.flag ? "border-[var(--risk-high-fg)]/50" : "border-border",
              )}
            >
              <span className="absolute left-1/2 top-[22%] size-[34%] -translate-x-1/2 rounded-full border border-[var(--muted-foreground)]/40" />
              <span className="absolute bottom-0 left-1/2 h-[30%] w-[62%] -translate-x-1/2 rounded-t-full border border-b-0 border-[var(--muted-foreground)]/40" />
              {frame.flag ? (
                <span className="absolute bottom-[12%] left-[10%] h-[30%] w-[12%] rounded-sm border border-[var(--risk-high-fg)]" />
              ) : null}
            </div>
            <p className={cn("mt-1 text-[11px]", frame.flag ? "text-[var(--risk-high-fg)]" : "text-muted-foreground")}>
              {frame.label}
            </p>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function ReportPreview() {
  return (
    <Frame>
      <div className="flex items-start gap-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-xl bg-[var(--risk-high-bg)] text-[var(--risk-high-fg)]">
          <span className="text-center leading-tight">
            <span className="block text-xl font-medium tabular-nums">52</span>
            <span className="block text-[10px] uppercase tracking-wider">High</span>
          </span>
        </div>
        <div className="min-w-0 text-sm">
          <p className="text-xs text-muted-foreground">Check these first</p>
          <ol className="mt-1.5 space-y-1.5">
            <li>1. Phone visible while the exam tab was hidden</li>
            <li className="text-muted-foreground">2. Another person in view</li>
            <li className="text-muted-foreground">3. Away from camera for 14 s</li>
          </ol>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
        <div>
          <p className="text-muted-foreground">Evidence</p>
          <p className="font-medium">Strong</p>
        </div>
        <div>
          <p className="text-muted-foreground">Corroborated</p>
          <p className="font-medium tabular-nums">3 of 5</p>
        </div>
        <div>
          <p className="text-muted-foreground">Camera uptime</p>
          <p className="font-medium tabular-nums">100%</p>
        </div>
      </div>
    </Frame>
  );
}

export function BuilderPreview() {
  const rules = [
    ["Tab switch", "Enforce"],
    ["Clipboard", "Enforce"],
    ["External app", "Log only"],
    ["Webcam proctoring", "Required"],
  ];
  return (
    <div className="flex size-full items-center justify-center p-6">
      <Frame className="w-full max-w-sm">
        <p className="text-sm font-medium">Security policy</p>
        <p className="text-xs text-muted-foreground">Detection never turns off. You decide what counts.</p>
        <ul className="mt-3 divide-y divide-border text-sm">
          {rules.map(([rule, mode]) => (
            <li key={rule} className="flex items-center justify-between py-2">
              <span>{rule}</span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs",
                  mode === "Log only" ? "border-border text-muted-foreground" : "border-transparent bg-primary text-primary-foreground",
                )}
              >
                {mode}
              </span>
            </li>
          ))}
        </ul>
      </Frame>
    </div>
  );
}

export function ExamPreview() {
  return (
    <div className="exam-room flex size-full items-center justify-center !border-0 p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">Computer networks</p>
            <p className="text-sm font-medium">3 of 5 answered</p>
          </div>
          <p className="font-mono text-lg tabular-nums">18:42</p>
        </div>
        <div className="mt-3 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm">2. DNS primarily maps</p>
          <div className="mt-3 space-y-2 text-sm">
            <p className="rounded-xl border border-[var(--ring)] bg-muted px-3 py-2">Host names to IP addresses</p>
            <p className="rounded-xl border border-border px-3 py-2 text-muted-foreground">MAC addresses to ports</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LiveCenterPreview() {
  return (
    <div className="flex size-full items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <PriorityGridPreview />
      </div>
    </div>
  );
}

export function EvidencePreview() {
  return (
    <div className="flex size-full flex-col justify-center gap-3 p-6">
      <ReportPreview />
      <SnapshotStripPreview />
    </div>
  );
}
