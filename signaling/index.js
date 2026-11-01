/* Vermittlungsserver für Round Two: hilft den Handys nur beim Finden, Spieldaten laufen direkt zwischen den Geräten. */
const { PeerServer } = require("peer");
const port = Number(process.env.PORT) || 9000;
PeerServer({
  ...(process.env.HOST ? { host: process.env.HOST } : {}), /* nur für lokale Tests */
  port,
  path: "/",
  proxied: true,                 /* hinter dem Proxy des Hosters */
  corsOptions: { origin: true }, /* Aufruf von round-two-game.github.io erlauben */
  allow_discovery: false,        /* keine Liste der Räume */
});
console.log("Round Two Vermittlungsserver läuft auf Port " + port);
