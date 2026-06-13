# Design-Vereinheitlichung Phase 1 — Planner SPA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Settings-Modal-Größensprung beheben, Legacy-Token-Aliase entfernen und den Typo-Scale als Tokens etablieren — ohne sichtbare Regression.

**Architecture:** Drei isolierte Tasks im SPA-Repo `curriculr-planner`. Task 1 (Modal-Fix) ist die gemeldete Bug-Behebung. Task 2 (Token-Dedup) entfernt doppelte Farbnamen. Task 3 extrahiert den bereits inline genutzten Typo-Scale in CSS-Tokens. Keine Editor-/Wizard-/Sync-/Schema-Änderung.

**Tech Stack:** React + TypeScript + Vite, Tailwind v4 (`@theme` in `src/styles/globals.css`), Zustand, Vitest + Testing Library.

**Spec:** [docs/superpowers/specs/2026-06-13-design-unification-planner-wp.md](../specs/2026-06-13-design-unification-planner-wp.md)

---

## File Structure

| Datei | Verantwortung | Aktion |
|-------|---------------|--------|
| `src/components/settings/SettingsModal.tsx` | Modal-Container-Layout | Modify (feste Höhe) |
| `src/components/settings/SettingsModal.test.tsx` | Höhen-Stabilität testen | Create |
| `src/styles/globals.css` | Token-Quelle | Modify (Body-Refs, Alias-Block, Typo-Tokens) |
| `src/components/editor/WpSyncControls.tsx` | nutzt Legacy-Text-Aliase | Modify |
| `src/components/welcome/Welcome.tsx` | kanonisches Display-Heading | Modify (Token statt inline) |

---

## Task 1: Settings-Modal feste Höhe

**Files:**
- Modify: `src/components/settings/SettingsModal.tsx:76-78`
- Test: `src/components/settings/SettingsModal.test.tsx` (create)

**Problem:** `DialogContent` hat feste Breite, aber nur `max-h-[90vh]`; der Content-Bereich ist `flex-1 overflow-y-auto`. Tab-Inhalt variiert stark (ExportTab ~10 Zeilen, TemplatesTab ~198) → die Box wächst/schrumpft und re-zentriert pro Tab. Fix: feste Höhe, interner Scroll bleibt erhalten (Body ist bereits `flex-1 overflow-hidden min-h-0`).

- [ ] **Step 1: Failing-Test schreiben**

Create `src/components/settings/SettingsModal.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SettingsModal } from './SettingsModal';
import { useUiStore } from '@/stores/ui';

describe('SettingsModal sizing', () => {
  beforeEach(() => {
    cleanup();
    useUiStore.setState({ settingsModalOpen: true, settingsTab: 'export' });
  });

  it('applies a fixed height so the box does not resize per tab', () => {
    render(<SettingsModal />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('h-[min(680px,90vh)]');
  });

  it('uses the same height class regardless of active tab', () => {
    useUiStore.setState({ settingsTab: 'export' });
    render(<SettingsModal />);
    const short = screen.getByRole('dialog').className;
    cleanup();
    useUiStore.setState({ settingsModalOpen: true, settingsTab: 'about' });
    render(<SettingsModal />);
    const tall = screen.getByRole('dialog').className;
    expect(tall).toBe(short);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag verifizieren**

Run: `npx vitest run src/components/settings/SettingsModal.test.tsx`
Expected: FAIL — `expect(received).toContain('h-[min(680px,90vh)]')`, weil die Höhenklasse noch fehlt.

- [ ] **Step 3: Feste Höhe einbauen**

In `SettingsModal.tsx`, die `className` von `DialogContent` (Zeile 77) von:

```tsx
        className="!max-w-[min(1060px,calc(100vw-2rem))] !w-[min(1060px,calc(100vw-2rem))] !p-0 max-h-[90vh] overflow-hidden flex flex-col"
```

ändern zu:

```tsx
        className="!max-w-[min(1060px,calc(100vw-2rem))] !w-[min(1060px,calc(100vw-2rem))] !p-0 h-[min(680px,90vh)] max-h-[90vh] overflow-hidden flex flex-col"
```

- [ ] **Step 4: Test laufen lassen, Erfolg verifizieren**

Run: `npx vitest run src/components/settings/SettingsModal.test.tsx`
Expected: PASS (beide Tests).

- [ ] **Step 5: Typecheck + Lint**

Run: `npm run typecheck && npm run lint`
Expected: keine Fehler, 0 Warnings.

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/SettingsModal.tsx src/components/settings/SettingsModal.test.tsx
git commit -m "fix(settings): feste Modal-Höhe gegen Größensprung pro Tab"
```

