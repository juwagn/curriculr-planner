# Design: Kategorien-Verwaltung & Farb-System

**Datum:** 2026-06-01
**Status:** Approved
**Scope:** Schulleitungs-Feedback — Kategorien anlegen/löschen, modernerer Farb-Picker, bessere Auffindbarkeit. (Gruppen-Farben ausdrücklich raus.)

## Problem

Der `CategoriesTab` kann heute nur bestehende Kategorien editieren (Label, Farbe, Stichwörter) — **kein Anlegen, kein Löschen**. Der Farb-Picker ist ein rohes `<input type="color">`. Die Verwaltung steckt im Einstellungen-Modal und wird von Anwendern schwer gefunden.

## Lösung

### 1. Kategorien anlegen + löschen (`CategoriesTab`)

- **"+ Neue Kategorie"**-Button: neue Zeile mit `id: crypto.randomUUID()`, leerem Label, erster freier Palette-Farbe, leeren Keywords.
- **Löschen (✕)** pro Zeile.
- **Slug** wird beim Speichern aus dem Label abgeleitet (`slugify`), wenn leer. Bestehende Slugs bleiben unverändert (ICS-/Excel-Export hängt am Slug).
- Persistenz unverändert über `updateCategories(array)` — kein neuer Mutator dafür nötig.
- Mindestens **eine** Kategorie muss erhalten bleiben (Löschen der letzten blockiert).

### 2. Löschen mit Umhängen ("Warnen + umhängen")

`events` und `templates` referenzieren `categoryId`. Beim Löschen:

- **0 Verwendungen** → Zeile direkt aus lokaler Liste entfernen.
- **>0 Verwendungen** → Bestätigungs-Dialog: *"Diese Kategorie wird in N Terminen und M Vorlagen verwendet. Termine umhängen auf:"* + Dropdown der übrigen Kategorien. Bestätigen → Reassign + Löschen.

Neuer Store-Mutator `reassignCategory(fromId, toId)`: setzt `categoryId` in allen `events` + `templates` um, läuft durch `debouncedSave`. Settings-Level-Mutator → **kein** History-Snapshot (analog `updateCategories`).

### 3. Farb-Picker — Presets + Custom (`ColorPicker`, neue ui-Primitive)

`src/components/ui/color-picker.tsx` — dumme, wiederverwendbare Komponente: `value`, `onChange`, optionale `palette`.

- Reihe klickbarer Swatches aus fester Palette; aktiver Swatch trägt einen Ring.
- Daneben kleiner nativer `type="color"`-Trigger für Custom-Farben.
- Ersetzt das rohe `<input type=color>` im `CategoriesTab`.

**Wichtig — `pastelize()`-Interaktion:** Termin-Blöcke speichern die *gesättigte Basis-Farbe* und rendern sie über `pastelize()` (12% Farbe + 88% Weiß) als Block-Hintergrund; die rohe Farbe ist der 3px-Links-Akzent. Palette-Presets sind deshalb **gesättigte Mitteltöne**, nicht schon-pastellige Werte — sonst verliert der Akzent Kontrast und Blöcke werden fast weiß.

**Palette** (Basis-Farben, ~Tailwind-400/500-Sättigung, an Marine/Gelb-Markensprache angelehnt, gedämpft + modern):

| # | Hex | Ton |
|---|------|-----|
| 1 | `#0058A0` | Marine (Brand) |
| 2 | `#3E8EA8` | Sky/Petrol |
| 3 | `#2F9E8F` | Teal |
| 4 | `#4FA373` | Salbeigrün |
| 5 | `#D9A23B` | Bernstein/Gelb (Brand-nah) |
| 6 | `#D98B5F` | Terrakotta/Apricot |
| 7 | `#D46A6A` | Dusty Coral |
| 8 | `#B66A9E` | Mauve/Beere |
| 9 | `#7C72C4` | Gedämpftes Violett |
| 10 | `#647488` | Schiefer-Grau |

Palette als exportierte Konstante (`CATEGORY_PALETTE`) neben den Farb-Helpern (`src/lib/colors.ts`), damit Picker und Default-Kategorien dieselbe Quelle nutzen.

### 4. Auffindbarkeit

- `openSettings(tab?)` erweitern + `SettingsModal` von `defaultValue` auf **controlled `value`** umstellen (deep-link zu einem Tab).
- `EventModal`: dezenter Link *"⚙ Kategorien verwalten"* unter dem Kategorie-Select → `openSettings('categories')` (schließt vorher den Event-Modal nicht zwingend; Settings-Modal legt sich darüber bzw. ersetzt — siehe Implementierung).

### 5. Default-Palette-Migration

Die 7 `DEFAULT_CATEGORIES` in `stores/planner.ts` auf die neue gedämpfte Palette umstellen. Betrifft nur **neu** erstellte Dokumente; Bestands-Docs bleiben unverändert (Farbe ist Nutzerdaten, keine Schema-Änderung). `version` bleibt **4**, keine Migration.

## Nicht im Scope

- Gruppen-Farben (Gruppen bleiben `string[]`).
- History/Undo für Kategorie-Änderungen (konsistent mit heutigem Settings-Verhalten).

## Tests (TDD)

- `slugify` (`src/lib/slugify.test.ts`): Umlaute, Sonderzeichen, Leerzeichen, leerer Input.
- `reassignCategory` (`stores/planner.test.ts`): events + templates umgehängt, andere Felder unberührt.
- `CategoriesTab` (co-located): Zeile hinzufügen, ungenutzte löschen, genutzte → Reassign-Dialog.
- `ColorPicker` (co-located): Preset-Klick ruft onChange, Custom-Picker ruft onChange, aktiver Swatch markiert.

## Betroffene Dateien

- `src/lib/slugify.ts` (+ test) — neu
- `src/lib/colors.ts` — `CATEGORY_PALETTE` Konstante
- `src/components/ui/color-picker.tsx` (+ test) — neu
- `src/components/settings/CategoriesTab.tsx` — Add/Delete/Reassign/ColorPicker
- `src/stores/planner.ts` — `reassignCategory`, Default-Palette
- `src/stores/ui.ts` — `openSettings(tab?)` + `settingsTab`
- `src/components/settings/SettingsModal.tsx` — controlled tab
- `src/components/event-modal/EventModal.tsx` — "Kategorien verwalten"-Link
