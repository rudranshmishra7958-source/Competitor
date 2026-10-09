import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "border border-border bg-card text-foreground hover:border-[var(--border-strong)] hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
  danger: "border border-[var(--risk-high-fg)]/30 bg-[var(--risk-high-bg)] text-[var(--risk-high-fg)] hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3.5 text-sm",
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-12 px-6 text-[15px]",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium select-none whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50";

type Common = { variant?: Variant; size?: Size; className?: string; children: React.ReactNode };

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  ...rest
}: Common & { loading?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || loading}
      className={cn(base, variants[variant], sizes[size], className)}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  href,
  ...rest
}: Common & { href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link href={href} {...rest} className={cn(base, variants[variant], sizes[size], className)}>
      {children}
    </Link>
  );
}
