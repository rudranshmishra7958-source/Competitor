import { cx } from "./cx";

export function TableWrap({
  caption,
  children,
  className,
}: {
  caption?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("glass overflow-x-auto rounded-2xl", className)}>
      <table className="w-full min-w-[40rem] text-left text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}

export const th =
  "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)] bg-[var(--nav-active-bg)]";
export const td = "px-4 py-3 align-middle border-t border-[var(--border)]";
