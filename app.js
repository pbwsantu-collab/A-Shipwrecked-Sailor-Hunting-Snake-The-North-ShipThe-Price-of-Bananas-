/* Class IX English Interactive Reader – Enhanced Teaching Edition */
let currentKey = "north-ship";
let synth = window.speechSynthesis;
let showAllBn = false;
let currentMode = "read";
let currentPrac = "mcq";
let flashIndex = 0;
let flashFlipped = false;
let quizAnswers = {};
let progress = JSON.parse(localStorage.getItem("ix-progress") || "{}");

// ========== INIT ==========
document.addEventListener("DOMContentLoaded", () => {
  buildNav();
  loadLesson(currentKey);
  setupControls();
  setupTheme();
  setupInstall();
  setupModeTabs();
  setupPracticeTabs();
  setupFlash();
  applyFontSize();
  updateFooter();
});

function saveProgress() {
  localStorage.setItem("ix-progress", JSON.stringify(progress));
  updateFooter();
  updateProgressBar();
}

function ensureLessonProgress() {
  if (!progress[currentKey]) progress[currentKey] = { studied: [], quiz: null };
}

// ========== NAV ==========
function buildNav() {
  const nav = document.getElementById("lessonNav");
  nav.innerHTML = "";
  Object.keys(lessons).forEach(key => {
    const btn = document.createElement("button");
    btn.className = "lesson-tab" + (key === currentKey ? " active" : "");
    btn.textContent = lessons[key].title;
    btn.onclick = () => {
      document.querySelectorAll(".lesson-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentKey = key;
      stopSpeech();
      loadLesson(key);
    };
    nav.appendChild(btn);
  });
}

// ========== LOAD LESSON ==========
function loadLesson(key) {
  ensureLessonProgress();
  const L = lessons[key];
  document.getElementById("authorName").textContent = L.author;
  document.getElementById("authorBio").textContent = L.bio;
  document.getElementById("authorPhoto").textContent = L.initials;
  document.getElementById("criticalText").textContent = L.critical || "";
  document.getElementById("summaryText").textContent = L.summary || "Summary will appear here.";
  document.getElementById("themeText").textContent = L.theme || "Theme will appear here.";

  // Sentences
  const area = document.getElementById("contentArea");
  area.innerHTML = "";
  const studied = new Set(progress[key].studied || []);

  L.sentences.forEach((s, i) => {
    const div = document.createElement("div");
    div.className = "sentence" + (s.type === "poem" ? " poem" : "") + (studied.has(i) ? " studied" : "");
    div.dataset.index = i;
    div.innerHTML = `
      <div class="sentence-num">${i + 1}</div>
      <div class="sentence-body">
        <div class="sentence-text">${highlightWords(s.en, L.words)}</div>
        <div class="bn-meaning">${s.bn}</div>
      </div>
      <button class="mark-btn" title="Mark as studied">✓</button>
    `;
    div.querySelector(".sentence-body").onclick = () => toggleSentence(div, s.en);
    div.querySelector(".mark-btn").onclick = (e) => {
      e.stopPropagation();
      toggleStudied(i, div);
    };
    area.appendChild(div);
  });

  // Words
  const nest = document.getElementById("wordNest");
  nest.innerHTML = "";
  Object.entries(L.words || {}).forEach(([w, m]) => {
    const item = document.createElement("div");
    item.className = "word-item";
    item.innerHTML = `<strong>${w}</strong><span class="en">${m.en}</span><div class="bn">${m.bn}</div>`;
    item.onclick = () => speak(w);
    nest.appendChild(item);
  });

  // Practice
  renderPractice();
  // Flash
  flashIndex = 0;
  flashFlipped = false;
  renderFlash();
  updateProgressBar();
  showToast("Loaded: " + L.title);
}

function highlightWords(text, words) {
  if (!words) return text;
  let result = text;
  Object.keys(words).forEach(w => {
    const re = new RegExp(`\\b(${w})\\b`, "gi");
    result = result.replace(re, '<span class="hl-word" title="Important word">$1</span>');
  });
  return result;
}

function toggleStudied(i, div) {
  ensureLessonProgress();
  const arr = progress[currentKey].studied;
  const idx = arr.indexOf(i);
  if (idx >= 0) {
    arr.splice(idx, 1);
    div.classList.remove("studied");
  } else {
    arr.push(i);
    div.classList.add("studied");
  }
  saveProgress();
}

function updateProgressBar() {
  ensureLessonProgress();
  const total = lessons[currentKey].sentences.length;
  const done = (progress[currentKey].studied || []).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById("progressPct").textContent = pct + "%";
  document.getElementById("progressFill").style.width = pct + "%";
}

// ========== SPEECH ==========
function speak(text) {
  stopSpeech();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = parseFloat(document.getElementById("speedRange").value);
  u.lang = "en-IN";
  synth.speak(u);
}

function toggleSentence(div, text) {
  div.classList.toggle("show-bn");
  stopSpeech();
  document.querySelectorAll(".sentence").forEach(s => s.classList.remove("playing"));
  div.classList.add("playing");
  const u = new SpeechSynthesisUtterance(text);
  u.rate = parseFloat(document.getElementById("speedRange").value);
  u.lang = "en-IN";
  u.onend = () => div.classList.remove("playing");
  synth.speak(u);
}

function playAll() {
  stopSpeech();
  const sentences = lessons[currentKey].sentences;
  let i = 0;
  function speakNext() {
    if (i >= sentences.length) return;
    const divs = document.querySelectorAll(".sentence");
    divs.forEach(d => d.classList.remove("playing"));
    if (divs[i]) {
      divs[i].classList.add("playing");
      divs[i].scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const u = new SpeechSynthesisUtterance(sentences[i].en);
    u.rate = parseFloat(document.getElementById("speedRange").value);
    u.lang = "en-IN";
    u.onend = () => { i++; speakNext(); };
    synth.speak(u);
  }
  speakNext();
}

function stopSpeech() {
  synth.cancel();
  document.querySelectorAll(".sentence").forEach(s => s.classList.remove("playing"));
}

// ========== MODE TABS ==========
function setupModeTabs() {
  document.querySelectorAll(".mode-tab").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".mode-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentMode = btn.dataset.mode;
      document.querySelectorAll(".mode-panel").forEach(p => {
        p.classList.toggle("hidden", p.dataset.mode !== currentMode);
      });
      document.getElementById("readControls").classList.toggle("hidden", currentMode !== "read");
      document.getElementById("readHint").classList.toggle("hidden", currentMode !== "read");
      document.getElementById("progressWrap").classList.toggle("hidden", currentMode !== "read");
    };
  });
}

