import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cx } from "./cx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "btn-grad",
  secondary: "glass text-[var(--foreground)] hover:border-[var(--accent)]",
  ghost: "text-[var(--foreground)] hover:bg-[var(--nav-active-bg)]",
  danger:
    "bg-[var(--risk-high-bg)] text-[var(--risk-high-fg)] border border-[var(--risk-high-fg)]/30 hover:brightness-95",
};

const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-6 text-base",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium select-none disabled:cursor-not-allowed disabled:opacity-60";

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
      className={cx(base, variants[variant], sizes[size], className)}
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
    <Link href={href} {...rest} className={cx(base, variants[variant], sizes[size], className)}>
      {children}
    </Link>
  );
}
