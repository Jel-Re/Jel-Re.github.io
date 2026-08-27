/* Admin-Panel: Quizze anlegen, bearbeiten, aktivieren und Ergebnisse ansehen. */
(function () {
  "use strict";

  var el = function (id) { return document.getElementById(id); };

  var state = {
    quizzes: [],
    activeId: null,
    draft: null,      // aktuell im Editor bearbeitetes Quiz
    results: [],
    tab: "quizzes"
  };

  /* ------------------------------------------------------------------ *
   * Anmeldung
   * ------------------------------------------------------------------ */

  function setupLogin() {
    el("login-hint").textContent =
      "Mit dem Supabase-Konto anmelden, das die Quizze verwalten darf. " +
      "Das Passwort liegt in Supabase, nicht in dieser Website.";

    el("login-form").addEventListener("submit", async function (event) {
      event.preventDefault();
      var error = el("login-error");
      var submit = el("login-form").querySelector("button[type=submit]");

      error.classList.add("hidden");
      submit.disabled = true;

      try {
        await Store.auth.login(el("login-email").value.trim(), el("login-password").value);
        el("login-password").value = "";
        openPanel();
      } catch (err) {
        error.textContent = err.message || String(err);
        error.classList.remove("hidden");
      } finally {
        submit.disabled = false;
      }
    });
  }

  /* Zurück zum Login – nach Abmelden oder wenn die Sitzung abgelaufen ist. */
  function showLogin(reason) {
    el("panel").classList.add("hidden");
    el("login").classList.remove("hidden");

    var error = el("login-error");
    if (reason) {
      error.textContent = reason;
      error.classList.remove("hidden");
    } else {
      error.classList.add("hidden");
    }
    el("login-password").value = "";
    el("login-email").focus();
  }

  /* Ein abgelaufenes oder fehlendes Token führt zurück zum Login,
     statt eine unverständliche Fehlermeldung anzuzeigen. */
  function handleError(err, fallbackKind) {
    if (err && err.isAuthError && Store.auth.required) {
      showLogin(err.message);
      return true;
    }
    message(err && err.message ? err.message : String(err), fallbackKind || "error");
    return false;
  }

  el("btn-logout").addEventListener("click", async function () {
    await Store.auth.logout();
    location.reload();
  });

  /* ------------------------------------------------------------------ *
   * Panel
   * ------------------------------------------------------------------ */

  function message(text, kind) {
    var box = el("global-message");
    if (!text) {
      box.classList.add("hidden");
      return;
    }
    box.textContent = text;
    box.className = "notice " + (kind || "");
    box.classList.remove("hidden");
    if (kind === "success") {
      setTimeout(function () { box.classList.add("hidden"); }, 4000);
    }
  }

  async function openPanel() {
    var supabase = Store.mode === "supabase";

    el("login").classList.add("hidden");
    el("panel").classList.remove("hidden");
    el("mode-badge").textContent = supabase ? "Datenbank" : "Browser-Speicher";

    // Abmelden gibt es nur, wo es auch eine Anmeldung gibt.
    el("btn-logout").classList.toggle("hidden", !Store.auth.required);

    var banner = el("mode-notice");
    if (supabase) {
      banner.classList.add("hidden");
    } else {
      banner.textContent =
        "Lokaler Modus: Diese Quizze und Ergebnisse liegen nur in diesem Browser – " +
        "andere Besucher sehen sie nicht. Deshalb gibt es hier auch keine Anmeldung: " +
        "es sind keine gemeinsamen Daten vorhanden, die zu schützen wären. " +
        "Für ein Quiz, das andere spielen sollen, den Supabase-Modus einrichten (siehe README).";
      banner.classList.remove("hidden");
    }

    await refresh();
  }

  async function refresh() {
    try {
      state.quizzes = await Store.listQuizzes();
      state.activeId = await Store.getActiveQuizId();
      renderActive();
      renderQuizList();
      renderResultsFilter();
      message("");
    } catch (err) {
      if (err && err.isAuthError && Store.auth.required) {
        showLogin(err.message);
        return;
      }
      message("Daten konnten nicht geladen werden: " + (err.message || String(err)), "error");
    }
  }

  /* --- Tabs --- */

  document.querySelectorAll(".tabs .btn").forEach(function (button) {
    button.addEventListener("click", async function () {
      state.tab = button.dataset.tab;
      document.querySelectorAll(".tabs .btn").forEach(function (b) {
        b.classList.toggle("active", b === button);
      });
      el("tab-quizzes").classList.toggle("hidden", state.tab !== "quizzes");
      el("tab-results").classList.toggle("hidden", state.tab !== "results");
      if (state.tab === "results") await loadResults();
    });
  });

  /* ------------------------------------------------------------------ *
   * Aktives Quiz
   * ------------------------------------------------------------------ */

  function playerLink(quizId) {
    var base = location.href.replace(/admin\.html.*$/, "");
    return quizId ? base + "index.html?quiz=" + encodeURIComponent(quizId) : base;
  }

  function renderActive() {
    var active = state.quizzes.find(function (q) { return q.id === state.activeId; });
    var actions = el("active-actions");
    actions.innerHTML = "";

    if (!active) {
      el("active-name").textContent =
        "Kein Quiz aktiv – Besucher sehen einen Hinweis statt eines Quiz.";
      return;
    }

    el("active-name").textContent =
      '"' + active.title + '" läuft – wer die Startseite öffnet, bekommt dieses Quiz.';

    var open = document.createElement("a");
    open.className = "btn small";
    open.href = playerLink("");
    open.target = "_blank";
    open.rel = "noopener";
    open.textContent = "Quiz-Seite öffnen";
    actions.appendChild(open);

    var copy = document.createElement("button");
    copy.type = "button";
    copy.className = "btn small";
    copy.textContent = "Link kopieren";
    copy.addEventListener("click", function () { copyLink(playerLink(""), copy); });
    actions.appendChild(copy);

    var stop = document.createElement("button");
    stop.type = "button";
    stop.className = "btn small danger";
    stop.textContent = "Deaktivieren";
    stop.addEventListener("click", async function () {
      await Store.setActiveQuizId(null);
      message("Quiz deaktiviert.", "success");
      await refresh();
    });
    actions.appendChild(stop);
  }

  function copyLink(url, button) {
    var label = button.textContent;
    function done(ok) {
      button.textContent = ok ? "Kopiert!" : url;
      setTimeout(function () { button.textContent = label; }, 2000);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); });
    } else {
      done(false);
    }
  }

  /* ------------------------------------------------------------------ *
   * Quiz-Liste
   * ------------------------------------------------------------------ */

  function renderQuizList() {
    var list = el("quiz-list");
    list.innerHTML = "";

    if (!state.quizzes.length) {
      var empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "Noch keine Quizze. Lege mit „+ Neues Quiz“ das erste an – "
        + "oder starte mit dem Beispiel:";
      list.appendChild(empty);
      list.appendChild(button("Beispiel-Quiz laden", "small", async function () {
        await Store.saveQuiz(sampleQuiz());
        message("Beispiel-Quiz angelegt.", "success");
        await refresh();
      }));
      return;
    }

    state.quizzes.forEach(function (quiz) {
      var item = document.createElement("div");
      item.className = "list-item";

      var info = document.createElement("div");
      info.style.flex = "1 1 240px";

      var title = document.createElement("div");
      title.innerHTML = "<strong></strong>";
      title.querySelector("strong").textContent = quiz.title || "(ohne Titel)";
      if (quiz.id === state.activeId) {
        var badge = document.createElement("span");
        badge.className = "badge live";
        badge.textContent = "aktiv";
        badge.style.marginLeft = ".5rem";
        title.appendChild(badge);
      }
      info.appendChild(title);

      var meta = document.createElement("div");
      meta.className = "muted";
      var count = (quiz.questions || []).length;
      meta.textContent = (count === 1 ? "1 Frage" : count + " Fragen") +
        (quiz.description ? " · " + quiz.description : "");
      info.appendChild(meta);

      item.appendChild(info);

      var actions = document.createElement("div");
      actions.className = "row";

      if (quiz.id !== state.activeId) {
        actions.appendChild(button("Aktivieren", "small primary", async function () {
          if (!count) {
            message("Dieses Quiz hat noch keine Fragen und kann nicht aktiviert werden.", "error");
            return;
          }
          await Store.setActiveQuizId(quiz.id);
          message('"' + quiz.title + '" ist jetzt aktiv.', "success");
          await refresh();
        }));
      }

      actions.appendChild(button("Bearbeiten", "small", function () { openEditor(quiz); }));

      var linkButton = button("Link", "small", function () {
        copyLink(playerLink(quiz.id), linkButton);
      });
      actions.appendChild(linkButton);

      actions.appendChild(button("Duplizieren", "small", async function () {
        var copy = {
          title: (quiz.title || "Quiz") + " (Kopie)",
          description: quiz.description || "",
          questions: JSON.parse(JSON.stringify(quiz.questions || []))
        };
        await Store.saveQuiz(copy);
        message("Kopie angelegt.", "success");
        await refresh();
      }));

      actions.appendChild(button("Löschen", "small danger", async function () {
        if (!confirm('Quiz "' + quiz.title + '" wirklich löschen? Die zugehörigen Ergebnisse werden mitgelöscht.')) return;
        await Store.deleteQuiz(quiz.id);
        message("Quiz gelöscht.", "success");
        await refresh();
      }));

      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  /* Kleines Beispiel-Quiz, damit das Panel nicht leer startet. */
  function sampleQuiz() {
    return {
      title: "Allgemeinwissen",
      description: "Sieben Fragen zum Aufwärmen.",
      questions: [
        { text: "Wie viele Bundesländer hat Deutschland?", answers: ["14", "16", "18"], correct: 1 },
        { text: "Welcher Planet ist der Sonne am nächsten?", answers: ["Merkur", "Venus", "Mars"], correct: 0 },
        { text: "Welches ist das größte Organ des Menschen?", answers: ["Leber", "Lunge", "Haut"], correct: 2 },
        { text: "Wie viele Minuten hat ein Fußballspiel regulär?", answers: ["80", "90", "100"], correct: 1 },
        { text: "Welche Farbe entsteht aus Blau und Gelb?", answers: ["Grün", "Orange", "Violett"], correct: 0 },
        { text: "Wer schrieb den Faust?", answers: ["Schiller", "Goethe", "Lessing"], correct: 1 },
        { text: "Wie viele Sekunden hat eine Stunde?", answers: ["360", "3.600", "36.000"], correct: 1 }
      ]
    };
  }

  function button(label, className, handler) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn " + className;
    b.textContent = label;
    b.addEventListener("click", async function (event) {
      b.disabled = true;
      try {
        await handler(event);
      } catch (err) {
        handleError(err);
      } finally {
        b.disabled = false;
      }
    });
    return b;
  }

  /* ------------------------------------------------------------------ *
   * Editor
   * ------------------------------------------------------------------ */

  function blankQuestion() {
    return { text: "", answers: ["", ""], correct: 0 };
  }

  function openEditor(quiz) {
    state.draft = quiz
      ? JSON.parse(JSON.stringify(quiz))
      : { title: "", description: "", questions: [blankQuestion()] };

    if (!state.draft.questions || !state.draft.questions.length) {
      state.draft.questions = [blankQuestion()];
    }

    el("editor-title").textContent = quiz ? "Quiz bearbeiten" : "Neues Quiz";
    el("quiz-title").value = state.draft.title || "";
    el("quiz-description").value = state.draft.description || "";
    el("editor-error").classList.add("hidden");

    renderQuestions();
    el("editor").classList.remove("hidden");
    el("quiz-list-card").classList.add("hidden");
    el("active-card").classList.add("hidden");
    el("quiz-title").focus();
  }

  function closeEditor() {
    state.draft = null;
    el("editor").classList.add("hidden");
    el("quiz-list-card").classList.remove("hidden");
    el("active-card").classList.remove("hidden");
  }

  function renderQuestions() {
    var zone = el("questions");
    zone.innerHTML = "";

    state.draft.questions.forEach(function (question, qi) {
      var card = document.createElement("div");
      card.className = "question-card";

      var head = document.createElement("div");
      head.className = "row between";
      var label = document.createElement("strong");
      label.textContent = "Frage " + (qi + 1);
      head.appendChild(label);

      var tools = document.createElement("div");
      tools.className = "row";
      if (qi > 0) tools.appendChild(iconButton("↑", function () { moveQuestion(qi, -1); }));
      if (qi < state.draft.questions.length - 1) tools.appendChild(iconButton("↓", function () { moveQuestion(qi, 1); }));
      if (state.draft.questions.length > 1) {
        tools.appendChild(iconButton("✕", function () {
          state.draft.questions.splice(qi, 1);
          renderQuestions();
        }));
      }
      head.appendChild(tools);
      card.appendChild(head);

      var textInput = document.createElement("input");
      textInput.type = "text";
      textInput.value = question.text || "";
      textInput.placeholder = "Wie lautet die Frage?";
      textInput.maxLength = 300;
      textInput.style.margin = ".5rem 0 .75rem";
      textInput.addEventListener("input", function () { question.text = textInput.value; });
      card.appendChild(textInput);

      var hint = document.createElement("div");
      hint.className = "muted";
      hint.style.marginBottom = ".4rem";
      hint.textContent = "Richtige Antwort auswählen:";
      card.appendChild(hint);

      question.answers.forEach(function (answer, ai) {
        var row = document.createElement("div");
        row.className = "answer-row";

        var radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "correct-" + qi;
        radio.checked = question.correct === ai;
        radio.title = "Als richtige Antwort markieren";
        radio.addEventListener("change", function () { question.correct = ai; });
        row.appendChild(radio);

        var input = document.createElement("input");
        input.type = "text";
        input.value = answer;
        input.placeholder = "Antwort " + (ai + 1);
        input.maxLength = 200;
        input.addEventListener("input", function () { question.answers[ai] = input.value; });
        row.appendChild(input);

        if (question.answers.length > 2) {
          row.appendChild(iconButton("✕", function () {
            question.answers.splice(ai, 1);
            if (question.correct >= question.answers.length) question.correct = 0;
            else if (question.correct > ai) question.correct--;
            renderQuestions();
          }));
        }

        card.appendChild(row);
      });

      if (question.answers.length < 6) {
        var add = document.createElement("button");
        add.type = "button";
        add.className = "btn small";
        add.textContent = "+ Antwort";
        add.addEventListener("click", function () {
          question.answers.push("");
          renderQuestions();
        });
        card.appendChild(add);
      }

      zone.appendChild(card);
    });
  }

  function iconButton(symbol, handler) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn small";
    b.textContent = symbol;
    b.addEventListener("click", handler);
    return b;
  }

  function moveQuestion(index, delta) {
    var list = state.draft.questions;
    var target = index + delta;
    if (target < 0 || target >= list.length) return;
    var tmp = list[index];
    list[index] = list[target];
    list[target] = tmp;
    renderQuestions();
  }

  el("btn-new-quiz").addEventListener("click", function () { openEditor(null); });
  el("btn-cancel-quiz").addEventListener("click", closeEditor);
  el("btn-add-question").addEventListener("click", function () {
    state.draft.questions.push(blankQuestion());
    renderQuestions();
  });

  function collectDraft() {
    var draft = state.draft;
    draft.title = el("quiz-title").value.trim();
    draft.description = el("quiz-description").value.trim();

    if (!draft.title) throw new Error("Bitte einen Titel eingeben.");
    if (!draft.questions.length) throw new Error("Mindestens eine Frage wird benötigt.");

    draft.questions.forEach(function (question, i) {
      question.text = (question.text || "").trim();
      question.answers = question.answers.map(function (a) { return (a || "").trim(); });

      if (!question.text) throw new Error("Frage " + (i + 1) + " hat noch keinen Text.");
      if (question.answers.filter(Boolean).length < 2) {
        throw new Error("Frage " + (i + 1) + " braucht mindestens zwei ausgefüllte Antworten.");
      }
      if (question.answers.some(function (a) { return !a; })) {
        throw new Error("Bei Frage " + (i + 1) + " ist eine Antwort leer – bitte ausfüllen oder entfernen.");
      }
      if (typeof question.correct !== "number" || !question.answers[question.correct]) {
        throw new Error("Bei Frage " + (i + 1) + " ist keine richtige Antwort markiert.");
      }
    });

    return draft;
  }

  async function saveDraft(activate) {
    var error = el("editor-error");
    error.classList.add("hidden");

    try {
      var draft = collectDraft();
      var saved = await Store.saveQuiz(draft);
      if (activate) await Store.setActiveQuizId(saved.id);
      closeEditor();
      message(activate ? "Gespeichert und aktiviert." : "Quiz gespeichert.", "success");
      await refresh();
    } catch (err) {
      if (err && err.isAuthError && Store.auth.required) {
        showLogin(err.message);
        return;
      }
      error.textContent = err.message || String(err);
      error.classList.remove("hidden");
    }
  }

  el("btn-save-quiz").addEventListener("click", function () { saveDraft(false); });
  el("btn-save-activate").addEventListener("click", function () { saveDraft(true); });

  /* ------------------------------------------------------------------ *
   * Ergebnisse
   * ------------------------------------------------------------------ */

  function renderResultsFilter() {
    var select = el("results-filter");
    var previous = select.value;
    select.innerHTML = "";

    var all = document.createElement("option");
    all.value = "";
    all.textContent = "Alle Quizze";
    select.appendChild(all);

    state.quizzes.forEach(function (quiz) {
      var option = document.createElement("option");
      option.value = quiz.id;
      option.textContent = quiz.title || "(ohne Titel)";
      select.appendChild(option);
    });

    select.value = previous;
  }

  el("results-filter").addEventListener("change", loadResults);

  async function loadResults() {
    var quizId = el("results-filter").value || null;
    var body = el("results-table").querySelector("tbody");
    body.innerHTML = "";
    el("results-summary").textContent = "Wird geladen …";

    try {
      state.results = await Store.listResults(quizId);
    } catch (err) {
      if (err && err.isAuthError && Store.auth.required) {
        showLogin(err.message);
        return;
      }
      el("results-summary").textContent = "Ergebnisse konnten nicht geladen werden: " +
        (err.message || String(err));
      return;
    }

    if (!state.results.length) {
      el("results-summary").textContent = "Noch keine Ergebnisse.";
      return;
    }

    var sum = state.results.reduce(function (acc, r) {
      return acc + (r.total ? r.score / r.total : 0);
    }, 0);
    var average = Math.round((sum / state.results.length) * 100);

    el("results-summary").textContent =
      state.results.length + " Durchgänge · Durchschnitt " + average + " %";

    state.results.forEach(function (r) {
      var tr = document.createElement("tr");
      var percent = r.total ? Math.round((r.score / r.total) * 100) : 0;
      [
        r.player_name,
        r.quiz_title || "—",
        r.score + " / " + r.total,
        percent + " %",
        formatDate(r.created_at)
      ].forEach(function (value) {
        var td = document.createElement("td");
        td.textContent = value;
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
  }

  function formatDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  el("btn-export").addEventListener("click", function () {
    if (!state.results.length) {
      message("Es gibt noch keine Ergebnisse zum Exportieren.", "error");
      return;
    }

    var rows = [["Name", "Quiz", "Punkte", "Maximal", "Prozent", "Zeitpunkt"]];
    state.results.forEach(function (r) {
      rows.push([
        r.player_name,
        r.quiz_title || "",
        r.score,
        r.total,
        r.total ? Math.round((r.score / r.total) * 100) : 0,
        r.created_at || ""
      ]);
    });

    var csv = rows.map(function (row) {
      return row.map(function (cell) {
        return '"' + String(cell).replace(/"/g, '""') + '"';
      }).join(";");
    }).join("\r\n");

    var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "quiz-ergebnisse.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });

  el("btn-clear-results").addEventListener("click", async function () {
    var quizId = el("results-filter").value || null;
    var what = quizId ? "die Ergebnisse dieses Quiz" : "ALLE Ergebnisse";
    if (!confirm("Wirklich " + what + " löschen? Das lässt sich nicht rückgängig machen.")) return;

    try {
      await Store.clearResults(quizId);
      message("Ergebnisse gelöscht.", "success");
      await loadResults();
    } catch (err) {
      handleError(err);
    }
  });

  /* ------------------------------------------------------------------ *
   * Start
   * ------------------------------------------------------------------ */

  setupLogin();

  if (Store.configError) {
    // Ohne Zugangsdaten hat eine Anmeldemaske keinen Zweck.
    el("login").classList.remove("hidden");
    el("login-form").classList.add("hidden");
    el("login-hint").textContent = Store.configError;
  } else if (!Store.auth.required || Store.auth.isLoggedIn()) {
    openPanel();
  } else {
    el("login").classList.remove("hidden");
    el("login-email").focus();
  }
})();
