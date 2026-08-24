/*
 * Store – einheitlicher Datenzugriff für Player und Admin-Panel.
 *
 * Alle Methoden sind async, damit der aufrufende Code nicht wissen muss,
 * ob gerade localStorage oder Supabase dahinter steckt.
 *
 * Datenmodell:
 *   quiz   = { id, title, description, questions: [ { text, answers: [string], correct: number } ] }
 *   result = { id, quiz_id, quiz_title, player_name, score, total, answers, created_at }
 */
(function () {
  "use strict";

  var CFG = window.QUIZ_CONFIG || {};
  var MODE = CFG.backend === "supabase" ? "supabase" : "local";

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function now() {
    return new Date().toISOString();
  }

  /* ------------------------------------------------------------------ *
   * Backend 1: localStorage
   * ------------------------------------------------------------------ */

  var LS = {
    quizzes: "quizapp.quizzes",
    settings: "quizapp.settings",
    results: "quizapp.results"
  };

  function lsRead(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function lsWrite(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      throw new Error("Der Browser-Speicher ist voll oder gesperrt.");
    }
  }

  var LocalBackend = {
    async listQuizzes() {
      var list = lsRead(LS.quizzes, []);
      return list.slice().sort(function (a, b) {
        return String(b.updated_at || "").localeCompare(String(a.updated_at || ""));
      });
    },

    async getQuiz(id) {
      var list = lsRead(LS.quizzes, []);
      return list.find(function (q) { return q.id === id; }) || null;
    },

    async saveQuiz(quiz) {
      var list = lsRead(LS.quizzes, []);
      var copy = Object.assign({}, quiz);
      copy.updated_at = now();
      var idx = list.findIndex(function (q) { return q.id === copy.id; });
      if (idx >= 0) {
        copy.created_at = list[idx].created_at || copy.updated_at;
        list[idx] = copy;
      } else {
        copy.id = copy.id || uid();
        copy.created_at = copy.updated_at;
        list.push(copy);
      }
      lsWrite(LS.quizzes, list);
      return copy;
    },

    async deleteQuiz(id) {
      var list = lsRead(LS.quizzes, []).filter(function (q) { return q.id !== id; });
      lsWrite(LS.quizzes, list);
      var s = lsRead(LS.settings, {});
      if (s.active_quiz_id === id) {
        s.active_quiz_id = null;
        lsWrite(LS.settings, s);
      }
      var results = lsRead(LS.results, []).filter(function (r) { return r.quiz_id !== id; });
      lsWrite(LS.results, results);
    },

    async getActiveQuizId() {
      return lsRead(LS.settings, {}).active_quiz_id || null;
    },

    async setActiveQuizId(id) {
      var s = lsRead(LS.settings, {});
      s.active_quiz_id = id || null;
      s.updated_at = now();
      lsWrite(LS.settings, s);
    },

    async saveResult(result) {
      var list = lsRead(LS.results, []);
      var copy = Object.assign({}, result, { id: uid(), created_at: now() });
      list.push(copy);
      lsWrite(LS.results, list);
      return copy;
    },

    async listResults(quizId) {
      var list = lsRead(LS.results, []);
      if (quizId) list = list.filter(function (r) { return r.quiz_id === quizId; });
      return list.sort(function (a, b) {
        return String(b.created_at).localeCompare(String(a.created_at));
      });
    },

    async clearResults(quizId) {
      var list = lsRead(LS.results, []);
      var keep = quizId ? list.filter(function (r) { return r.quiz_id !== quizId; }) : [];
      lsWrite(LS.results, keep);
    }
  };

  /* ------------------------------------------------------------------ *
   * Backend 2: Supabase (REST, ohne zusätzliches SDK)
   * ------------------------------------------------------------------ */

  var TOKEN_KEY = "quizapp.token";
  var EXPIRY_KEY = "quizapp.token.expires";

  function sbConfigOk() {
    return !!(CFG.supabase && CFG.supabase.url && CFG.supabase.anonKey);
  }

  /* Fehler, der signalisiert: die Anmeldung ist weg oder abgelaufen.
     Das Admin-Panel zeigt daraufhin wieder den Login-Bildschirm. */
  function AuthError(message) {
    var e = new Error(message);
    e.name = "AuthError";
    e.isAuthError = true;
    return e;
  }

  function sbStoreToken(accessToken, expiresInSeconds) {
    try {
      sessionStorage.setItem(TOKEN_KEY, accessToken);
      var ms = (Number(expiresInSeconds) || 3600) * 1000;
      sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + ms));
    } catch (e) { /* Speicher gesperrt – Token gilt dann nur für diese Seite */ }
  }

  function sbClearToken() {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(EXPIRY_KEY);
    } catch (e) { /* egal */ }
  }

  /* Merkt sich, ob die letzte Sitzung abgelaufen ist – nur damit die Meldung
     an den Benutzer den Unterschied zu "nie angemeldet" benennen kann. */
  var sessionExpired = false;

  function sbToken() {
    try {
      var token = sessionStorage.getItem(TOKEN_KEY);
      if (!token) return null;

      // Abgelaufene Token gar nicht erst mitschicken.
      var expires = Number(sessionStorage.getItem(EXPIRY_KEY) || 0);
      if (expires && Date.now() >= expires) {
        sbClearToken();
        sessionExpired = true;
        return null;
      }
      return token;
    } catch (e) {
      return null;
    }
  }

  async function sbFetch(path, options) {
    if (!sbConfigOk()) {
      throw new Error("Supabase ist nicht konfiguriert – bitte url und anonKey in assets/js/config.js eintragen.");
    }
    options = options || {};
    var token = sbToken();
    var headers = Object.assign(
      {
        apikey: CFG.supabase.anonKey,
        Authorization: "Bearer " + (token || CFG.supabase.anonKey),
        "Content-Type": "application/json"
      },
      options.headers || {}
    );

    var res = await fetch(CFG.supabase.url.replace(/\/+$/, "") + path, {
      method: options.method || "GET",
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!res.ok) {
      var detail = "";
      try {
        var err = await res.json();
        detail = err.message || err.error_description || err.error || "";
      } catch (e) { /* Antwort war kein JSON */ }

      // 401/403 auf einem schreibenden Zugriff heißt: nicht (mehr) angemeldet.
      // Die Datenbank hat den Zugriff verweigert - genau so soll es sein.
      if (res.status === 401 || res.status === 403) {
        if (token || sessionExpired) {
          sbClearToken();
          sessionExpired = false;
          throw AuthError("Die Anmeldung ist abgelaufen. Bitte erneut anmelden.");
        }
        throw AuthError("Dafür ist eine Anmeldung nötig.");
      }

      throw new Error("Datenbankfehler (" + res.status + ")" + (detail ? ": " + detail : ""));
    }

    if (res.status === 204) return null;
    var text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  var SupabaseBackend = {
    async listQuizzes() {
      return (await sbFetch("/rest/v1/quizzes?select=*&order=updated_at.desc")) || [];
    },

    async getQuiz(id) {
      var rows = await sbFetch("/rest/v1/quizzes?select=*&id=eq." + encodeURIComponent(id));
      return rows && rows.length ? rows[0] : null;
    },

    async saveQuiz(quiz) {
      var payload = {
        id: quiz.id || uid(),
        title: quiz.title,
        description: quiz.description || "",
        questions: quiz.questions || [],
        updated_at: now()
      };
      var rows = await sbFetch("/rest/v1/quizzes", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: [payload]
      });
      return rows && rows.length ? rows[0] : payload;
    },

    async deleteQuiz(id) {
      await sbFetch("/rest/v1/quizzes?id=eq." + encodeURIComponent(id), { method: "DELETE" });
    },

    async getActiveQuizId() {
      var rows = await sbFetch("/rest/v1/settings?select=active_quiz_id&id=eq.1");
      return rows && rows.length ? rows[0].active_quiz_id : null;
    },

    async setActiveQuizId(id) {
      await sbFetch("/rest/v1/settings", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: [{ id: 1, active_quiz_id: id || null, updated_at: now() }]
      });
    },

    async saveResult(result) {
      var rows = await sbFetch("/rest/v1/results", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: [
          {
            quiz_id: result.quiz_id,
            quiz_title: result.quiz_title,
            player_name: result.player_name,
            score: result.score,
            total: result.total,
            answers: result.answers || []
          }
        ]
      });
      return rows && rows.length ? rows[0] : result;
    },

    async listResults(quizId) {
      var path = "/rest/v1/results?select=*&order=created_at.desc";
      if (quizId) path += "&quiz_id=eq." + encodeURIComponent(quizId);
      return (await sbFetch(path)) || [];
    },

    async clearResults(quizId) {
      var path = quizId
        ? "/rest/v1/results?quiz_id=eq." + encodeURIComponent(quizId)
        : "/rest/v1/results?id=not.is.null";
      await sbFetch(path, { method: "DELETE" });
    }
  };

  /* ------------------------------------------------------------------ *
   * Anmeldung am Admin-Panel
   * ------------------------------------------------------------------ */

  /*
   * Im localStorage-Modus gibt es keine Anmeldung.
   *
   * Das ist Absicht und kein Rückschritt: in diesem Modus existieren keine
   * gemeinsamen Daten. Wer das Admin-Panel öffnet, sieht und ändert
   * ausschließlich den Speicher des eigenen Browsers - es gibt für andere
   * nichts einzusehen und nichts kaputtzumachen. Ein Passwort, das im
   * ausgelieferten JavaScript steht, könnte ohnehin jeder auslesen; es würde
   * nur Sicherheit vortäuschen, die es nicht gibt.
   */
  var OpenAuth = {
    mode: "open",
    required: false,
    async login() { return true; },
    isLoggedIn() { return true; },
    async logout() { /* nichts anzumelden, nichts abzumelden */ }
  };

  var SupabaseAuth = {
    mode: "supabase",
    required: true,

    async login(email, password) {
      if (!sbConfigOk()) {
        throw new Error("Supabase ist nicht konfiguriert – bitte url und anonKey in assets/js/config.js eintragen.");
      }
      if (!email || !password) throw AuthError("Bitte E-Mail und Passwort eingeben.");

      var res = await fetch(
        CFG.supabase.url.replace(/\/+$/, "") + "/auth/v1/token?grant_type=password",
        {
          method: "POST",
          headers: {
            apikey: CFG.supabase.anonKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email: email, password: password })
        }
      );

      if (!res.ok) {
        // Bewusst ohne Unterscheidung, ob die E-Mail existiert - das würde
        // sonst verraten, welche Konten es gibt.
        throw AuthError("Anmeldung fehlgeschlagen – E-Mail oder Passwort stimmt nicht.");
      }

      var data = await res.json();
      if (!data.access_token) throw AuthError("Anmeldung fehlgeschlagen.");

      sessionExpired = false;
      sbStoreToken(data.access_token, data.expires_in);
      return true;
    },

    isLoggedIn() {
      return !!sbToken();
    },

    /* Meldet das Token auch serverseitig ab, damit es nicht weiterverwendbar
       bleibt - und räumt lokal in jedem Fall auf. */
    async logout() {
      var token = sbToken();
      sbClearToken();
      if (!token || !sbConfigOk()) return;
      try {
        await fetch(CFG.supabase.url.replace(/\/+$/, "") + "/auth/v1/logout", {
          method: "POST",
          headers: {
            apikey: CFG.supabase.anonKey,
            Authorization: "Bearer " + token
          }
        });
      } catch (e) { /* lokal ist das Token bereits weg */ }
    }
  };

  var backend = MODE === "supabase" ? SupabaseBackend : LocalBackend;
  var auth = MODE === "supabase" ? SupabaseAuth : OpenAuth;

  window.Store = Object.assign({}, backend, {
    mode: MODE,
    auth: auth,
    uid: uid
  });
})();
