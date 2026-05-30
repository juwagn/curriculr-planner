# Curriculr Planner

Standalone web tool for school principals to create an annual school schedule. Exports as ICS for the Curriculr WordPress plugin.

## Live demo

After enabling GitHub Pages on the repository, the app is published at
`https://<user>.github.io/curriculr-planner/`.

## Development

```bash
npm install
npm run dev          # http://localhost:5173
npm run test         # watch mode
npm run test:run     # CI mode
npm run typecheck
npm run build        # production bundle in dist/
npm run preview      # serve dist/ locally
```

## Spec & Roadmap

The full design spec lives in the sibling repo:
`Wordpress Plugin Terminplaner/docs/superpowers/specs/2026-05-26-curriculr-planner-design.md`

v1.0 covers wizard, quarter editor, drag-drop, ICS export, LocalStorage. Roadmap: v1.1 conflict detection, v1.2 templates + Excel import, v1.3 cloud sync, v1.4 recurring events.

## Stack

- Vite + React 19 + TypeScript (strict)
- Tailwind v4 + shadcn/ui
- @dnd-kit (drag-drop)
- Zustand (state) + react-hook-form + Zod (validation)
- Vitest + Testing-Library

## Releases

### v1.0.0 — 2026-05-26 (MVP)
- Setup wizard (3 steps: schoolyear/categories/groups)
- Quarter editor with FullCalendar (drag-drop between days)
- Event create/edit modal with category auto-matching via keywords
- Weekend + holiday warning toasts on drop
- Note per schoolweek (popover trigger via 📝 icon + slide-in sidebar)
- Settings modal (5 tabs: schoolyear, categories, groups, export, about)
- Export: ICS, JSON-backup, Excel (Konverter-compatible format)
- Multi-plan management via plan-switcher dialog
- LocalStorage with auto-save (300ms debounced) + restore-from-backup

## License

MIT
