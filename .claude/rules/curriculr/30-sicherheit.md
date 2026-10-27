# Curricu:lr – Sicherheit und Datenschutz

Grundsatz: Curricu:lr betreibt keine Server. Tools laufen im Browser, beim Nutzer oder auf der
Infrastruktur der Schule. Verantwortlich für den Datenschutz ist die jeweilige Schule.

## Datenklassen (in PRODUCT.md und DATENSCHUTZ.md angeben)
| Klasse | Inhalt | Regel |
|---|---|---|
| 0 | keine personenbezogenen Daten | frei, auch GitHub Pages |
| 1 | Namen/Kürzel von Lehrkräften, Gruppen, Termine | nur Browser oder Schul-Infrastruktur, Login über IServ |
| 2 | Schülerdaten (Namen, Kurse, Noten) | **nur nach ausdrücklicher Freigabe durch den Menschen**; nur Schul-Infrastruktur, nicht im Browser-Speicher |
| 3 | Gesundheit, Beratung, Förderbedarf | **ausgeschlossen** – baue nichts dafür |
Wenn eine Aufgabe die Datenklasse eines Produkts erhöhen würde: **Stopp, nachfragen.**

## Datensparsamkeit
- Nur erheben, was die Aufgabe braucht. Kurse statt Schülernamen, Kürzel statt Vollnamen, wo möglich.
- Kein Tracking, keine Analyse-Dienste, keine externen Schriften/CDNs zur Laufzeit.
- Jede Verbindung nach außen: in `DATENSCHUTZ.md` (Zweck, übertragene Daten) und in der CSP freigeben.
- Keine personenbezogenen Daten in Logs, Fehlermeldungen, URLs oder Dateinamen.

## Zugangsdaten
- Nie Secrets im Code oder in Git. WordPress: `wp-config.php`. Sonst Umgebungsvariablen. Im Repo nur `.env.example`.
- Tokens nur im Arbeitsspeicher oder `sessionStorage`, nie `localStorage`.
- Hast du ein Secret im Code gefunden: melde es sofort; es muss beim Anbieter ungültig gemacht werden.

## Abhängigkeiten
- Lockfile committen. GitHub Actions mit fester Version (`@v4`).
- CI: `npm audit --audit-level=high` bzw. `composer audit` muss bestehen.
- Dependabot-Sicherheitswarnungen haben Vorrang vor neuen Funktionen.

## Web
- Content Security Policy ohne `unsafe-inline` für Skripte.
- Ausgaben escapen, Eingaben validieren, nichts aus Nutzereingaben als HTML einsetzen.
- Fehler schließen sicher: fehlt eine Einstellung oder ein Token, wird der Zugriff verweigert.

## WordPress
- Nonce bei jedem Formular und jeder AJAX-Aktion, `current_user_can()` vor jeder Aktion.
- Ausgabe mit `esc_html()`, `esc_attr()`, `esc_url()`, `wp_kses_post()`.
- Datenbank nur über `$wpdb->prepare()`. Schemaänderungen nur additiv über `dbDelta()`.
- Token-Vergleiche mit `hash_equals()`, Rate-Limiting bei Token-URLs.

## Transparenz
- `SECURITY.md`: Meldeweg über GitHub „Report a vulnerability“, Rückmeldung innerhalb einer Woche.
- `DATENSCHUTZ.md`: Datenklasse, welche Daten, wo, wie lange, Verbindungen nach außen, wie man alles löscht.
- Info-Dialog des Produkts: Abschnitt „Datenschutz und Entwicklung mit KI“ – nicht entfernen.
