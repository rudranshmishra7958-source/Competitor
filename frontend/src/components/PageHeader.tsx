export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {description ? (
        <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
      ) : null}
    </header>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-10 text-center text-sm text-[var(--muted)]">
      {children}
    </div>
  );
}
