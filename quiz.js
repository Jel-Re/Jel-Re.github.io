const fragen = [
  {
    frage: "In welchem Land liegt Québec?",
    antworten: ["Kanada", "USA", "Frankreich", "Belgien"],
    richtig: 0,
    info: "Québec ist eine der zehn Provinzen Kanadas."
  },
  {
    frage: "Wie heißt die Hauptstadt der Provinz Québec?",
    antworten: ["Montréal", "Ottawa", "Québec", "Toronto"],
    richtig: 2,
    info: "Die Provinz und ihre Hauptstadt tragen denselben Namen."
  },
  {
    frage: "Welche Stadt ist die größte der Provinz?",
    antworten: ["Montréal", "Laval", "Gatineau", "Sherbrooke"],
    richtig: 0,
    info: "Montréal ist mit rund 1,8 Millionen Einwohnern die größte Stadt Québecs."
  },
  {
    frage: "Was ist die einzige Amtssprache Québecs?",
    antworten: ["Englisch", "Französisch", "Beide gleichberechtigt", "Inuktitut"],
    richtig: 1,
    info: "Seit 1977 ist Französisch per Charta der französischen Sprache alleinige Amtssprache."
  },
  {
    frage: "Welcher große Strom durchfließt die Provinz?",
    antworten: ["Mackenzie", "Yukon", "Sankt-Lorenz-Strom", "Fraser"],
    richtig: 2,
    info: "Der Sankt-Lorenz-Strom (Fleuve Saint-Laurent) verbindet die Großen Seen mit dem Atlantik."
  },
  {
    frage: "Wie lautet der Wahlspruch Québecs auf den Nummernschildern?",
    antworten: ["Je me souviens", "Liberté toujours", "Vive le Québec", "La belle province"],
    richtig: 0,
    info: "„Je me souviens“ heißt „Ich erinnere mich“."
  },
  {
    frage: "Wer gründete 1608 die Stadt Québec?",
    antworten: ["Jacques Cartier", "Samuel de Champlain", "Louis Riel", "Jean Talon"],
    richtig: 1,
    info: "Samuel de Champlain legte den Grundstein für die Siedlung am Sankt-Lorenz-Strom."
  },
  {
    frage: "An welchem Tag wird der Nationalfeiertag Québecs gefeiert?",
    antworten: ["1. Juli", "24. Juni", "14. Juli", "11. November"],
    richtig: 1,
    info: "Am 24. Juni, der Fête nationale bzw. Saint-Jean-Baptiste."
  },
  {
    frage: "Welches Gericht stammt aus Québec?",
    antworten: ["Poutine", "Bagel Bites", "Chili con carne", "Clam Chowder"],
    richtig: 0,
    info: "Poutine: Pommes mit Käsebruch und Bratensoße."
  },
  {
    frage: "Wofür ist Québec weltweit führend?",
    antworten: ["Kaffeeanbau", "Ahornsirup", "Olivenöl", "Reisanbau"],
    richtig: 1,
    info: "Québec produziert den weitaus größten Teil des weltweiten Ahornsirups."
  }
];

const el = {
  start: document.getElementById("start"),
  quiz: document.getElementById("quiz"),
  result: document.getElementById("result"),
  startBtn: document.getElementById("start-btn"),
  nextBtn: document.getElementById("next-btn"),
  restartBtn: document.getElementById("restart-btn"),
  counter: document.getElementById("counter"),
  barFill: document.getElementById("bar-fill"),
  frage: document.getElementById("question"),
  antworten: document.getElementById("answers"),
  feedback: document.getElementById("feedback"),
  score: document.getElementById("score"),
  total: document.getElementById("total"),
  verdict: document.getElementById("verdict")
};

let index = 0;
let punkte = 0;

function zeige(screen) {
  [el.start, el.quiz, el.result].forEach(s => s.classList.add("hidden"));
  screen.classList.remove("hidden");
}

function starten() {
  index = 0;
  punkte = 0;
  zeige(el.quiz);
  frageAnzeigen();
}

function frageAnzeigen() {
  const f = fragen[index];

  el.counter.textContent = `Frage ${index + 1} von ${fragen.length}`;
  el.barFill.style.width = `${(index / fragen.length) * 100}%`;
  el.frage.textContent = f.frage;
  el.feedback.textContent = "";
  el.feedback.className = "feedback";
  el.nextBtn.classList.add("hidden");
  el.nextBtn.textContent = index === fragen.length - 1 ? "Ergebnis anzeigen" : "Weiter";
  el.antworten.innerHTML = "";

  f.antworten.forEach((text, i) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.addEventListener("click", () => antworten(i));
    li.appendChild(btn);
    el.antworten.appendChild(li);
  });
}

function antworten(gewaehlt) {
  const f = fragen[index];
  const buttons = el.antworten.querySelectorAll("button");

  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === f.richtig) btn.classList.add("richtig");
    else if (i === gewaehlt) btn.classList.add("falsch");
  });

  if (gewaehlt === f.richtig) {
    punkte++;
    el.feedback.textContent = `Richtig! ${f.info}`;
    el.feedback.classList.add("richtig");
  } else {
    el.feedback.textContent = `Leider falsch. ${f.info}`;
    el.feedback.classList.add("falsch");
  }

  el.nextBtn.classList.remove("hidden");
}

function weiter() {
  index++;
  if (index < fragen.length) {
    frageAnzeigen();
  } else {
    ergebnisAnzeigen();
  }
}

function ergebnisAnzeigen() {
  el.score.textContent = punkte;
  el.total.textContent = fragen.length;

  if (punkte === fragen.length) {
    el.verdict.textContent = "Perfekt! Du bist ein echter Québec-Profi. ⚜";
  } else if (punkte >= fragen.length * 0.7) {
    el.verdict.textContent = "Stark! Du kennst dich gut aus.";
  } else if (punkte >= fragen.length * 0.4) {
    el.verdict.textContent = "Solide Grundlage – da geht noch mehr.";
  } else {
    el.verdict.textContent = "Zeit für eine Reise nach Montréal!";
  }

  zeige(el.result);
}

el.startBtn.addEventListener("click", starten);
el.nextBtn.addEventListener("click", weiter);
el.restartBtn.addEventListener("click", starten);
