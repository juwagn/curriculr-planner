# Curriculr Planner

Standalone web tool for school principals to create and publish an annual school schedule. Exports to WordPress (REST API) and IServ (ICS calendar subscription).

**Live:** `https://juwagn.github.io/curriculr-planner/`

## Features

- Wizard to create a new school year plan (holidays, categories, groups)
- Weekly table editor with drag-and-drop event placement
- Year grid overview (months × days)
- Undo/redo (Ctrl+Z / Ctrl+Shift+Z)
- Event templates (drag/click-to-place)
- Export: ICS, JSON backup, Excel (Konverter-compatible), PDF print
- Multi-plan management
- IServ SSO login (OIDC) — app-token RAM-only, never persisted
- WordPress sync: push/pull with stage management (Entwurf → Genehmigt → Öffentlich)
- Multi-user collaborative editing: sequential conflict resolution (409 + author info)
- Presence indicator: "X hat vor N Min gespeichert" in editor header
- Datenschutz/Vibecoding transparency tab in settings

## Development

```bash
npm install
npm run dev          # http://localhost:5173
npm run test         # watch mode
npm run test:run     # CI mode
npm run typecheck
npm run lint
npm run build        # production bundle → dist/
npm run preview      # serve dist/ locally
```

## Stack

- Vite + React 19 + TypeScript strict
- Tailwind v4 + shadcn/ui
- @dnd-kit (drag-drop)
- Zustand (state) + react-hook-form + Zod (validation)
- Vitest + Testing-Library

## Architecture

See [CLAUDE.md](CLAUDE.md) for full architecture documentation (store layout, storage layer, domain logic, conventions).

## Deployment

GitHub Pages via `.github/workflows/deploy.yml`. Push to `main` → auto-deploy. Vite `base` = `/curriculr-planner/` in production.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT
