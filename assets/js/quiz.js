/* Spieler-Seite: aktives Quiz laden, Namen abfragen, durchspielen, Ergebnis speichern. */
(function () {
  "use strict";

  var el = function (id) { return document.getElementById(id); };

  var state = {
    quiz: null,
    playerName: "",
    index: 0,
    score: 0,
    answers: [],
    locked: false
  };

  function show(screenId) {
    ["loading", "screen-empty", "screen-start", "screen-play", "screen-done"].forEach(function (id) {
      el(id).classList.toggle("hidden", id !== screenId);
    });
  }

  function showEmpty(title, text) {
    el("empty-title").textContent = title;
    el("empty-text").textContent = text;
    show("screen-empty");
  }

  function questionCount(quiz) {
    return (quiz.questions || []).length;
  }

  /* --- Laden --- */

  async function init() {
    var params = new URLSearchParams(location.search);
    var wanted = params.get("quiz");

    try {
      var quiz = null;

      if (wanted) {
        quiz = await Store.getQuiz(wanted);
        if (!quiz) {
          showEmpty("Quiz nicht gefunden", "Dieser Quiz-Link zeigt auf ein Quiz, das es nicht (mehr) gibt.");
          return;
        }
      } else {
        var activeId = await Store.getActiveQuizId();
        if (!activeId) {
          showEmpty(
            "Gerade läuft kein Quiz",
            "Im Admin-Panel kann ein Quiz erstellt und aktiviert werden. Danach startet es hier automatisch."
          );
          return;
        }
        quiz = await Store.getQuiz(activeId);
        if (!quiz) {
          showEmpty(
            "Gerade läuft kein Quiz",
            "Das aktivierte Quiz ist nicht mehr verfügbar. Bitte im Admin-Panel ein anderes aktivieren."
          );
          return;
        }
      }

      if (questionCount(quiz) === 0) {
        showEmpty("Dieses Quiz hat noch keine Fragen", "Bitte im Admin-Panel Fragen ergänzen.");
        return;
      }

      state.quiz = quiz;
      renderStart();
    } catch (err) {
      showEmpty("Das Quiz konnte nicht geladen werden", err.message || String(err));
    }
  }

  /* --- Startbildschirm --- */

  function renderStart() {
    var quiz = state.quiz;
    document.title = quiz.title + " – Quiz";
    el("start-title").textContent = quiz.title;

    var desc = el("start-description");
    desc.textContent = quiz.description || "";
    desc.classList.toggle("hidden", !quiz.description);

    var n = questionCount(quiz);
    el("start-meta").textContent = n === 1 ? "1 Frage" : n + " Fragen";

    show("screen-start");
    el("player-name").focus();
  }

  el("start-form").addEventListener("submit", function (event) {
    event.preventDefault();
    var name = el("player-name").value.trim();
    var error = el("start-error");

    if (name.length < 2) {
      error.textContent = "Bitte gib einen Namen mit mindestens 2 Zeichen ein.";
      error.classList.remove("hidden");
      return;
    }

    error.classList.add("hidden");
    state.playerName = name;
    state.index = 0;
    state.score = 0;
    state.answers = [];
    renderQuestion();
  });

  /* --- Fragen --- */

  function renderQuestion() {
    var quiz = state.quiz;
    var total = questionCount(quiz);
    var question = quiz.questions[state.index];

    state.locked = false;
    el("progress-bar").style.width = (state.index / total) * 100 + "%";
    el("play-counter").textContent = "Frage " + (state.index + 1) + " von " + total;
    el("play-question").textContent = question.text;

    var zone = el("play-answers");
    zone.innerHTML = "";

    (question.answers || []).forEach(function (text, i) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "answer";
      button.textContent = text;
      button.addEventListener("click", function () { choose(i); });
      zone.appendChild(button);
    });

    show("screen-play");
  }

  function choose(chosen) {
    if (state.locked) return;
    state.locked = true;

    var question = state.quiz.questions[state.index];
    var correct = question.correct;
    var ok = chosen === correct;

    if (ok) state.score++;

    state.answers.push({
      question: question.text,
      chosen: question.answers[chosen],
      correct: question.answers[correct],
      ok: ok
    });

    var buttons = el("play-answers").querySelectorAll("button");
    buttons.forEach(function (button, i) {
      button.disabled = true;
      if (i === correct) button.classList.add("correct");
      else if (i === chosen) button.classList.add("wrong");
    });

    setTimeout(next, 900);
  }

  function next() {
    state.index++;
    if (state.index < questionCount(state.quiz)) {
      renderQuestion();
    } else {
      finish();
    }
  }

  /* --- Ergebnis --- */

  async function finish() {
    var total = questionCount(state.quiz);
    var percent = Math.round((state.score / total) * 100);

    el("done-greeting").textContent = state.playerName + ", dein Ergebnis:";
    el("done-score").textContent = state.score + " / " + total;
    el("done-percent").textContent = percent + " % richtig";

    var review = el("done-review");
    review.innerHTML = "";
    state.answers.forEach(function (a, i) {
      var item = document.createElement("div");
      item.className = "review-item";

      var head = document.createElement("div");
      head.innerHTML = "<strong></strong>";
      head.querySelector("strong").textContent = (i + 1) + ". " + a.question;
      item.appendChild(head);

      var line = document.createElement("div");
      line.className = "muted";
      if (a.ok) {
        line.textContent = "✓ " + a.chosen;
        line.style.color = "var(--ok)";
      } else {
        line.textContent = "✗ " + a.chosen + "  –  richtig wäre: " + a.correct;
        line.style.color = "var(--bad)";
      }
      item.appendChild(line);

      review.appendChild(item);
    });

    show("screen-done");

    var saved = el("done-saved");
    saved.textContent = "Ergebnis wird gespeichert …";
    try {
      await Store.saveResult({
        quiz_id: state.quiz.id,
        quiz_title: state.quiz.title,
        player_name: state.playerName,
        score: state.score,
        total: total,
        answers: state.answers
      });
      saved.textContent = "Ergebnis gespeichert.";
    } catch (err) {
      saved.textContent = "Hinweis: Das Ergebnis konnte nicht gespeichert werden (" +
        (err.message || String(err)) + ").";
    }
  }

  el("btn-restart").addEventListener("click", function () {
    el("player-name").value = state.playerName;
    renderStart();
  });

  init();
})();