// ========== PRACTICE ==========
function setupPracticeTabs() {
  document.querySelectorAll(".prac-tab").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".prac-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentPrac = btn.dataset.prac;
      renderPractice();
    };
  });
  document.getElementById("resetQuiz").onclick = () => {
    quizAnswers = {};
    renderPractice();
    document.getElementById("scoreBox").classList.add("hidden");
  };
}

function renderPractice() {
  const L = lessons[currentKey];
  const prac = (L.practice || {})[currentPrac] || [];
  const box = document.getElementById("practiceContent");
  box.innerHTML = "";
  quizAnswers = {};

  if (!prac.length) {
    box.innerHTML = "<p class='panel-desc'>Practice questions will appear here.</p>";
    return;
  }

  if (currentPrac === "mcq") {
    prac.forEach((item, i) => {
      const div = document.createElement("div");
      div.className = "q-card";
      div.innerHTML = `<p class="q-text"><strong>Q${i + 1}.</strong> ${item.q}</p>`;
      const opts = document.createElement("div");
      opts.className = "opts";
      item.options.forEach((opt, j) => {
        const b = document.createElement("button");
        b.className = "opt-btn";
        b.textContent = opt;
        b.onclick = () => {
          if (quizAnswers[i] !== undefined) return;
          quizAnswers[i] = j;
          const correct = j === item.ans;
          b.classList.add(correct ? "correct" : "wrong");
          opts.querySelectorAll(".opt-btn").forEach((ob, k) => {
            ob.disabled = true;
            if (k === item.ans) ob.classList.add("correct");
          });
          checkQuizDone(prac.length);
        };
        opts.appendChild(b);
      });
      div.appendChild(opts);
      box.appendChild(div);
    });
  } else if (currentPrac === "tf") {
    prac.forEach((item, i) => {
      const div = document.createElement("div");
      div.className = "q-card";
      div.innerHTML = `<p class="q-text"><strong>Q${i + 1}.</strong> ${item.q}</p>`;
      const opts = document.createElement("div");
      opts.className = "opts tf-opts";
      ["True", "False"].forEach((label, j) => {
        const val = j === 0;
        const b = document.createElement("button");
        b.className = "opt-btn";
        b.textContent = label;
        b.onclick = () => {
          if (quizAnswers[i] !== undefined) return;
          quizAnswers[i] = val;
          const correct = val === item.ans;
          b.classList.add(correct ? "correct" : "wrong");
          opts.querySelectorAll(".opt-btn").forEach(ob => ob.disabled = true);
          if (!correct) {
            opts.querySelectorAll(".opt-btn")[item.ans ? 0 : 1].classList.add("correct");
          }
          checkQuizDone(prac.length);
        };
        opts.appendChild(b);
      });
      div.appendChild(opts);
      box.appendChild(div);
    });
  } else if (currentPrac === "fill") {
    prac.forEach((item, i) => {
      const div = document.createElement("div");
      div.className = "q-card";
      const parts = item.q.split("______");
      div.innerHTML = `<p class="q-text"><strong>Q${i + 1}.</strong> ${parts[0]}<input type="text" class="fill-input" data-i="${i}" placeholder="?" />${parts[1] || ""}</p>`;
      const check = document.createElement("button");
      check.className = "ctrl-btn";
      check.textContent = "Check";
      check.onclick = () => {
        const input = div.querySelector("input");
        if (quizAnswers[i] !== undefined) return;
        const user = input.value.trim().toLowerCase();
        const correct = user === item.ans.toLowerCase();
        quizAnswers[i] = correct;
        input.classList.add(correct ? "correct" : "wrong");
        input.disabled = true;
        if (!correct) {
          const hint = document.createElement("span");
          hint.className = "fill-hint";
          hint.textContent = " → " + item.ans;
          div.querySelector(".q-text").appendChild(hint);
        }
        checkQuizDone(prac.length);
      };
      div.appendChild(check);
      box.appendChild(div);
    });
  }
}

