export function AboutTab() {
  return (
    <div className="space-y-3 text-sm">
      <h3 className="text-lg font-semibold">Curriculr Planner</h3>
      <p>Version: 1.0.0</p>
      <p className="text-[var(--color-text-muted)]">
        Standalone-Tool zur Erstellung des Jahresterminplans.
      </p>
      <p>
        <a href="https://github.com" className="text-[var(--color-primary-700)] underline" target="_blank" rel="noreferrer">
          Quellcode auf GitHub
        </a>
      </p>
      <p className="text-xs text-[var(--color-text-muted)]">MIT-Lizenz</p>
    </div>
  );
}