---

## Task 2: Legacy-Token-Aliase entfernen

**Files:**
- Modify: `src/styles/globals.css:56-66` (Alias-Definitionen), `:92-93` (Body-Referenzen)
- Modify: `src/components/editor/WpSyncControls.tsx` (7 Stellen)

**Problem:** `globals.css` definiert `--color-primary-*`, `--color-accent-*`, `--color-bg-body`, `--color-text-main`, `--color-text-muted` als Legacy-Aliase mit identischen Hex zu den kanonischen `marine-*`/`gelb-*`/`paper-*`/`ink-*`. Zwei Namen pro Farbe. Einzige verbleibenden Nutzungen außerhalb von `globals.css`: `--color-text-main`/`--color-text-muted` in `WpSyncControls.tsx` und die Body-Regeln in `globals.css` selbst.

**Mapping:** `bg-body`→`paper-bg`, `text-main`→`ink-900`, `text-muted`→`ink-500`. (`primary-*`/`accent-*` werden nirgends mehr referenziert.)

> Hinweis: NICHT anfassen sind die shadcn-`@theme inline`-Variablen `--color-accent-foreground: var(--accent-foreground)` (Z. 118) und `--color-primary-foreground: var(--primary-foreground)` (Z. 124) — andere Variablen.

- [ ] **Step 1: Guard-Test definieren (Migrationsvollständigkeit)**

Dieser Schritt nutzt einen Grep-Guard statt eines Unit-Tests, da reine CSS-Variablen-Umbenennung kein Laufzeitverhalten ändert.

Run (vor der Änderung — zeigt aktuelle Nutzung):
```bash
grep -rn "color-text-main\|color-text-muted\|color-bg-body\|color-primary-\|color-accent-warning\|color-accent-success\|color-accent-error" src --include="*.tsx" --include="*.ts" | grep -v "globals.css"
```
Expected (Ausgangszustand): 7 Treffer, alle in `src/components/editor/WpSyncControls.tsx`.

- [ ] **Step 2: WpSyncControls migrieren**

In `src/components/editor/WpSyncControls.tsx` alle 7 Vorkommen ersetzen:
- `text-[var(--color-text-main)]` → `text-[var(--color-ink-900)]`
- `text-[var(--color-text-muted)]` → `text-[var(--color-ink-500)]`

```bash
sed -i '' 's/--color-text-main/--color-ink-900/g; s/--color-text-muted/--color-ink-500/g' src/components/editor/WpSyncControls.tsx
```

- [ ] **Step 3: globals.css Body-Referenzen migrieren**

In `src/styles/globals.css` die `html, body`-Regel (Zeilen 92-93) von:

```css
  background: var(--color-bg-body);
  color: var(--color-text-main);
```

zu:

```css
  background: var(--color-paper-bg);
  color: var(--color-ink-900);
```

- [ ] **Step 4: Alias-Block entfernen**

In `src/styles/globals.css` den kompletten Legacy-Alias-Block (Zeilen 56-66) löschen:

```css
  /* Legacy-Aliase (alte Namen → neue Werte; identische Hex) */
  --color-primary-900: #00345C;
  --color-primary-700: #00467D;
  --color-primary-500: #0058A0;
  --color-primary-100: #E6F4FF;
  --color-accent-warning: #FFC857;
  --color-accent-success: #0E9F6E;
  --color-accent-error: #E02424;
  --color-bg-body: #F3F5F9;
  --color-text-main: #111827;
  --color-text-muted: #4B5563;
```

- [ ] **Step 5: Guard erneut laufen lassen — keine Treffer mehr**

Run:
```bash
grep -rn "color-text-main\|color-text-muted\|color-bg-body\|color-primary-\|color-accent-warning\|color-accent-success\|color-accent-error" src --include="*.tsx" --include="*.ts" --include="*.css" | grep -v "accent-foreground\|primary-foreground"
```
Expected: keine Ausgabe (leer).

- [ ] **Step 6: Build + Tests + Typecheck + Lint**

Run: `npm run typecheck && npm run lint && npm run test:run && npm run build`
Expected: alles grün, `dist/` baut.

- [ ] **Step 7: Commit**

```bash
git add src/styles/globals.css src/components/editor/WpSyncControls.tsx
git commit -m "refactor(tokens): Legacy-Farb-Aliase entfernen, auf kanonische marine/ink/paper Tokens"
```

---

## Task 3: Typo-Scale als Tokens etablieren

**Files:**
- Modify: `src/styles/globals.css` (`@theme`-Block, Typo-Tokens hinzufügen)
- Modify: `src/components/welcome/Welcome.tsx:103`

