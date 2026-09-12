/* Logic only - data is in data.js */
// ========== STATE ==========
let currentKey = "north-ship";
let synth = window.speechSynthesis;
let showAllBn = false;

// ========== INIT ==========
document.addEventListener("DOMContentLoaded", () => {
  buildNav();
  loadLesson(currentKey);
  setupControls();
  setupTheme();
  setupInstall();
});

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

function loadLesson(key) {
  const L = lessons[key];
  document.getElementById("authorName").textContent = L.author;
  document.getElementById("authorBio").textContent = L.bio;
  document.getElementById("authorPhoto").textContent = L.initials;
  document.getElementById("criticalText").textContent = L.critical;

  const area = document.getElementById("contentArea");
  area.innerHTML = "";

  L.sentences.forEach((s, i) => {
    const div = document.createElement("div");
    div.className = "sentence" + (s.type === "poem" ? " poem" : "");
    div.dataset.index = i;
    div.innerHTML = `
      <div class="sentence-text">${s.en}</div>
      <div class="bn-meaning">${s.bn}</div>
    `;
    div.onclick = () => toggleSentence(div, s.en);
    area.appendChild(div);
  });

  const nest = document.getElementById("wordNest");
  nest.innerHTML = "";
  Object.entries(L.words).forEach(([w, m]) => {
    const item = document.createElement("div");
    item.className = "word-item";
    item.innerHTML = `<strong>${w}</strong>${m.en}<div class="bn">${m.bn}</div>`;
    nest.appendChild(item);
  });

  if (showAllBn) {
    document.querySelectorAll(".sentence").forEach(s => s.classList.add("show-bn"));
  }
  showToast("Loaded: " + L.title + " (" + L.sentences.length + " lines)");
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
    document.querySelectorAll(".sentence").forEach(s => {
      s.classList.toggle("show-bn", showAllBn);
    });
  };
  document.getElementById("themeToggle").onclick = toggleTheme;
}

function playAll() {
  stopSpeech();
  const sentences = lessons[currentKey].sentences;
  let i = 0;

  function speakNext() {
    if (i >= sentences.length) return;
    const divs = document.querySelectorAll(".sentence");
    divs.forEach(d => d.classList.remove("playing"));
    if (divs[i]) divs[i].classList.add("playing");

    const u = new SpeechSynthesisUtterance(sentences[i].en);
    u.rate = parseFloat(document.getElementById("speedRange").value);
    u.lang = "en-IN";
    u.onend = () => {
      i++;
      speakNext();
    };
    synth.speak(u);
  }
  speakNext();
}

function stopSpeech() {
  synth.cancel();
  document.querySelectorAll(".sentence").forEach(s => s.classList.remove("playing"));
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

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 2000);
}
