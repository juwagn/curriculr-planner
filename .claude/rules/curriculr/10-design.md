# Curricu:lr – Design

Quelle der Werte: `design/curriculr-tokens.css` (im Produkt-Repo per Workflow kopiert).

## Farben
- **MUSS:** Nie Hex-, RGB- oder benannte Farben im Produktcode. Immer `var(--cl-*)`. In Tailwind: `bg-[var(--cl-marine-800)]` oder über `@theme` gemappte Namen.
- Primär: `--cl-marine-800`. Hover: `--cl-marine-700`. Fokus: `--cl-marine-500`. Auswahl: `--cl-marine-100`.
- Gold (`--cl-gold-500`) nur für den Doppelpunkt im Logo und Highlight-Marker. Nie als Textfarbe, nie großflächig, nie als Statusfarbe.
- Status: `--cl-success`, `--cl-warning`, `--cl-danger` mit den `-bg`-Flächen.
- Produktspezifische Farben (Terminkategorien, Modusfarben) heißen `--cl-product-*`, stehen im Produkt und müssen das Kontrastskript bestehen.
- **MUSS:** Information nie nur über Farbe. Kategorie = Farbe + Text. Fehler = Farbe + Symbol + Text.
- **MUSS:** Dunkelmodus über `prefers-color-scheme`; manueller Schalter setzt `data-theme="light|dark"` am `<html>`.

## Farbe auf Daten und Aktion, nicht auf Rahmen
- Kopfzeile, Seitenleiste, Tabellenkopf und Reiter stehen auf `--cl-surface` oder `--cl-bg`, getrennt durch `--cl-line`. Keine Marine-Flächen für Rahmen-Elemente.
- Marine trägt: die eine Hauptaktion pro Ansicht, ausgewählte Elemente, die Hauptdaten (z. B. heutige Woche) und das Logo.
- Aktiver Reiter: Unterstrich in Marine. Aktiver Navigationspunkt: neutrale graue Fläche (`--cl-marine-100` nur, wenn es eine Auswahl in Daten ist).
- `--cl-gold-100` nur für Hinweisboxen mit Rahmen in `--cl-gold-500`, nie als Spalten-, Karten- oder Seitenfläche.
- Kein Violett und kein Indigo, auch nicht als Kategoriefarbe.
- Weiß auf Gold ist verboten (1,5 : 1). Auf Gold steht `--cl-on-gold`.

## Signatur
- Der goldene Doppelpunkt (Logo) und die **Schulwochen-Spalte** (SW 00, 01 …) sind die Erkennungszeichen. Planungsprodukte zeigen Zeit immer mit Schulwochen.

## Schrift
- Inter, lokal als woff2 aus `design/fonts/`. **Nie** Google Fonts oder andere CDNs.
- Arbeitsoberflächen: Titel 24/32/700 · Überschrift 18/26/600 · Text 15/24 · Kompakt 14/20 · Label 13/18/500 · Klein 12/16. Nichts unter 12 px.
- Seiten (Website, Doku-Seite, Anleitungen): Titel 40–56/1.05/700 mit −0.02em · Überschrift 28–32/1.2/600 · Text 17/28 · Klein 14/20. Höchstens fünf Größen pro Seite, Zeilenlänge 45–75 Zeichen.
- Satzschreibung überall. **Keine gesperrten Großbuchstaben** (auch nicht in Tabellenköpfen und Gruppenüberschriften).
- Ausnahme: Produkte in fremden Oberflächen (Thunderbird) nutzen die Systemschrift.

## Raum und Form
- Abstände nur aus `--cl-space-*` (4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 px).
- Radien: 6 (Feld, Badge) · 8 (Button, Karte) · 12 (Dialog) · 999 (Chip).
- Flach: Schatten nur `--cl-shadow-float` für Dialog und Popover. Keine Verläufe.
- Klickflächen ≥ 36 px Desktop, ≥ 44 px Touch.

## Dichte
- Das Produkt nennt in `PRODUCT.md` seine Stufe: **Planungsansicht** (Text 15 px, Tabellenzeile 44 px) oder **Arbeitsansicht** (14 px, 36 px). Keine Mischform auf einer Seite.

