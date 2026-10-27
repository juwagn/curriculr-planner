# Curricu:lr – Projektstruktur und Code

## Pflichtdateien
`README.md`, `LICENSE`, `CHANGELOG.md`, `SECURITY.md`, `DATENSCHUTZ.md`, `CLAUDE.md`, `PRODUCT.md`,
`.editorconfig`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `.github/dependabot.yml`,
`docs/anleitung/`, `docs/entwicklung/release-checkliste.md`.
Fehlt eine davon, lege sie aus `curriculr-template` an.

## Nicht ins Repository
- Build-Ergebnisse: `dist/`, `*.zip`, `*.xpi`, erzeugte `*.xlsx`/`*.pdf`. Sie gehören in GitHub Releases.
- Zugangsdaten, `.env`, `CLAUDE.local.md`, echte Schul- oder Personendaten (auch nicht in Tests).

## Namen
| Was | Regel |
|---|---|
| Dateien JS/TS/CSS | kebab-case (`school-weeks.ts`) |
| React-Komponenten | PascalCase (`EventModal.tsx`) |
| Variablen/Funktionen | camelCase, Englisch |
| PHP-Funktionen | `curriculr_<kürzel>_<aktion>()` |
| PHP-Konstanten | `CURRICULR_<KÜRZEL>_<NAME>` |
| CSS-Variablen | `--cl-*`, produktspezifisch `--cl-product-*` |
| CSS-Klassen | `cl-<baustein>`, Varianten `cl-<baustein>--<variante>` |
| localStorage | `curriculr-<produkt>:<name>` |
| REST | Namensraum `curriculr/v1` |
| Zweige | `feat/…`, `fix/…`, `docs/…`, `chore/…` |
Keine schulspezifischen Präfixe (z. B. `gsh_`) in neuem Code.

## Code-Standards
- TypeScript `strict`, kein `any`. Importe über `@/`-Alias.
- ESLint + Prettier (JS/TS), PHP_CodeSniffer mit WordPress Coding Standards (PHP), ShellCheck/PSScriptAnalyzer (Skripte). `--max-warnings 0`.
- Externe Daten (Import, API, Formular) an **einer** Stelle validieren (Zod o. Ä.). Danach gelten sie als sicher.
- Fachlogik als reine Funktionen in `src/lib/` bzw. eigener PHP-Datei, getrennt von der Oberfläche.
- Dateien über 500 Zeilen teilen.
- Neue Abhängigkeit nur, wenn: gepflegt (Release < 12 Monate), klare Lizenz (MIT/ISC/Apache/BSD/MPL/OFL), Aufgabe nicht mit ~30 Zeilen eigenem Code lösbar. Begründe sie im Pull Request.

## Tests
- Fachlogik: jede Funktion getestet (Vitest / PHPUnit / vorhandenes PHP-Testskript). MUSS.
- Oberfläche: Hauptabläufe mit Testing Library. SOLL. Barrierefreiheit mit axe in Tests. SOLL.
- Behobener Fehler → Test, der ihn findet.
- Tests nutzen Demo-Daten (`design/demo/`), nie echte.

## Commits
- Conventional Commits: `feat: …`, `fix: …`, `docs: …`, `chore: …`, `refactor: …`, `test: …`. Beschreibung Deutsch, kurz.
- Breaking Change: `feat!: …` und Abschnitt `BREAKING CHANGE:` im Text.
