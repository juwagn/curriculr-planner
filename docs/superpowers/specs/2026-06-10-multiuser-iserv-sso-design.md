# Design: Mehrbenutzer-Zusammenarbeit am Jahresterminplaner via IServ-SSO

**Datum:** 2026-06-10
**Status:** Entwurf, vom Auftraggeber freigegeben (Brainstorming)
**Betrifft Repos:** `curriculr-planner` (React-SPA), `curriculr-terminplan` (WordPress-Plugin)

---

## 1. Ziel & Hintergrund

**Feedback aus der Schule:** Mehrere Mitglieder der Schulleitung sollen denselben
Jahresterminplaner gemeinsam über das Planner-Tool bearbeiten können. Gewünscht ist
außerdem eine Synchronisation / „Cloud-Funktion".

**Ist-Zustand:** Der Planner speichert Dokumente in `localStorage` — pro Browser
isoliert, kein Teilen möglich. Das WP-Plugin (v4.9.0) besitzt bereits ein Backend
(`wp_curriculr_docs`, REST `curriculr/v1`, Revisions-Tabelle, optimistische
Versionierung mit 409-Konflikten), wird aber nur für einen **Einweg-Push**
(Planner = Quelle → WP-Spiegel) genutzt.

**Lücke für Mehrbenutzer:**
1. Laden/Pull aus WP fehlt (heute ist `localStorage` die Quelle).
2. Authentifizierung/Identität pro Person fehlt (heute ein App-Passwort).
3. Konflikt-UX ohne Personen-Zuordnung.

**Gewählter Ansatz:** WP wird zur **geteilten Quelle**. Anmeldung per **IServ-SSO**,
beschränkt auf bestimmte IServ-Gruppen. Kollaborationsmodell: **geteiltes Dokument,
nacheinander** (sequenzielles Bearbeiten mit Konflikterkennung — kein Live-Editing).

**Priorität des Auftraggebers:** Datenschutz (DSGVO) und IT-Sicherheit.

---

## 2. Rahmenbedingungen (Bestand)

| Komponente | Stand |
|------------|-------|
| Planner-SPA | React/TS, gehostet auf **GitHub Pages** (`https://<user>.github.io/curriculr-planner/`) |
| WP-Backend | Hoster **w3w.de**, Paket „Server Basic Plus" (DE/EU), Plugin v4.9.0 |
| IServ | Voller Admin-Zugang vorhanden; dient als **OIDC-Provider** |
| IServ-OIDC | **Confidential** (Client-ID + Secret), kein dokumentiertes PKCE/Public-Client; eingebaute Gruppen-/Rollen-Beschränkung pro Client; Scopes u.a. `openid`, `profile`, `iserv:groups` |

IServ-Endpunkte (aus `.well-known/openid-configuration`):
- authorize: `https://<iserv>/iserv/auth/auth`
- token: `https://<iserv>/iserv/auth/public/token`
- userinfo: `https://<iserv>/iserv/auth/userinfo`
- jwks: `https://<iserv>/iserv/auth/public/jwk`

**Spätere Option (nicht Teil dieser Spec):** Umzug der SPA auf einen Eigen-Server →
ermöglicht das stärkere BFF-Pattern (httpOnly-Cookie, kein Token im Browser). Das
Design hier ist so geschnitten, dass dieser Umzug später möglich bleibt.

---

## 3. Architektur

Da IServ **confidential** ist, darf das Client-Secret **nie in den Browser**. Den
`code → token`-Tausch übernimmt deshalb das **WP-Plugin** (Secret serverseitig in
`wp-config.php`). Die SPA bleibt auf GitHub Pages. Muster: **Auth über WP, API über
Bearer-App-Token**.

```
Browser (SPA @ <user>.github.io/curriculr-planner/)
   │  App-Token (von WP ausgestellt) NUR im RAM — kein localStorage
   ▼  Authorization: Bearer <app-token>
WP-Host @ w3w.de  (Plugin curriculr-terminplan)
   ├─ Auth-Endpunkte:  /auth/login  /auth/callback  /auth/logout
   │     hält IServ-Client-Secret serverseitig, tauscht code→Token
   │     stellt eigenes kurzlebiges, signiertes App-Token aus
   ├─ REST-Guard:  validiert App-Token + Gruppen-Whitelist  → sonst 403
   ├─ DB: wp_curriculr_docs            = GETEILTE QUELLE (existiert)
   └─ DB: wp_curriculr_doc_revisions   + User-Attribution (existiert/erweitern)
         │
         └──ICS-Feed──> IServ-Gerätekalender (bleibt unverändert)

WP  ──OIDC (confidential, server-side)──>  IServ (OIDC-Provider, Gruppenfilter)
```

