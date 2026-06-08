# Schulleitung-Feedback: Quartale, Ferien, Druck, Settings-UI

**Datum:** 2026-06-08
**Status:** Design (genehmigt, vor Implementierungsplan)
**Codebasis:** `curriculr-planner/` (React/Vite/TS, GitHub-Pages-App — Quelle der PDF-Exporte)

## Kontext

Die Schulleitung hat vier Probleme am Jahresterminplaner gemeldet (Beleg: PDF-Export
„Jahresterminplan 2627 Version vom 08.06.26"). Alle vier werden in **einem Spec**
geplant und **sequenziell** umgesetzt: P3 → P1 → P2 → P4. Jeder Schritt ist einzeln
testbar.

Wichtige Klarstellung: Die gemeldeten Effekte stammen aus der React-App
(`curriculr-planner/`), nicht aus dem WordPress-Plugin (`curriculr-terminplan/`).
Der PDF-Footer `juwagn.github.io/curriculr-planner/` belegt das.

---

## P3 — Druck: Termintitel zweizeilig (zuerst)

### Problem
Termintitel werden im PDF abgeschnitten („1.-4. Std KL-Unterricht (B…"). Ursache:
`.event` im Druck-CSS hat `white-space:nowrap; overflow:hidden; text-overflow:ellipsis`
([print-window.ts:84](../../../src/lib/print-window.ts)), zusätzlich `td{overflow:hidden}`
([print-window.ts:76](../../../src/lib/print-window.ts)).

### Lösung
`.event`-Regel auf 2-Zeilen-Klemme umstellen:
```css
display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
white-space:normal; overflow:hidden;
```
Funktioniert im Chromium-basierten Browser-Druck (Druckdialog → „Als PDF speichern").
Zeilen dürfen höher werden; `tr{break-inside:avoid}` bleibt erhalten.

### Tests
`print-window.test.ts`: `.event` enthält kein `nowrap` mehr und enthält `line-clamp:2`.

---

## P1 — Quartalsgrenzen: editierbar + Auto-Vorschlag + Freitag-Snap

### Problem
`quarterBoundaries` (3 Datumswerte) sind **nur im Wizard** setzbar
([Step2Categories.tsx](../../../src/components/wizard/Step2Categories.tsx)), **nicht** in
den Einstellungen ([SchoolyearTab.tsx](../../../src/components/settings/SchoolyearTab.tsx)).
Die Schule hängt auf dem Default fest (Q1-Ende 31.10), obwohl ihr echtes Q1 am 28.11
endet → im PDF erscheint „Ende 1. Quartal 28.11.26" auf der Q2-Seite. Zusatzbug: liegt
eine Grenze mitten in einer Woche, erscheint diese Woche per Overlap-Filter
([print-model.ts:60](../../../src/lib/print-model.ts)) in **beiden** Quartalen.

### Lösung

**1. Editierbar in Settings.** Neuer Abschnitt „Quartale" in `SchoolyearTab`: 3
`DateInput` für `quarterBoundaries`, darunter Anzeige der berechneten Quartalsbereiche
(Q1: …–…, Q2: …–…, …). Validierung: q1 < q2 < q3 und innerhalb des Schuljahres.
Speichern über `updateSchoolyear`. Die Quartals-Reiter aktualisieren sich automatisch,
da sie aus `quarterBoundaries` abgeleitet sind
([EditorToolbar.tsx:24](../../../src/components/editor/EditorToolbar.tsx)).

**2. Auto-Vorschlag (manuell hat Vorrang).** Button „Aus Plan vorschlagen" scannt
`doc.annotations` (Wochen-Anmerkungen) nach Text-Muster `/ende\s*([1-3])\.?\s*quartal/i`.
Die Marker bedeuten: das Quartal endet am **Ende der annotierten Schulwoche**. Daher:
Grenze für Quartal N = `endDate` (Freitag) der Schulwoche mit dem Annotation-Index.
Mapping Index→endDate via `computeSchoolweeks`. Gefundene Werte füllen die 3 Felder;
Nutzer kann danach überschreiben.

**3. Freitag-Snap + eindeutige Wochen-Zuordnung.** Neue Funktion in `schoolweeks.ts`
`snapBoundaryToFriday(iso)` (Grenze auf den Freitag ihrer ISO-Woche). `getQuarterRange`
und `getQuarterForDate` nutzen gesnappte Grenzen. Die Quartals-Zuordnung im Druck
([print-model.ts:60](../../../src/lib/print-model.ts)) ordnet jede Woche über ihren
**Montag** genau einem Quartal zu (kein Overlap-Filter mehr → keine Doppelseite).

### Tests
`schoolweeks.test.ts`: `snapBoundaryToFriday`, `getQuarterRange`/`getQuarterForDate` mit
gesnappten Grenzen. `print-model.test.ts`: Grenzwoche erscheint in genau einem Quartal.
Neuer Test für den Annotation-Scan (eigene Hilfsfunktion, z.B.
`suggestQuarterBoundaries(doc)` in `schoolweeks.ts`, damit TDD-fähig).

---

## P2 — Halbe Ferienwochen einheitlich (Editor + Druck)

### Problem
Regel in [computeWeekRows](../../../src/lib/schoolweeks.ts): ≥3 Ferientage in einem
Mo–Fr-Block → ganze Woche wird Ferien-Banner. Folgen:
- Weihnachtsferien ab Mittwoch (3 Ferientage) → Woche kollabiert zum Banner; Mo/Di-
  Schultage **inkl. ihrer Termine verschwinden**.
- Der **Editor** rettet Events solcher Wochen noch
  ([WeekTable.tsx:285](../../../src/components/editor/WeekTable.tsx)), der **Druck** wirft
  sie weg ([print-window.ts:173](../../../src/lib/print-window.ts), `colspan=8`-Banner).
- Mischwochen verlieren ihre SW-Nummer.

### Lösung

**1. Schwelle ändern.** In `computeWeekRows`: Banner nur noch bei **5/5** Ferientagen
(Mo–Fr alle Ferien). Sonst Schulwoche (behält SW-Nummer). Ferientage werden tageweise
grau markiert — der Schulwochen-Zweig im Editor greift dafür bereits per-Tag auf
`isHoliday` zu.

**2. Druck-Parität.** `print-model.ts` gibt pro Tageszelle ein `ferien`-Flag aus.
`renderWeekRow` in `print-window.ts` schraffiert/grau einzelne Ferientage (gleiche
Optik wie das volle Banner, nur zellenweise). Volles Banner nur noch für 5/5-Wochen →
keine Event-Verluste mehr im PDF.

**3. Konflikte** bleiben unverändert: ein Termin auf einem echten Ferientag erzeugt
weiterhin die `ferien`-Warnung ([conflicts.ts:45](../../../src/lib/conflicts.ts)).

### Tests
`schoolweeks.test.ts`: 5/5 → Banner; 4/5, 3/5, 2/5 → Schulwoche mit fortlaufender
SW-Nummer. `print-model.test.ts`: Mischwoche liefert `week`-Row mit `ferien`-Flags auf
den richtigen Zellen, kein Event-Verlust.

---

## P4 — Settings: seitliche, gruppierte Navigation

### Problem
[SettingsModal.tsx](../../../src/components/settings/SettingsModal.tsx) zeigt 10 Tabs in
einer flachen, umbrechenden `TabsList` — keine Hierarchie, schwer auffindbar.

### Lösung
Umbau auf Sidebar-Layout (vertikale Navigation links, Inhalt rechts) mit Gruppen:
- **Schuljahr:** Schuljahr · Quartale
- **Inhalte:** Kategorien · Gruppen · Vorlagen
- **Darstellung:** Ansicht · Schule & Druck
- **Daten:** Export · Import · WordPress
- **System:** Über

Die Tab-Inhaltskomponenten (`SchoolyearTab`, `CategoriesTab`, …) bleiben weitgehend
unverändert; nur die Hülle (Navigation + Layout) wird neu. Mobil: Sidebar klappt nach
oben (oder horizontal scrollbar). `settingsTab`-Werte in
[ui.ts](../../../src/stores/ui.ts) bleiben kompatibel (gleiche String-Keys).
Umsetzung mit der `frontend-design`-Skill für hochwertige UI. Brand-Tokens aus
`globals.css` nutzen (kein Hardcoding von Hex-Werten — siehe CLAUDE.md).

### Tests
Bestehende Settings-Tests bleiben grün (`WordpressTab.test.tsx`, `CategoriesTab.test.tsx`,
`AboutTab.test.tsx`). Ggf. ein leichter Smoke-Test, dass jede Nav-Gruppe ihren Inhalt
rendert.

---

## Reihenfolge & Isolation

1. **P3** (Druck-CSS) — kleinster, isolierter Eingriff, sofort sichtbarer Gewinn.
2. **P1** (Quartale) — Settings-UI + `schoolweeks.ts`-Helfer + Druck-Zuordnung.
3. **P2** (Ferien) — `schoolweeks.ts`-Schwelle + Druck-Parität (baut auf P1-Druckpfad auf).
4. **P4** (Settings-UI) — enthält das P1-Quartale-Feld; zuletzt, weil es das größte
   UI-Redesign ist und von der finalen Form des Quartale-Abschnitts profitiert.

## Nicht im Umfang (YAGNI)
- Keine Änderung am WordPress-Plugin (`curriculr-terminplan/`).
- Keine Schema-Änderung: `quarterBoundaries` bleibt Länge 3.
- Keine Änderung an der Konfliktlogik außer der durch P2 geänderten Wochen-Einteilung.