**Problem:** Der DESIGN.md-Typo-Scale (display 20/700/1.2/-0.01em, headline 15/600/1.3, title 13/600, body 13/400) wird heute nur inline als arbitrary Tailwind-Werte genutzt (z.B. Welcome-h1: `text-[20px] font-bold leading-[1.2] tracking-[-0.01em]`). Keine Tokens → nicht DRY, Werte driften leicht auseinander. Lösung: Scale als CSS-Tokens definieren und das kanonische Display-Heading darauf umstellen.

> Scope-Hinweis: Phase 1 etabliert die Tokens und migriert das kanonische Display-Heading (Welcome). Die breite Migration weiterer Headings ist bewusst Folgearbeit — nicht Teil dieses Plans, um den Diff klein und reviewbar zu halten.

- [ ] **Step 1: Typo-Tokens in globals.css definieren**

In `src/styles/globals.css` im `@theme`-Block direkt nach den `--radius-*`-Tokens (vor `/* Schatten */`) einfügen:

```css
  /* Typo-Scale (DESIGN.md) */
  --fs-display: 20px;
  --lh-display: 1.2;
  --ls-display: -0.01em;
  --fs-headline: 15px;
  --lh-headline: 1.3;
  --fs-title: 13px;
  --fs-body: 13px;
```

- [ ] **Step 2: Welcome-h1 auf Tokens umstellen**

In `src/components/welcome/Welcome.tsx` Zeile 103 von:

```tsx
          <h1 className="text-[20px] font-bold leading-[1.2] tracking-[-0.01em] text-[var(--color-marine-800)]">Planner</h1>
```

zu:

```tsx
          <h1 className="text-[length:var(--fs-display)] font-bold leading-[var(--lh-display)] tracking-[var(--ls-display)] text-[var(--color-marine-800)]">Planner</h1>
```

- [ ] **Step 3: Bestehender Welcome-Test grün**

Run: `npx vitest run src/components/welcome/Welcome.test.tsx`
Expected: PASS (Heading-Text „Planner" unverändert; nur Styling-Quelle geändert).

- [ ] **Step 4: Build + Typecheck + Lint**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: alles grün. Visuell: Welcome-Überschrift unverändert (20px, identische Werte über Tokens).

- [ ] **Step 5: Commit**

```bash
git add src/styles/globals.css src/components/welcome/Welcome.tsx
git commit -m "refactor(typo): Typo-Scale als CSS-Tokens, Welcome-Display-Heading darauf umgestellt"
```

---

## Task 4: Versionierung

**Files:**
- Modify: `package.json` (version)

- [ ] **Step 1: Version bumpen**

In `package.json` das `version`-Feld auf den nächsten Minor heben (z.B. `1.3.0` → passend zum aktuellen Stand; aktuellen Wert vorher prüfen mit `node -p "require('./package.json').version"`).

- [ ] **Step 2: CHANGELOG ergänzen**

In `CHANGELOG.md` einen Eintrag voranstellen:

```markdown
## [<neue Version>]
### Behoben
- Einstellungs-Modal: feste Höhe, kein Größensprung mehr beim Tab-Wechsel.
### Geändert
- Design-Tokens: Legacy-Farb-Aliase entfernt; Typo-Scale als CSS-Tokens etabliert.
```

- [ ] **Step 3: Commit**

```bash
git add package.json CHANGELOG.md
git commit -m "chore: version bump für Design-Vereinheitlichung Phase 1"
```

---

## Self-Review

**Spec-Abdeckung (Phase 1):**
- Modal-Fix → Task 1 ✓
- Token-Dedup → Task 2 ✓
- Typo-Hierarchie → Task 3 ✓ (mit dokumentiertem Scope-Schnitt: Tokens + kanonisches Heading; breite Migration als Folgearbeit)
- Schatten-Skala → bewusst weggelassen: Audit zeigte, dass `--shadow-card`/`--shadow-modal`/`--shadow-btn` bereits semantisch korrekt genutzt werden (card für Blöcke/WeekTable, modal für Overlays/Dialoge, btn für Buttons). Kein Änderungsbedarf — keine Busywork-Task.
- Versionierung → Task 4 ✓

**Platzhalter-Scan:** keine TBD/TODO; alle Code-Schritte mit konkretem Diff und erwarteter Ausgabe.

**Typ-/Namens-Konsistenz:** Token-Namen (`--fs-display`, `--color-ink-900`, `--color-paper-bg`) konsistent über Tasks. Höhenklasse `h-[min(680px,90vh)]` identisch in Fix (Task 1 Step 3) und Test (Step 1).
