# Round Two

Gossip- und Trinkspiel für die Gruppe. Jeder spielt auf dem eigenen Handy, ein Host erstellt einen Raum, die anderen treten per Code, Link oder QR-Code bei.

**Spielen:** https://jel-re.github.io/round-two/

## Modi
- **Gossip Wheel:** Alle schreiben gleichzeitig anonym eine Challenge, eine Frage und ein Gerücht für Personen aus der Runde. Danach werden die Karten zufällig aufgedeckt, der Host drückt Weiter.
- **Wer am ehesten:** Alle wählen geheim, wer am besten zur Frage passt.
- **Ich hab noch nie:** Wer es schon gemacht hat, trinkt.
- **Wahrheit oder Pflicht:** Reihum wählt jemand, dann kommt eine Frage oder Challenge.

Dazu: Chat mit Emoji-Reaktionen, Ton und Vibration, Fotos als Profilbild, gesperrte Wörter (nur der Host sieht die Liste), QR-Code, als App auf den Homescreen legbar.

## Technik
Statische Seite ohne Server: `index.html` (alles in einer Datei), `qrcode.js` (QR-Code, MIT-Lizenz), `manifest.webmanifest` und `sw.js` (App-Icon, Offline-Start). Die Verbindung zwischen den Handys läuft per WebRTC über [PeerJS](https://peerjs.com/) (öffentlicher Vermittlungsserver). Der Host hält den Spielstand, wer ihn verlässt, beendet den Raum. Es werden keine Daten gespeichert, Fotos laufen nur zwischen den Handys.

## Lokal testen
```
python3 -m http.server 8099
```
dann `http://127.0.0.1:8099/` öffnen. Die Seite ist komplett statisch, auf GitHub Pages reicht Branch `main`, Ordner `/ (root)`.
