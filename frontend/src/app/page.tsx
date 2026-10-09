import Link from "next/link";
import { ArrowRight, GraduationCap, ShieldCheck } from "lucide-react";

const portals = [
  {
    href: "/login/student",
    title: "Student",
    hint: "College ID or college email",
    Icon: GraduationCap,
  },
  {
    href: "/login/admin",
    title: "Faculty / admin",
    hint: "Faculty ID or faculty email",
    Icon: ShieldCheck,
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16 sm:px-6">
      <div className="rise w-full max-w-2xl text-center">
        <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-[var(--nav-active-fg)]">
          <ShieldCheck className="size-3.5" aria-hidden />
          Secure Examination Platform
        </span>
        <h1 className="mt-5 text-4xl font-semibold sm:text-5xl">
          Exams that are{" "}
          <span className="bg-[image:var(--accent-grad)] bg-clip-text text-transparent">
            fair, calm and clear
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-[var(--muted)]">
          Use the account provisioned by your institution. Webcam capture is not required to sign
          in, and integrity signals are evidence for a human reviewer, never an automatic verdict.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {portals.map(({ href, title, hint, Icon }) => (
            <Link
              key={href}
              href={href}
              className="glass lift group rounded-2xl p-6 text-left"
            >
              <span className="btn-grad grid size-12 place-items-center rounded-xl">
                <Icon className="size-6" aria-hidden />
              </span>
              <p className="mt-4 text-lg font-semibold">{title}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{hint}</p>
              <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--nav-active-fg)]">
                Continue
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-1"
                  aria-hidden
                />
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
