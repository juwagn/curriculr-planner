# Curricu:lr – Grundsätze

Diese Regeln gelten für jedes Repository der Curricu:lr-Familie. Sie kommen aus
`curriculr/curriculr-design` und werden per Workflow synchronisiert. Ändere sie
nicht im Produkt-Repo. Projektspezifisches steht in `CLAUDE.md` und `PRODUCT.md`.

## Verbindlichkeit
- **MUSS** = ohne Ausnahme. **SOLL** = Standard, Abweichung nur mit Begründung in `PRODUCT.md`. **KANN** = Empfehlung.
- Widerspricht eine Projektregel diesen Familien-Regeln, frage nach, bevor du handelst. Rate nicht.

## Marke
- Schreibweise im Text: **Curricu:lr** (mit Doppelpunkt). In Code, Dateinamen, Repo-Namen, URLs: `curriculr`.
- Produktname: „Curricu:lr <deutsches Substantiv>“ (Curricu:lr Terminplan). Repo: `curriculr-<produkt>`.
- Jede Oberfläche zeigt im Fuß oder Info-Dialog: „Teil der Curricu:lr-Familie · Version X.Y.Z · Datenschutz · Hilfe“.

## Sprache
- Oberfläche, Anleitungen, Changelog, README, Commit-Beschreibungen in Pull Requests: **Deutsch**.
- Bezeichner, Code-Kommentare: Englisch.
- Anrede in Oberfläche und Anleitungen: „Sie“. Bedien-Aufforderungen ohne Anrede („Datei auswählen“).
- Ton: sachlich, souverän, verbindlich. Keine Werbewörter (smart, intuitiv, mächtig), keine Ausrufezeichen, keine Emojis in der Oberfläche.
- Geschlechtergerecht mit Paarform oder neutral („Lehrkräfte“). Keine Genderzeichen in der Oberfläche.
- Schulsprache: Schulwoche, Quartal, Halbjahr, Kollegium, Schulleitung, Klausur.

## Arbeitsweise
- Erst planen, dann bauen. Pläne in `docs/plans/JJJJ-MM-TT-<thema>.md`.
- Melde eine Aufgabe erst als fertig, wenn Tests, Linter und Typprüfung grün sind und du bei Oberflächenänderungen das Ergebnis angesehen hast.
- Ändere nur, was die Aufgabe verlangt. Keine Nebenbei-Umbauten.
- Jede Aufgabe in einem eigenen Zweig (`feat/…`, `fix/…`, `docs/…`). Nach `main` nur über Pull Request.
- Bei Login, Rechten, Datenhaltung oder Exporten: Weise im Pull Request ausdrücklich auf das Sicherheitsrisiko hin und schlage eine unabhängige Prüfung vor.
- Lege keine lokalen Pfade (Laufwerksbuchstaben, Nachbarordner) in Dateien ab, die ins Repository gehen. Lokales gehört in `CLAUDE.local.md`.
