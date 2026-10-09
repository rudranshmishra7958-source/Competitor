import { ArrowUpRight, Check, Minus } from "lucide-react";
import { ApertureHero } from "@/components/brand/ApertureHero";
import { Wordmark } from "@/components/brand/VigilMark";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import {
  BuilderPreview,
  EvidencePreview,
  ExamPreview,
  LiveCenterPreview,
  PriorityGridPreview,
  ReportPreview,
  SnapshotStripPreview,
} from "@/components/marketing/Previews";
import { ButtonLink } from "@/components/ui/Button";
import { FeaturedHero, type FeaturedItem } from "@/components/ui/featured-hero";

const FEATURES = [
  {
    title: "Review priority",
    body: "Every session gets a 0–100 priority with the reasons behind it, so reviewers open the right attempt first.",
    preview: <PriorityGridPreview />,
  },
  {
    title: "Snapshot evidence",
    body: "Optional webcam proctoring keeps still frames at each incident and on a schedule. Video is never recorded.",
    preview: <SnapshotStripPreview />,
  },
  {
    title: "Ranked incidents",
    body: "Browser, camera and agent signals are grouped into incidents and cross-checked before they count.",
    preview: <ReportPreview />,
  },
];

const STEPS: FeaturedItem[] = [
  {
    id: "build",
    name: "Build the exam",
    category: "Faculty",
    summary:
      "Schedule multiple-choice, short-answer and photographed answers. Choose which signals count and whether this exam needs a webcam.",
    points: ["Question bank", "Per-exam policy", "Webcam opt-in"],
    outcome: "Rules are visible to students before they start.",
    visual: <BuilderPreview />,
    visualDescription: "Security policy panel with enforce and log-only rules.",
  },
  {
    id: "sit",
    name: "Student sitting",
    category: "Students",
    summary:
      "A quiet exam room with a clear timer, autosave and plain-language notices whenever something is recorded.",
    points: ["Autosave", "Consent first", "Self-view camera"],
    outcome: "Students always know what is being checked.",
    visual: <ExamPreview />,
    visualDescription: "Dark exam screen with timer and a multiple-choice question.",
  },
  {
    id: "live",
    name: "Live monitoring",
    category: "Proctors",
    summary: "Sessions sort themselves by review priority while the exam is running, with a short reason on every row.",
    points: ["Real-time", "Priority sorted", "Agent status"],
    outcome: "Attention goes where it is needed, not everywhere.",
    visual: <LiveCenterPreview />,
    visualDescription: "Live monitoring list sorted by priority.",
  },
  {
    id: "report",
    name: "Evidence report",
    category: "Reviewers",
    summary:
      "Open a session to see what to check first, the snapshots behind each incident and the reference photo side by side. Export to PDF.",
    points: ["Check-first list", "Snapshot timeline", "PDF export"],
    outcome: "A decision in minutes, recorded with a note.",
    visual: <EvidencePreview />,
    visualDescription: "Evidence report with priority score and snapshot strip.",
  },
];

const RECORDED = [
  "Leaving the exam tab, focus and fullscreen changes",
  "Copy and paste actions (never the text)",
  "With the agent: foreground app name, displays, network",
  "With webcam proctoring: still snapshots and on-device detections",
];

const REFUSED = [
  "Video or audio recordings",
  "Keystrokes, window titles, URLs or files",
  "Automatic fail decisions",
  "Hidden monitoring: the agent and camera are always visible",
];

const PRINCIPLES = [
  {
    title: "Evidence, not verdicts",
    body: "Scores rank what to review. A person makes every decision and records why.",
  },
  {
    title: "Consent and visibility",
    body: "Webcam proctoring is enabled per exam by faculty and accepted by each student before starting.",
  },
  {
    title: "Minimal data",
    body: "Analysis happens on the student's device. Only events and stills are kept, and they expire.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main id="main">
        <section className="mx-auto max-w-6xl px-4 pt-16 text-center sm:px-6 md:pt-24">
          <h1 className="mx-auto max-w-4xl text-5xl leading-[1.04] tracking-[-0.045em] animate-in fade-in slide-in-from-bottom-3 duration-700 sm:text-6xl md:text-7xl">
            Fair exams, verified calmly.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground animate-in fade-in duration-700 sm:text-lg">
            Vigil runs online exams for colleges and turns integrity signals into clear, reviewable evidence,
            without recording video or guessing at guilt.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/login/student" size="lg">
              Student sign in
            </ButtonLink>
            <ButtonLink href="/login/admin" variant="secondary" size="lg">
              Faculty sign in
            </ButtonLink>
          </div>
          <ApertureHero className="mt-6 md:mt-10" />
        </section>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
          <div className="grid gap-6 md:grid-cols-2 md:items-end">
            <h2 className="max-w-[16ch] text-4xl leading-[1.08] tracking-[-0.045em] md:text-5xl">
              Integrity tools that respect students
            </h2>
            <p className="max-w-md text-muted-foreground md:justify-self-end">
              Run timed exams, monitor them live and review only what matters, with every signal explained in plain
              language.
            </p>
          </div>
          <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
            {FEATURES.map((feature) => (
              <div key={feature.title}>
                <h3 className="text-xl tracking-[-0.02em]">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
                <div className="mt-6 rounded-3xl border border-border bg-muted p-5">{feature.preview}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="border-y border-border bg-card/50 py-24 scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <FeaturedHero
              eyebrow="How it works"
              title="From the exam builder to a reviewed decision"
              description="Four steps, one record. Each stage shows exactly what it collects and why."
              items={STEPS}
            />
          </div>
        </section>

        <section id="privacy" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
          <h2 className="max-w-[18ch] text-4xl leading-[1.08] tracking-[-0.045em] md:text-5xl">
            Clear about what we record
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card p-7">
              <p className="text-sm font-medium">Recorded during an exam</p>
              <ul className="mt-5 space-y-3 text-sm">
                {RECORDED.map((item) => (
                  <li key={item} className="flex gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-[var(--sage-ink)]" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-border bg-card p-7">
              <p className="text-sm font-medium">Never collected</p>
              <ul className="mt-5 space-y-3 text-sm">
                {REFUSED.map((item) => (
                  <li key={item} className="flex gap-3 text-muted-foreground">
                    <Minus className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="institutions" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-24 sm:px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {PRINCIPLES.map((principle) => (
              <div key={principle.title} className="rounded-3xl border border-border p-7">
                <h3 className="text-lg tracking-[-0.02em]">{principle.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{principle.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-col items-start justify-between gap-6 rounded-3xl bg-primary p-8 text-primary-foreground md:flex-row md:items-center md:p-10">
            <div>
              <h2 className="text-3xl tracking-[-0.04em] md:text-4xl">Ready for your next exam cycle</h2>
              <p className="mt-2 max-w-lg text-sm opacity-75">
                Accounts are issued by your institution. Sign in with your college or faculty ID.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink
                href="/login/student"
                className="bg-primary-foreground text-primary hover:opacity-90"
                size="lg"
              >
                Student sign in
                <ArrowUpRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink
                href="/login/admin"
                className="border border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                size="lg"
              >
                Faculty sign in
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:px-6">
          <Wordmark />
          <p>Evidence for people, not automatic verdicts.</p>
        </div>
      </footer>
    </div>
  );
}
