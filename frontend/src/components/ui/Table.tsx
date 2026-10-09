import { cn } from "@/lib/utils";

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
    <div className={cn("overflow-x-auto rounded-2xl border border-border bg-card", className)}>
      <table className="w-full min-w-[40rem] text-left text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}

export const th = "px-4 py-3 text-xs font-medium text-muted-foreground border-b border-border";
export const td = "px-4 py-3.5 align-middle border-t border-border first:border-t-0";
