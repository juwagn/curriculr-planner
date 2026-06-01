# YearGrid Hover-Popover — Design Spec

**Date:** 2026-06-01  
**Status:** Approved

## Problem

In der `YearGrid`-Ansicht (Monate × Tage) zeigt jede Zelle nur einen farbigen Punkt plus Zahl-Badge. Welcher Termin dahintersteckt, ist ohne Klick nicht erkennbar — schlechte Übersicht beim Scannen des Jahresplans.

## Solution

Hover-Popover: Mouseover über eine Zelle mit Termin(en) zeigt ein kompaktes Popup mit Titel und Kategorie-Badge für jeden Termin des Tages.

## Design

### Trigger

- Radix `<Tooltip>` mit `delayDuration={400}` auf `<Tooltip.Provider>` im `YearGrid`
- 400ms Delay verhindert Flackern beim Drüberscrollen
- Popover verschwindet sofort beim Verlassen der Zelle
- Kein Tooltip bei Ferien-/Feiertag-only-Zellen ohne Termin

### Popover-Inhalt

```
┌─────────────────────────────┐
│ 15. OKT 2025                │  ← gelb, uppercase, 10px
├─────────────────────────────┤
│ ● Elternabend Klasse 8a     │  ← Farbpunkt + Titel
│   [Eltern]                  │  ← Kategorie-Badge
├─────────────────────────────┤  ← Trennlinie (nur bei >1 Termin)
│ ● Lehrerkonferenz           │
│   [Konferenz]               │
└─────────────────────────────┘
```

- Datum-Header: `dd. MMM YYYY` formatiert (Deutsch)
- Pro Termin: `color dot (8px)` + `title (font-weight 600)` + Kategorie-Label als Badge
- Badge: `background: pastelize(color)`, `color: saturated`, `font-size: 9px`
- Trennlinie zwischen Terminen wenn `events.length > 1`
- Hintergrund: `var(--color-marine-900)` (dunkel), Text weiß
- Border-radius: 8px, shadow: `0 4px 16px rgba(0,0,0,0.3)`
- `max-width: 240px`, Titel truncated bei Überlänge

### Positionierung

- `<Tooltip.Content side="top" sideOffset={4}>`
- Radix übernimmt auto-flip (top → bottom wenn kein Platz)
- Radix rendert via Portal → kein `overflow: hidden` Clipping im Table

### Klick-Verhalten

Unverändert: Klick auf Zelle öffnet Edit-Modal (1 Termin) oder erste Termin (mehrere). `+`-Button für weiteren Termin bleibt erhalten.

### Scope

- **Nur `src/components/editor/YearGrid.tsx`** wird geändert
- `GridCell` bekommt Radix `<Tooltip>` um den `<td>`-Inhalt
- `YearGrid` bekommt `<Tooltip.Provider delayDuration={400}>` als Wrapper
- Kein neues Dep (`radix-ui` bereits installiert, enthält Tooltip-Primitive)
- Kein Store-Change, keine neuen Dateien

### Nicht in Scope

- Touch/Mobile (Tool ist Desktop-only)
- Ferien-/Feiertag-Zellen ohne Termin (kein Tooltip nötig)
- Inline-Editing im Popover (Klick bleibt für Edit zuständig)

## Testing

- Manuell: Hover über Zelle mit 1 Termin → Popover erscheint nach ~400ms
- Manuell: Hover über Zelle mit 2+ Terminen → alle gelistet mit Trennlinie
- Manuell: Popover am oberen Rand → flippt nach unten
- Kein neuer Unit-Test nötig (rein visuelle Interaktion, kein Logic-Change)
