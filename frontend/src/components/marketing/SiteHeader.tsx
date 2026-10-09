import Link from "next/link";
import { Wordmark } from "@/components/brand/VigilMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ButtonLink } from "@/components/ui/Button";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#privacy", label: "Privacy" },
  { href: "/#institutions", label: "For institutions" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Vigil home">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ButtonLink href="/login/student" variant="secondary" size="sm" className="hidden sm:inline-flex">
            Log in
          </ButtonLink>
          <ButtonLink href="/demo" variant="secondary" size="sm">
            Demo
          </ButtonLink>
          <ButtonLink href="/login/admin" size="sm">
            For faculty
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
