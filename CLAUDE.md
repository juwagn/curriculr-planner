# Curriculr Planner — Claude Context

## Project

Standalone web tool for school principals to create an annual school schedule.
Sibling to `../Wordpress Plugin Terminplaner/` WordPress plugin which DISPLAYS
the schedule. This tool CREATES it.

## Stack

- Vite + React 19 + TypeScript strict
- Tailwind v4 + shadcn/ui (radix-nova preset)
- FullCalendar React (drag-drop calendar) — **may be replaced with custom
  table component in v1.0.2** (siehe Anmerkung unten)
- Zustand (state)
- react-hook-form + Zod (validation)
- Vitest + Testing-Library
- Package manager: **npm** (pnpm fails on Y:\ network share due to symlinks)

## Brand

- Primary: #00345C (dunkelblau)
- Accent: #FFC857 (gelb, Doppelpunkt im Logo)
- Font: Inter

## Spec + Plan

- Design-Spec: `docs/superpowers/specs/2026-05-26-curriculr-planner-design.md`
- Implementierungs-Plan: `docs/superpowers/plans/2026-05-26-curriculr-planner-v1.0.md`

## v1.0 Status (Tag v1.0.0)

Funktionsfähig: Welcome-Screen, Wizard (3 Steps), Editor mit Quartal-Kalender,
Termin-Modal, Anmerkungen pro SW, Settings-Modal, Plan-Switcher, Export
(ICS/JSON/Excel), LocalStorage Auto-Save.

## Open Issues / Phase v1.0.2 Plan

Schulleitung will FullCalendar-Layout ersetzen durch tabellarisches Layout
(Zeilen=Schulwochen, Spalten=Mo-Fr, Anmerkungen-Spalte rechts) — wie
Konverter-Excel. Design via Claude Design in Arbeit, dann Implementation hier.

Andere bekannte v1.x-Roadmap-Punkte siehe Spec.

## Commands

```bash
npm install
npm run dev        # http://localhost:5173
npm run test:run   # all tests
npm run typecheck
npm run build

Core Principles
- Simplicity. Minimal impact. Root-cause fixes.
- TDD where applicable (libs especially)
- Brand tokens never hardcoded in components — always var(--color-*)
- No business logic in shadcn UI components
- Tests co-located with implementation