**Verantwortlichkeiten (klare Grenzen):**
- **SPA:** UI, Redirect zum Login, App-Token im RAM halten, REST-Aufrufe mit Bearer.
  Kennt **kein** IServ-Secret, **keine** IServ-Tokens.
- **WP-Auth-Modul:** OIDC-Tanz mit IServ, Gruppenprüfung, App-Token-Ausstellung/-Validierung.
- **WP-Doc-API:** unverändertes Lesen/Schreiben mit `knownVersion`/409, nun hinter Auth-Guard.
- **IServ:** Identität + Gruppenmitgliedschaft (Wahrheit über „wer darf").

---

## 4. Authentifizierungs-Flow

```
1. SPA  ──redirect──>  WP /auth/login
2. WP   ──redirect──>  IServ /auth/auth
        (client_id, redirect_uri=WP /auth/callback, scope=openid profile iserv:groups,
         state, nonce)
3. Nutzer meldet sich bei IServ an.
   IServ prüft Client-Gruppenrechte → Nicht-Mitglieder werden abgewiesen
                                       [Gruppenfilter #1, am IdP]
4. IServ ──redirect mit code──>  WP /auth/callback
5. WP prüft state; tauscht code→IServ-Tokens MIT SECRET (serverseitig);
   liest iserv:groups → prüft Whitelist  [Gruppenfilter #2, defense in depth];
   prüft id_token.nonce.
6. WP stellt eigenes App-Token aus (kurzlebig, signiert) und leitet zur SPA zurück;
   Token-Übergabe NICHT in der URL (siehe §5).
7. SPA hält App-Token im RAM; ruft REST mit  Authorization: Bearer <app-token>.
8. WP REST-Guard validiert App-Token + Gruppen → liest/schreibt Doc.
```

Hinweis: Ohne PKCE ist der Auth-Code geschützt durch (a) das nur serverseitig
bekannte Client-Secret und (b) eine exakt registrierte `redirect_uri`. Ein
abgefangener Code ist ohne Secret wertlos.

---

## 5. Token-Handling (gehärtet)

- **App-Token = von WP signiertes JWT**, kurzlebig (z.B. 15–30 Min). Claims minimal:
  `sub` (IServ-UUID), Anzeigename, erlaubte Gruppen, `exp`, `iat`, `iss`, `aud`.
- **Speicherort im Browser: nur RAM** (Zustand-Store), niemals `localStorage`/
  `sessionStorage`/Cookie → XSS kann nichts Persistentes stehlen.
- **Übergabe an SPA ohne URL-Token:** WP setzt ein **einmaliges, sehr kurzlebiges
  Austausch-Geheimnis** (z.B. `code`-Fragment), das die SPA per `POST` gegen das
  App-Token eintauscht — so landet das App-Token nicht im Browserverlauf/Referer.
  (Alternative bei Bedarf: `fragment`-Übergabe, sofort aus der URL entfernt.)
- **Erneuerung per Full-Page-Redirect** zu `/auth/login`: bestehende IServ-Session →
  meist ohne erneute Eingabe. **Kein** Silent-iframe-Renew (Third-Party-Cookies
  cross-site `github.io`↔IServ werden geblockt).
- **Kein IServ-Refresh-Token im Browser.** IServ-Tokens bleiben serverseitig
  (kurzlebig genutzt, nicht dauerhaft gespeichert, siehe Datenminimierung).
- **Logout:** App-Token aus RAM verwerfen, WP-Session beenden, optional IServ
  `end_session`.

---

## 6. Geteilte Quelle & Synchronisation

- **WP = Quelle der Wahrheit.** `localStorage` wird zum reinen Offline-Cache/Entwurf
  herabgestuft.
- **Öffnen:** `GET` Doc aus WP inkl. `knownVersion`.
- **Speichern:** `PUT` mit `knownVersion`. Fremdänderung → `409` (Logik **existiert**),
  Re-Check direkt vor dem Speichern.
- **Auffrischen:** beim Öffnen, per „Aktualisieren"-Button und vor dem Speichern.
- Bestehende Stage-/Feed-Mechanik (öffentlich schalten, ICS) bleibt unangetastet.

---

## 7. Konflikt & Personen-Zuordnung

- Vorhandenen 409-Konflikt-Dialog erweitern: zeigt **WER** (IServ-Identität aus
  Revision) und **WANN** geändert hat, plus Feld-Diff. Optionen: meins behalten /
  deren übernehmen / zusammenführen.
- `wp_curriculr_doc_revisions` bekommt **User-Attribution** (`sub` + Anzeigename).
- *Optional, später (M6):* leichte Präsenzanzeige („X hat vor 2 Min gespeichert") via
  ETag/Heartbeat-Polling — **kein** WebSocket nötig.

---

## 8. Datensicherheit & Cybersecurity (TOMs)

**Transport & Origin**
- TLS-only + HSTS auf WP.
- **CORS streng:** WP erlaubt exakt `https://<user>.github.io` (kein `*`), nur nötige
  Methoden/Header, **keine** `credentials` (Bearer statt Cookie).

**XSS (Hauptbedrohung, weil App-Token im RAM)**
- Strenge **CSP** auf der SPA: `default-src 'self'`; `connect-src` nur WP + IServ;
  kein `unsafe-inline`/`unsafe-eval`.
- Kein `dangerouslySetInnerHTML`, keine ungeprüfte HTML-Injektion.
- Dependency-Hygiene: `npm audit` + Dependabot, gepflegtes Lockfile, **SRI** für Assets.

**Auth-Härtung**
- `state` + `nonce` zwingend geprüft. `redirect_uri` exakt registriert (keine Wildcards).
- Client-Secret nur in `wp-config.php`/ENV, **nicht** in DB-Klartext.
- App-Token kurzlebig, Signaturschlüssel serverseitig, kleine Clock-Skew.

**Server**
- Gruppen-Whitelist serverseitig erzwungen (zusätzlich zum IServ-Client-Filter).
- Rate-Limit auf REST- und Auth-Pfade; Anomalie-/Fehler-Logging.
- JWKS-Cache mit TTL + Key-Rotation-Fallback.
- Generische Fehlermeldungen (kein Token-/Claim-Leak in Responses).

**Datenschutz (DSGVO)**
- **AVV mit w3w.de** (Art. 28) sicherstellen.
- **Datenminimierung:** nur `sub` + Anzeigename + erlaubte Gruppen aus IServ
  speichern; IServ-Tokens nicht dauerhaft persistieren.
- **Verarbeitungsverzeichnis** (Art. 30) + Schwellwert-Prüfung **DSFA**.
- **Hinweis GitHub Pages:** Die SPA wird von GitHub (Microsoft, USA) geladen → dabei
  **IP-Transfer** in ein Drittland (IP = personenbezogen). Es werden dort **keine
  Plandaten** verarbeitet (nur statisches JS/CSS). Restrisiko gering, aber im VVT und
  im Datenschutzhinweis benennen. Der spätere Eigen-Server-Umzug löst dies vollständig.

---

## 9. Sichtbare Hinweise in der Oberfläche (Anforderung)

Folgende Texte müssen **in beiden** Oberflächen erscheinen:

1. **Planner-Einstellungen (SPA)** — neuer Abschnitt „Datenschutz & Transparenz".
2. **Plugin-Einstellungen (WP-Admin)** — gleicher Abschnitt im System-/Info-Tab.

**Inhalt Datenschutz-Abschnitt (beide):**
- Welche Daten verarbeitet werden (IServ-`sub`, Name, Gruppen; Plandaten auf w3w-WP).
- Wo gespeichert wird (w3w.de, DE/EU) und der GitHub-Pages-IP-Hinweis.
- Zweck (gemeinsame Terminplanung), Rechtsgrundlage, Ansprechpartner/Verantwortlicher.
- Link/Verweis auf das schulische Datenschutzkonzept.

**Transparenzhinweis „Vibecoding" (beide):**
> Hinweis: Diese Werkzeuge (Planner und WordPress-Plugin) wurden im Wege des
> „Vibecodings" — also KI-gestützter Softwareentwicklung — erstellt. Vor dem
> produktiven Einsatz mit personenbezogenen Daten sind die übliche Sorgfalt,
> Tests und eine datenschutzrechtliche Bewertung anzuwenden.

(Exakte Endformulierung wird bei der Umsetzung mit dem schulischen
Datenschutzbeauftragten abgestimmt.)

---

## 10. Roadmap (jeder Sprint: eigener spec → plan → Umsetzung)

| Sprint | Inhalt | Größe |
|--------|--------|-------|
| **M1** | IServ Confidential-Client anlegen (mit Gruppenrechten) **+** WP-Auth-Endpunkte (`/auth/login`, `/auth/callback`, `/auth/logout`), Secret-Storage, App-Token-Ausstellung | Kern |
| **M2** | WP-REST-Guard: App-Token validieren + Gruppen-Whitelist + 403; Revisions-Attribution | Kern-Security |
| **M3** | SPA-Auth-Integration: Login-Redirect, App-Token im RAM, Bearer-Aufrufe; App-PW-Pfad entfernen; CORS streng; CSP | mittel |
| **M4** | Geteilte Quelle: Pull/Load aus WP, `localStorage`→Cache, Save-Recheck | mittel |
| **M5** | Konflikt-UX mit Personen-Zuordnung; Diff-Ansicht | mittel |
| **M6** *(optional)* | Leichte Präsenz/Heartbeat (kein WebSocket) | klein |
| **quer** | DSGVO-Doku (AVV, VVT, DSFA); In-App-Hinweise §9; `npm audit`/Dependabot | laufend |

**Reuse-Vorteil:** Versions-/Konflikt-/Revisions-/REST-Code besteht bereits. Wirklich
neu: Auth (M1/M2), SPA-Auth + CORS/CSP (M3), Pull (M4).

---

## 11. Endnutzer-Anleitung (einfache Sprache, für die Schulleitung)

> **Gemeinsam am Terminplaner arbeiten — so geht's**
>
> **Anmelden**
> 1. Planner im Browser öffnen.
> 2. Auf **„Mit IServ anmelden"** klicken.
> 3. Mit dem gewohnten IServ-Benutzernamen und Passwort einloggen.
> 4. Fertig — Sie sehen den gemeinsamen Terminplan der Schule.
>
> Nur Mitglieder der freigegebenen Gruppe (z.B. „Schulleitung") können sich anmelden.
>
> **Gemeinsam bearbeiten**
> - Alle arbeiten am **selben** Plan. Ihre Änderungen werden beim **Speichern** für
>   alle sichtbar.
> - Klicken Sie auf **„Aktualisieren"**, bevor Sie loslegen, um den neuesten Stand zu sehen.
>
> **Wenn jemand gleichzeitig gespeichert hat (Konflikt)**
> - Hat in der Zwischenzeit eine andere Person gespeichert, erscheint ein Hinweis:
>   *„Es gibt eine neuere Version von [Name]."*
> - Sie können dann wählen:
>   - **Meine Änderungen behalten**,
>   - **die andere Version übernehmen**, oder
>   - **beides zusammenführen** (die Unterschiede werden angezeigt).
> - Tipp: Sprechen Sie sich kurz ab, wer wann größere Änderungen macht.
>
> **Abmelden**
> - Oben rechts auf **„Abmelden"** klicken — besonders an geteilten Computern.
>
> **Wichtig**
> - Bei Fragen oder Problemen wenden Sie sich an [Ansprechpartner].
> - Hinweis: Diese Werkzeuge wurden KI-gestützt erstellt („Vibecoding").

---

## 12. SSO-Einrichtungs-Anleitung (für den Administrator) — Platzhalter

> Wird bei der Umsetzung von **M1** Schritt für Schritt ausgefüllt. Grobgliederung:
> 1. In IServ unter **Verwaltung → System → Single-Sign-On** einen Client **„Add"**.
> 2. Name, Gruppen-/Rollenrechte (z.B. nur Gruppe „Schulleitung"), Scopes
>    (`openid`, `profile`, `iserv:groups`), erlaubte Grant-Types, **Redirect-URI**
>    (WP `/auth/callback`) eintragen.
> 3. **Client-ID** und **Client-Secret** notieren.
> 4. In `wp-config.php` Secret + Client-ID + IServ-Basis-URL hinterlegen.
> 5. Im Planner die WP-Basis-URL eintragen; „Verbindung prüfen".
> 6. Test-Login mit einem Schulleitungskonto; Gruppenfilter verifizieren.
>
> Referenzen:
> - IServ Single-Sign-On (Verwaltung): https://doku.iserv.de/manage/system/sso/
> - IServ OAuth/OpenID (Entwickler): https://doku.iserv.de/development/oauth/

---

## 13. Annahmen & offene Punkte

- **Annahme:** IServ-OIDC arbeitet confidential (Client-Secret). Design nutzt diesen
  sicheren Default. *Optional bei IServ-Support klären, ob PKCE still akzeptiert wird —
  würde den Flow nur geringfügig vereinfachen, ändert das Design nicht.*
- **Annahme:** w3w „Server Basic Plus" erlaubt das Hinterlegen von Secrets in
  `wp-config.php`/ENV und ausgehende HTTPS-Aufrufe zu IServ (für Token-/JWKS-Abruf).
- **Offen:** Genauer `iserv:groups`-Claim-Aufbau (id/accountname/displayname) → in M1
  am echten Token verifizieren.
- **Offen:** Endgültige Formulierung der Datenschutz-/Vibecoding-Texte mit dem
  Datenschutzbeauftragten.
- **Nicht im Scope:** Live-Editing (CRDT/WebSocket); Eigen-Server-Umzug; SAML.
