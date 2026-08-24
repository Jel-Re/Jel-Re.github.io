# Quiz-Website

Eine allgemeine Quiz-Plattform mit Admin-Panel: Quizze anlegen, eines davon
aktivieren – wer die Startseite öffnet, landet direkt im aktivierten Quiz,
gibt seinen Namen ein und spielt. Alle Ergebnisse laufen im Admin-Panel
zusammen.

Reines HTML/CSS/JavaScript, kein Build-Schritt, läuft auf GitHub Pages.

| Seite | Zweck |
| --- | --- |
| `index.html` | Quiz für Besucher: Namenseingabe → Fragen → Auswertung |
| `admin.html` | Admin-Panel: Quizze verwalten, aktivieren, Ergebnisse ansehen |

## Schnellstart

1. Seite öffnen, dann `admin.html` aufrufen.
2. Anmelden – das Passwort steht in `assets/js/config.js` (`localAdminPasscode`,
   Standard: `admin`). **Bitte ändern.**
3. „+ Neues Quiz“ → Titel, Fragen und Antworten eintragen, die richtige Antwort
   per Radiobutton markieren.
4. „Speichern & aktivieren“ – ab jetzt zeigt die Startseite dieses Quiz.

Neben dem aktiven Quiz kann jedes Quiz auch direkt verlinkt werden:
`index.html?quiz=<id>` – den Link liefert der „Link“-Button in der Quiz-Liste.

## Die zwei Datenbank-Modi

GitHub Pages liefert nur statische Dateien aus, es gibt also keinen eigenen
Server. Die Datenhaltung steckt deshalb hinter einer Abstraktion
(`assets/js/db.js`) mit zwei austauschbaren Backends. Umgeschaltet wird in
`assets/js/config.js` über `backend`.

### `backend: "local"` (Standard)

Daten liegen im `localStorage` des Browsers. Funktioniert sofort, ohne Setup.

Wichtig: Die Daten bleiben **in genau diesem Browser**. Ein Quiz, das du hier
aktivierst, sehen andere Besucher nicht – sie haben ihren eigenen, leeren
Speicher. Dieser Modus eignet sich zum Ausprobieren, für eine Demo oder wenn
das Quiz nur auf einem Gerät läuft (z. B. ein Tablet, das herumgereicht wird).
Auch das Admin-Passwort ist hier nur eine Sichtblende, keine echte Sicherheit:
Der Code liegt im Browser und jeder kann ihn lesen.

### `backend: "supabase"` (gemeinsame Datenbank)

Damit ein aktiviertes Quiz für **alle** Besucher sichtbar ist und alle
Ergebnisse zentral zusammenlaufen, braucht es eine echte Datenbank.
Supabase bietet dafür eine kostenlose Stufe und eine reine HTTP-API – es wird
kein zusätzliches JavaScript-SDK geladen.

Einrichtung:

1. Projekt auf [supabase.com](https://supabase.com) anlegen.
2. Im **SQL Editor** den Inhalt von `supabase-schema.sql` ausführen. Das legt
   die Tabellen `quizzes`, `settings` und `results` an und schaltet Row Level
   Security ein.
3. Unter **Authentication → Users** einen Admin-Benutzer mit E-Mail und
   Passwort anlegen.
4. In `assets/js/config.js` eintragen:

   ```js
   backend: "supabase",
   supabase: {
     url: "https://<projekt>.supabase.co",
     anonKey: "<anon public key>"
   }
   ```

5. Committen und pushen. Im Admin-Panel meldest du dich jetzt mit der E-Mail
   und dem Passwort aus Schritt 3 an.

Der `anon`-Key darf öffentlich im Repository stehen – genau dafür ist er
gedacht. Geschützt wird über die Row-Level-Security-Regeln aus
`supabase-schema.sql`:

| Wer | darf |
| --- | --- |
| Besucher (nicht angemeldet) | Quizze und das aktive Quiz lesen, ein eigenes Ergebnis eintragen |
| Angemeldeter Admin | Quizze anlegen/ändern/löschen, Quiz aktivieren, Ergebnisse lesen und löschen |

Besucher können also insbesondere **keine** fremden Ergebnisse lesen und keine
Quizze verändern. Den `service_role`-Key niemals ins Repository legen.

## Funktionen des Admin-Panels

- Quizze anlegen, bearbeiten, duplizieren, löschen
- Beliebig viele Fragen mit je 2–6 Antworten, Reihenfolge per ↑/↓ änderbar
- Genau ein Quiz aktivieren (oder alle deaktivieren)
- Direktlink zu jedem einzelnen Quiz kopieren
- Ergebnisse als Tabelle mit Durchschnitt, gefiltert pro Quiz
- Export als CSV (Semikolon-getrennt, mit BOM – öffnet sauber in Excel)

## Projektstruktur

```
index.html              Quiz für Besucher
admin.html              Admin-Panel
supabase-schema.sql     Tabellen + Zugriffsregeln für den Supabase-Modus
assets/css/style.css    gemeinsames Stylesheet (hell/dunkel automatisch)
assets/js/config.js     Konfiguration: Backend, Zugangsdaten, Passwort
assets/js/db.js         Datenzugriff, kapselt localStorage bzw. Supabase
assets/js/quiz.js       Ablauf der Spieler-Seite
assets/js/admin.js      Ablauf des Admin-Panels
```

Ein Quiz sieht intern so aus:

```json
{
  "id": "…",
  "title": "Hauptstädte",
  "description": "Drei kurze Fragen.",
  "questions": [
    { "text": "Hauptstadt von Deutschland?",
      "answers": ["Berlin", "Hamburg", "München"],
      "correct": 0 }
  ]
}
```

`correct` ist der Index der richtigen Antwort und beginnt bei 0.
