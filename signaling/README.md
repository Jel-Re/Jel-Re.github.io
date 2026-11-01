# Eigener Vermittlungsserver

Round Two nutzt einen kleinen Server, damit sich die Handys finden. Die Spieldaten selbst laufen direkt zwischen den Geräten.
Standardmäßig ist das der öffentliche Server `0.peerjs.com`. Wenn der von deinem Netz aus gesperrt ist, kannst du hier einen eigenen starten.

## Einrichten bei Render (kostenlos)

1. Konto auf https://render.com anlegen (Anmeldung mit GitHub geht).
2. **New → Web Service**, dieses Repository auswählen.
3. Einstellungen:
   - **Root Directory:** `signaling`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. Nach dem Start steht oben eine Adresse wie `round-two-signal.onrender.com`. Öffne `https://DEINE-ADRESSE/` im Browser, es erscheint ein kurzer Text mit „PeerJS Server“.
5. Diese Adresse (ohne `https://`) in `index.html` bei `const OWN=""` eintragen.

Hinweis: Der kostenlose Tarif schläft nach etwa 15 Minuten ohne Anfragen. Der erste Aufruf danach dauert bis zu einer Minute. Das Spiel weckt den Server beim Öffnen der Startseite automatisch.

Lokal testen: `npm install && npm start`.
