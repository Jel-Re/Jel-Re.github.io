/*
 * Zentrale Konfiguration der Quiz-Website.
 *
 * backend: "local"    -> Daten liegen im Browser (localStorage). Kein Setup nötig,
 *                        aber jeder Browser sieht nur seine eigenen Daten.
 * backend: "supabase" -> Daten liegen in einer gemeinsamen Datenbank. Ein im
 *                        Admin-Panel aktiviertes Quiz ist damit für alle Besucher
 *                        sichtbar. Siehe supabase-schema.sql und README.md.
 */
window.QUIZ_CONFIG = {
  backend: "local",

  supabase: {
    url: "",      // z. B. "https://abcdefghijkl.supabase.co"
    anonKey: ""   // der öffentliche "anon public" Key aus den Projekt-Einstellungen
  },

  // Nur für backend: "local" – schützt das Admin-Panel oberflächlich.
  // Das ist KEINE echte Sicherheit (der Code liegt im Browser). Für echten
  // Schutz backend: "supabase" verwenden, dort wird per Supabase-Auth angemeldet.
  localAdminPasscode: "admin",

  siteTitle: "Quiz"
};
