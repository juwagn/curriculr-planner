export function AboutTab() {
  return (
    <div className="space-y-3 text-[13px] text-[var(--color-ink-900)]">
      <h3 className="text-[15px] font-semibold text-[var(--color-marine-800)]">Curriculr Planner</h3>
      <p>Version: <span className="tabular-nums">1.0.0</span></p>
      <p className="text-[var(--color-ink-500)]">
        Standalone-Tool zur Erstellung des Jahresterminplans.
      </p>
      <p>
        <a
          href="https://github.com"
          className="text-[var(--color-marine-700)] underline underline-offset-2 hover:text-[var(--color-marine-800)] transition-colors"
          style={{ transitionDuration: 'var(--dur-state)' }}
          target="_blank"
          rel="noreferrer"
        >
          Quellcode auf GitHub
        </a>
      </p>
      <p className="text-[12px] text-[var(--color-ink-500)]">MIT-Lizenz</p>
    </div>
  );
}