## Logo
- Bildmarke und Favicon: nur `design/logo/curriculr-icon.svg`.
- Wortmarke: `curriculr-logo-auf-hell.svg` (dunkle Schrift) oder `curriculr-logo-auf-dunkel.svg` (weiße Schrift). Nie nachbauen, nie als HTML-Text mit Doppelpunkt nachstellen.
- `<title>` und Manifest: „Curricu:lr <Produkt>“ (z. B. „Curricu:lr Planer“).

## Symbole
- Lucide, Strich 1,75, Größen 16/20/24. Symbol ohne Text braucht `aria-label` und Tooltip.
- Keine Emojis, auch nicht als Symbolersatz (📝, ⚠, 📄). Stattdessen Lucide (`sticky-note`, `triangle-alert`, `file-text`).

## Responsivität für Arbeitsoberflächen
- Tabellen und Raster mit mehr als fünf Spalten zeigen unter 1024 px eine Listen- oder Agenda-Ansicht. Text darf nie Buchstabe für Buchstabe umbrechen.
- Platzhalter wie „+ Termin“ erscheinen nur bei Hover oder Fokus, nicht in jeder leeren Zelle.

## Prüfung mit taste-skill
- Oberflächen: `node <skill>/scripts/inspect.mjs --app <url>` und `lint.mjs --app src/`. Seiten: ohne `--app`, mit `draw.mjs --keep palette,type`.
- Erlaubte Ausnahmen mit Kommentar `taste-skill-ignore`: Ferien-Schraffur (Datenmarkierung), 1-px-Linien in echten Tabellen.

## Bausteine
- React: shadcn/ui-Komponenten in `src/components/ui/`, ohne Fachlogik, mit `--cl-*`-Tokens.
- PHP/Vanilla: Klassen aus `design/curriculr-ui.css` (`cl-button`, `cl-input`, `cl-card`, `cl-chip`, `cl-tabs`, `cl-dialog`, `cl-toast`, `cl-header`, `cl-footer`, `cl-empty`).
- Buttons: primär (eine pro Ansicht), sekundär, leise, gefährlich. Beschriftung Verb + Objekt, nie „OK“.
- Felder: sichtbares Label oben, Hinweis und Fehler darunter, `aria-invalid` bei Fehlern.
- Reiter: Unterstrich als Markierung.
- Destruktive Aktionen: Bestätigungsdialog, möglichst Rückgängig.
- Kopfzeile: Logo links, Produktname, Speicherstatus, Hilfe rechts.
- Leerer Zustand: ein Satz, was fehlt, plus eine Aktion.

## Barrierefreiheit (WCAG 2.1 AA, MUSS)
- Kontrast Text ≥ 4,5:1, Bedienelemente und große Schrift ≥ 3:1. Neue Farben mit `node design/check-contrast.mjs` prüfen.
- Alles per Tastatur, sichtbarer Fokus (`--cl-focus-ring`), Esc schließt Dialoge, Fokus kehrt zurück.
- `lang="de"`, Überschriften ohne Sprünge, Statusmeldungen mit `role="status"`/`role="alert"`.
- `prefers-reduced-motion` und `forced-colors` respektieren.
- Drag-and-drop immer mit Tastatur- oder Dialog-Alternative.

## Druck (MUSS für alles, was gedruckt oder als PDF gespeichert wird)
- `design/curriculr-print.css` einbinden. Klassen `cl-no-print`, `cl-print-only`, `cl-keep`, `cl-page-break`, `cl-landscape`.
- Nichts zerschneiden: `break-inside: avoid` **und** `page-break-inside: avoid` (Safari).
- Tabellenkopf wiederholen, Farben mit `print-color-adjust: exact` mitdrucken.
- Druckfuß: „Stand: TT.MM.JJJJ · <Produkt> X.Y.Z“.
- UTF-8 überall; Umlaute müssen korrekt erscheinen.
- Prüfen in Chrome/Edge, Firefox und Safari.
