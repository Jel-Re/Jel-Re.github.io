/*
 * Zentrale Konfiguration der Quiz-Website.
 *
 * Hier steht bewusst KEIN Passwort.
 *
 * Diese Seite besteht nur aus statischen Dateien – alles, was hier steht, wird
 * an jeden Besucher ausgeliefert und ist im Browser lesbar. Ein Passwort in
 * dieser Datei wäre deshalb kein Schutz, sondern nur eine Sichtblende.
 * Echte Zugangskontrolle braucht einen Server, der die Anmeldung prüft –
 * das übernimmt im Modus "supabase" die Supabase-Authentifizierung.
 *
 * backend: "local"    -> Daten liegen ausschließlich im Browser des Besuchers
 *                        (localStorage). Kein Setup nötig. Es gibt hier keine
 *                        gemeinsamen Daten und damit auch nichts abzusichern:
 *                        jeder sieht und bearbeitet nur seinen eigenen Speicher.
 *
 * backend: "supabase" -> Daten liegen in einer gemeinsamen Datenbank. Das
 *                        Admin-Panel verlangt eine echte Anmeldung, die
 *                        Berechtigungen werden serverseitig durchgesetzt
 *                        (Row Level Security). Siehe supabase-schema.sql
 *                        und README.md.
 */
window.QUIZ_CONFIG = {
  backend: "supabase",

  supabase: {
    url: "",      // z. B. "https://abcdefghijkl.supabase.co"
    anonKey: ""   // der öffentliche "anon public" Key aus den Projekt-Einstellungen
  },

  siteTitle: "Quiz"
};