function checkQuizDone(total) {
  if (Object.keys(quizAnswers).length < total) return;
  let correct = 0;
  if (currentPrac === "mcq") {
    const items = lessons[currentKey].practice.mcq;
    Object.entries(quizAnswers).forEach(([i, ans]) => { if (ans === items[i].ans) correct++; });
  } else if (currentPrac === "tf") {
    const items = lessons[currentKey].practice.tf;
    Object.entries(quizAnswers).forEach(([i, ans]) => { if (ans === items[i].ans) correct++; });
  } else {
    Object.values(quizAnswers).forEach(v => { if (v === true) correct++; });
  }
  const score = `${correct}/${total}`;
  document.getElementById("scoreText").textContent = `Score: ${score} (${Math.round(correct / total * 100)}%)`;
  document.getElementById("scoreBox").classList.remove("hidden");
  ensureLessonProgress();
  progress[currentKey].quiz = score;
  saveProgress();
  showToast(`Quiz finished: ${score}`);
}

// ========== FLASHCARDS ==========
function setupFlash() {
  document.getElementById("flashNext").onclick = () => { flashIndex++; flashFlipped = false; renderFlash(); };
  document.getElementById("flashPrev").onclick = () => { flashIndex = Math.max(0, flashIndex - 1); flashFlipped = false; renderFlash(); };
  document.getElementById("flashFlip").onclick = () => { flashFlipped = !flashFlipped; renderFlash(); };
  document.getElementById("flashCard").onclick = () => { flashFlipped = !flashFlipped; renderFlash(); };
}

function renderFlash() {
  const words = Object.entries(lessons[currentKey].words || {});
  if (!words.length) {
    document.getElementById("flashFront").textContent = "No words for this lesson";
    document.getElementById("flashBack").classList.add("hidden");
    document.getElementById("flashCounter").textContent = "0 / 0";
    return;
  }
  if (flashIndex >= words.length) flashIndex = 0;
  if (flashIndex < 0) flashIndex = words.length - 1;
  const [w, m] = words[flashIndex];
  const front = document.getElementById("flashFront");
  const back = document.getElementById("flashBack");
  if (!flashFlipped) {
    front.textContent = w;
    front.classList.remove("hidden");
    back.classList.add("hidden");
  } else {
    front.classList.add("hidden");
    back.innerHTML = `<div class="en">${m.en}</div><div class="bn">${m.bn}</div>`;
    back.classList.remove("hidden");
    speak(w);
  }
  document.getElementById("flashCounter").textContent = `${flashIndex + 1} / ${words.length}`;
}

// ========== CONTROLS ==========
function setupControls() {
  document.getElementById("playBtn").onclick = playAll;
  document.getElementById("pauseBtn").onclick = () => { if (synth.speaking) synth.pause(); };
  document.getElementById("stopBtn").onclick = stopSpeech;
  document.getElementById("speedRange").oninput = e => {
    document.getElementById("speedValue").textContent = e.target.value + "x";
  };
  document.getElementById("bnAllBtn").onclick = () => {
    showAllBn = !showAllBn;
    document.getElementById("bnAllBtn").textContent = showAllBn ? "🇮🇳 Hide All Bengali" : "🇮🇳 Show All Bengali";
    document.querySelectorAll(".sentence").forEach(s => s.classList.toggle("show-bn", showAllBn));
  };
  document.getElementById("themeToggle").onclick = toggleTheme;
  document.getElementById("fontUp").onclick = () => changeFont(1);
  document.getElementById("fontDown").onclick = () => changeFont(-1);
  document.getElementById("resetProgress").onclick = () => {
    if (confirm("Reset all reading progress and quiz scores?")) {
      progress = {};
      saveProgress();
      loadLesson(currentKey);
      showToast("Progress reset");
    }
  };
}

function changeFont(dir) {
  const cur = parseInt(localStorage.getItem("ix-font") || "16", 10);
  const next = Math.min(22, Math.max(14, cur + dir));
  localStorage.setItem("ix-font", next);
  applyFontSize();
}

function applyFontSize() {
  const size = localStorage.getItem("ix-font") || "16";
  document.documentElement.style.setProperty("--base-font", size + "px");
}

function setupTheme() {
  const saved = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme");
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
}

let deferredPrompt;
function setupInstall() {
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById("installBtn").classList.remove("hidden");
  });
  document.getElementById("installBtn").onclick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt = null;
      document.getElementById("installBtn").classList.add("hidden");
    }
  };
}

function updateFooter() {
  let totalStudied = 0;
  Object.values(progress).forEach(p => { totalStudied += (p.studied || []).length; });
  document.getElementById("statStudied").textContent = totalStudied;
  const last = progress[currentKey]?.quiz;
  document.getElementById("statScore").textContent = last || "—";
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 2200);
}
