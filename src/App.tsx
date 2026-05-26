export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center">
        <img src="/curriculr-logo-dark.svg" alt="Curriculr" className="h-12 mx-auto mb-4" onError={(e) => { e.currentTarget.src = '/curriculr-logo.svg'; }} />
        <h1 className="text-2xl font-bold text-[var(--color-primary-900)]">
          Planner — Setup OK
        </h1>
        <p className="text-[var(--color-text-muted)] mt-2">
          Tailwind + Brand-Tokens funktionieren.
        </p>
      </div>
    </div>
  );
}
