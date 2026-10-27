# Curricu:lr – Versionen und Veröffentlichung

## Semantic Versioning (MAJOR.MINOR.PATCH)
- PATCH: Fehler behoben. MINOR: neue Funktion, Bestehendes läuft weiter. MAJOR: Datenformat, REST-Route, Shortcode oder Einstellung bricht.
- Die Version hat **eine** Quelle (`package.json`, Plugin-Kopf oder `manifest.json`). Andere Stellen setzt `scripts/bump-version`. Nie von Hand an mehreren Stellen ändern.
- Datenformate haben eine eigene Schema-Version mit Migration.
- Unter 1.0.0 = Erprobung. Ab 1.0.0 für andere Schulen empfohlen.

## Changelog
- `CHANGELOG.md`, Keep a Changelog, Deutsch, neueste Version oben.
- Rubriken (nur benötigte): **Neu**, **Geändert**, **Behoben**, **Entfernt**, **Sicherheit**.
- Neue Einträge immer unter `## [Unreleased]`.
- Aus Sicht der Nutzenden schreiben: „Klausuren lassen sich als PDF drucken“, nicht „PrintDialog refactored“.

## Release-Ablauf
1. CI grün auf `main`, Release-Checkliste (`docs/entwicklung/release-checkliste.md`) abgehakt.
2. `[Unreleased]` → `## [X.Y.Z] – JJJJ-MM-TT`.
3. `scripts/bump-version X.Y.Z`.
4. Commit `chore: release vX.Y.Z`, Tag `vX.Y.Z`, pushen.
5. `release.yml` baut das Paket und erstellt das GitHub Release mit dem Changelog-Abschnitt.
- MAJOR-Releases: Abschnitt „Was Sie beim Update tun müssen“.
- Vorabversionen: `X.Y.Z-beta.N`, als Pre-release markiert.
- Den Tag pushen oder ein Release veröffentlichen tust du **nur auf ausdrückliche Anweisung**.

## README (Reihenfolge, Deutsch)
Titel „Curricu:lr <Produkt>“ · Ein Satz Zweck · Badges · Screenshot · Funktionen · Für wen? · Installation · Datenschutz (Datenklasse) · Hilfe · Entwicklung · Lizenz (mit Ausnahme der Wortmarke) · „Teil der Curricu:lr-Familie“.

## Lizenz
- Eigenständige Tools: MPL-2.0. WordPress-Plugins: GPL-2.0-or-later. Doku/Bilder: CC BY 4.0.
- Immer `LICENSE`-Datei. README nennt: „Die Wortmarke Curricu:lr und das Logo sind von der Lizenz ausgenommen.“
- Fremde Dateien (Schriften, Icons) mit ihrer Lizenz in `THIRD_PARTY.md` aufführen.
