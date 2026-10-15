import {
  GameSession,
  clamp,
  shuffle,
  escapeHTML,
  difficultyValue,
} from "../js/game-kit.js";

// All patient profiles and findings are deliberately fictional game cases.
const PATIENTS = [
  {
    name: "Миша",
    age: 5,
    toy: "dino",
    hair: "#754b37",
    shirt: "#67b7e8",
    complaint:
      "Весь день строил космодром. Теперь устал и не хочет разговаривать.",
    symptom: "сонливость",
    temp: "36.7",
    pulse: "ровный",
    pattern: "Переутомление",
    clue: "После отдыха становится бодрее.",
    fear: 48,
  },
  {
    name: "София",
    age: 7,
    toy: "star",
    hair: "#cc934d",
    shirt: "#c4a1f3",
    complaint:
      "После прогулки чешется нос. Хочет, чтобы всё объяснили заранее.",
    symptom: "чихание",
    temp: "36.6",
    pulse: "ровный",
    pattern: "Сезонная реакция",
    clue: "Самочувствие меняется после прогулки в парке.",
    fear: 54,
  },
  {
    name: "Артём",
    age: 6,
    toy: "ball",
    hair: "#583c35",
    shirt: "#f2ad70",
    complaint:
      "Пришёл после школьной эстафеты. Очень волнуется из-за приборов.",
    symptom: "жажда",
    temp: "36.8",
    pulse: "учащённый",
    pattern: "Усталость после игры",
    clue: "Недавно много бегал и почти не отдыхал.",
    fear: 62,
  },
  {
    name: "Алиса",
    age: 4,
    toy: "star",
    hair: "#b45c38",
    shirt: "#f4a5c3",
    complaint:
      "Не хочет отпускать руку родителя и боится незнакомого кабинета.",
    symptom: "волнение",
    temp: "36.5",
    pulse: "учащённый",
    pattern: "Волнение на приёме",
    clue: "Во время игры показатели приходят в норму.",
    fear: 78,
  },
  {
    name: "Тимур",
    age: 8,
    toy: "dino",
    hair: "#383946",
    shirt: "#7ec8a6",
    complaint: "Говорит, что горло першит после очень громкого спектакля.",
    symptom: "осиплость",
    temp: "36.6",
    pulse: "ровный",
    pattern: "Голосовая нагрузка",
    clue: "Вчера играл дракона на школьной сцене.",
    fear: 40,
  },
  {
    name: "Полина",
    age: 5,
    toy: "ball",
    hair: "#b18b55",
    shirt: "#eabd6b",
    complaint: "Хочет спать: вчера долго наблюдала за звёздами.",
    symptom: "сонливость",
    temp: "36.7",
    pulse: "ровный",
    pattern: "Переутомление",
    clue: "Легла поздно, а утром рано проснулась.",
    fear: 52,
  },
  {
    name: "Даниил",
    age: 9,
    toy: "ball",
    hair: "#5d453a",
    shirt: "#7daaf1",
    complaint:
      "Устал после репетиции танцев. Любит, когда с ним говорят как со взрослым.",
    symptom: "жажда",
    temp: "36.8",
    pulse: "учащённый",
    pattern: "Усталость после игры",
    clue: "Несколько часов танцевал без перерыва.",
    fear: 37,
  },
  {
    name: "Ева",
    age: 6,
    toy: "star",
    hair: "#8d593e",
    shirt: "#b6a0ed",
    complaint: "Боится стетоскопа: думает, что он щекочется.",
    symptom: "волнение",
    temp: "36.6",
    pulse: "учащённый",
    pattern: "Волнение на приёме",
    clue: "Улыбается, когда прибор сначала показывают игрушке.",
    fear: 70,
  },
  {
    name: "Марк",
    age: 7,
    toy: "dino",
    hair: "#423f39",
    shirt: "#81c5cc",
    complaint: "После прогулки у цветочной клумбы стал часто чихать.",
    symptom: "чихание",
    temp: "36.5",
    pulse: "ровный",
    pattern: "Сезонная реакция",
    clue: "Дома чувствует себя лучше, чем возле цветов.",
    fear: 47,
  },
  {
    name: "Варя",
    age: 4,
    toy: "star",
    hair: "#ae7145",
    shirt: "#ed99b6",
    complaint: "Спряталась за игрушкой. Просит не торопиться.",
    symptom: "волнение",
    temp: "36.6",
    pulse: "учащённый",
    pattern: "Волнение на приёме",
    clue: "Показатели меняются вместе с настроением.",
    fear: 82,
  },
  {
    name: "Лев",
    age: 8,
    toy: "dino",
    hair: "#766045",
    shirt: "#9abd75",
    complaint: "Показывал друзьям, как рычит динозавр, и теперь говорит тихо.",
    symptom: "осиплость",
    temp: "36.6",
    pulse: "ровный",
    pattern: "Голосовая нагрузка",
    clue: "Никаких других жалоб, только охрипший голос.",
    fear: 42,
  },
  {
    name: "Кира",
    age: 6,
    toy: "ball",
    hair: "#59443c",
    shirt: "#c98cdd",
    complaint: "После большого праздника хочет тишины и немного отдохнуть.",
    symptom: "сонливость",
    temp: "36.7",
    pulse: "ровный",
    pattern: "Переутомление",
    clue: "Целый день провела на шумном празднике.",
    fear: 61,
  },
];
const TOYS = {
  dino: { icon: "🦕", name: "динозавр" },
  star: { icon: "⭐", name: "звезда" },
  ball: { icon: "🏀", name: "мяч" },
};
const DIALOGUES = [
  [
    {
      text: "Сначала покажу прибор на игрушке. Ты решаешь, когда начнём.",
      good: true,
    },
    { text: "Пожалуйста, сиди тихо. У нас мало времени.", good: false },
    { text: "Ничего не объясню — так будет быстрее.", good: false },
  ],
  [
    { text: "Вижу, что ты волнуешься. Давай сделаем всё вместе.", good: true },
    { text: "Большие дети вообще не волнуются.", good: false },
    { text: "Не будем разговаривать, просто начнём.", good: false },
  ],
  [
    { text: "Хочешь выбрать игрушку и послушать её сердечко?", good: true },
    { text: "Игрушки подождут до конца приёма.", good: false },
    { text: "Нужно перестать бояться прямо сейчас.", good: false },
  ],
];

function avatar(patient, mood) {
  const smile =
    mood === "happy"
      ? "M76 100 Q90 114 104 100"
      : mood === "worried"
        ? "M78 108 Q90 97 102 108"
        : "M80 104 Q90 109 100 104";
  return `<svg viewBox="0 0 180 245" class="care-avatar" aria-hidden="true"><ellipse cx="90" cy="236" rx="64" ry="9" fill="#193046" opacity=".15"/><path d="M58 192L54 229Q63 239 77 231L83 193M101 193L105 231Q120 239 127 229L121 190" fill="#6d82af"/><path d="M53 131Q32 142 28 187Q32 200 45 192L58 164M125 131Q146 142 152 187Q149 200 136 192L122 164" fill="#f1c6ab"/><path d="M57 127Q90 115 123 127L132 197Q90 211 48 197Z" fill="${patient.shirt}"/><path d="M74 126Q90 145 106 126" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="5"/><circle cx="90" cy="77" r="49" fill="#f1c6ab"/><path d="M41 75Q34 15 89 18Q148 13 139 76L126 50Q97 56 76 37Q62 61 43 62Z" fill="${patient.hair}"/><path d="M39 79Q27 73 33 92L44 98M141 79Q153 73 147 92L137 98" fill="#f1c6ab"/><ellipse cx="73" cy="82" rx="4" ry="5" fill="#3f3c48"/><ellipse cx="108" cy="82" rx="4" ry="5" fill="#3f3c48"/><path d="M67 69L79 67M103 67L115 69" stroke="${patient.hair}" stroke-width="3" stroke-linecap="round"/><circle cx="62" cy="96" r="8" fill="#e99898" opacity=".4"/><circle cx="119" cy="96" r="8" fill="#e99898" opacity=".4"/><path d="${smile}" fill="none" stroke="#a65e5b" stroke-width="3" stroke-linecap="round"/><path d="M70 166Q90 181 110 166" stroke="#fff" stroke-width="3" stroke-opacity=".3" fill="none"/></svg>`;
}

export async function mount(ctx) {
  const count = difficultyValue(ctx.difficulty, 4, 5, 6);
  const initial = {
    deck: shuffle(PATIENTS.map((_, i) => i)).slice(0, count),
    round: 0,
    stage: "dialogue",
    trust: 24,
    fear: 60,
    fatigue: 8,
    dialogue: 0,
    bubbles: [],
    bubbleStep: 0,
    examIndex: 0,
    findings: [],
    quality: [],
    summary: [],
    done: false,
  };
  const g = new GameSession(ctx, {
    title: "Маленькие пациенты",
    subtitle: "Педиатр · доверие и забота",
    duration: difficultyValue(ctx.difficulty, 360, 390, 420),
    state: initial,
  });
  const s = g.state;
  let stopped = false;
  let hold = null;
  let holdRaf = 0;
  let dragging = null;
  let nextTimer = null;
  const patient = () => PATIENTS[s.deck[s.round]];
  const tools = [
    { id: "thermometer", name: "Термометр", icon: "🌡️", target: "forehead" },
    { id: "stethoscope", name: "Стетоскоп", icon: "🩺", target: "chest" },
    { id: "pulse", name: "Датчик пульса", icon: "💗", target: "hand" },
  ];
  const persist = () => g.save();

  function stopHold() {
    if (holdRaf) cancelAnimationFrame(holdRaf);
    holdRaf = 0;
    hold = null;
    const meter = g.scene.querySelector(".care-hold-fill");
    if (meter) meter.style.width = "0%";
  }

  function draw() {
    if (stopped || s.done) return;
    stopHold();
    const p = patient();
    const mood = s.trust >= 65 ? "happy" : s.fear > 55 ? "worried" : "calm";
    const steps = ["dialogue", "toy", "soothe", "exam", "conclusion"];
    g.setProgress(
      (s.round + Math.max(0, steps.indexOf(s.stage)) / steps.length) /
        s.deck.length,
    );
    g.setMetric("Доверие", `${Math.round(s.trust)}%`);
    g.scene.className = "game-scene care-scene";
    g.scene.dataset.stage = s.stage;
    g.scene.innerHTML = `<div class="care-room"><div class="care-room-window"><i></i><i></i><span>✧</span></div><div class="care-room-cloud">☁</div><div class="care-room-poster">${TOYS[p.toy].icon}<small>КАБИНЕТ ДОБРЫХ ДЕЛ</small></div><div class="care-room-shelf"><span>🧸</span><span>📚</span><span>🌱</span></div><div class="care-room-floor"></div><div class="care-patient-seat"></div><div class="care-child ${mood}" aria-label="${escapeHTML(p.name)}, ${escapeHTML(mood === "happy" ? "спокоен" : mood === "worried" ? "волнуется" : "слушает")}">${avatar(p, mood)}<div class="care-given-toy">${s.stage !== "dialogue" && s.stage !== "toy" ? TOYS[p.toy].icon : ""}</div></div><div class="care-bubble"><strong>${escapeHTML(p.name)}, ${p.age} лет</strong><span>${escapeHTML(s.stage === "dialogue" ? p.complaint : s.stage === "toy" ? `Мне нравится ${TOYS[p.toy].name}. Можно поиграть?` : s.stage === "soothe" ? "Давай ловить светлячков по порядку!" : s.stage === "exam" ? "Теперь я готов. Покажи, куда приложить прибор." : p.clue)}</span></div><div class="care-round-label">ПРИЁМ ${s.round + 1} / ${s.deck.length}</div></div><div class="care-emotions"><div><span>♡ Доверие</span><b>${Math.round(s.trust)}%</b><i style="--care-level:${s.trust}%;--care-meter:#72ddb8"></i></div><div><span>☁ Страх</span><b>${Math.round(s.fear)}%</b><i style="--care-level:${s.fear}%;--care-meter:#eab88a"></i></div><div><span>☾ Усталость</span><b>${Math.round(s.fatigue)}%</b><i style="--care-level:${s.fatigue}%;--care-meter:#b8a3ec"></i></div></div><div class="care-interaction"></div>`;
    g.controls.replaceChildren();
    const interaction = g.scene.querySelector(".care-interaction");
    if (s.stage === "dialogue") renderDialogue(interaction);
    else if (s.stage === "toy") renderToy(interaction);
    else if (s.stage === "soothe") renderSoothe(interaction);
    else if (s.stage === "exam") renderExam(interaction);
    else renderConclusion(interaction);
  }

  function renderDialogue(interaction) {
    g.setObjective(`Познакомьтесь с пациентом · ${s.dialogue + 1} / 2`);
    g.hint.textContent =
      "Выберите реплику, которая даёт ребёнку чувство безопасности. Наблюдайте за эмоциями.";
    const choices =
      s.dialogue === 0
        ? DIALOGUES[s.deck[s.round] % DIALOGUES.length]
        : [
            {
              text: `Давай выберем игрушку. Вижу, тебе нравится ${TOYS[patient().toy].name}.`,
              good: true,
            },
            { text: "Если будешь спорить, игрушки не получишь.", good: false },
            { text: "Сначала всё сделаем, а вопросы потом.", good: false },
          ];
    interaction.innerHTML =
      '<div class="care-step-label">ДОБРОЕ ЗНАКОМСТВО</div>';
    const choiceOrder = shuffle(choices);
    for (const choice of choiceOrder) {
      const b = g.button(
        choice.text,
        () => {
          if (choice.good) {
            s.trust = clamp(s.trust + 19, 0, 100);
            s.fear = clamp(s.fear - 17, 0, 100);
            g.hit();
            g.feedback("Ребёнок почувствовал поддержку.");
          } else {
            s.trust = clamp(s.trust - 9, 0, 100);
            s.fear = clamp(s.fear + 12, 0, 100);
            g.miss("Эта реплика усилила тревогу. Попробуйте говорить мягче.");
          }
          s.dialogue++;
          if (s.dialogue >= 2) s.stage = "toy";
          persist();
          draw();
        },
        "care-dialogue",
      );
      interaction.append(b);
    }
  }

  function renderToy(interaction) {
    g.setObjective("Подберите игрушку и передайте её ребёнку");
    g.hint.textContent =
      "Перетащите подходящую игрушку на ребёнка. Можно выбрать игрушку и затем нажать на ребёнка.";
    interaction.innerHTML =
      '<div class="care-step-label">ПОДАРИТЕ НЕМНОГО СМЕЛОСТИ</div><div class="care-toys" role="group" aria-label="Игрушки"></div>';
    const shelf = interaction.querySelector(".care-toys");
    const child = g.scene.querySelector(".care-child");
    child.classList.add("care-drop-zone");
    child.tabIndex = 0;
    child.setAttribute("role", "button");
    child.setAttribute("aria-label", "Передать выбранную игрушку ребёнку");
    let selected = null;
    const give = (id) => {
      if (s.stage !== "toy") return;
      if (id !== patient().toy) {
        s.fear = clamp(s.fear + 4, 0, 100);
        g.miss(
          "Пациент просил другую игрушку. Внимательно прочитайте реплику.",
        );
        persist();
        draw();
        return;
      }
      s.trust = clamp(s.trust + 18, 0, 100);
      s.fear = clamp(s.fear - 15, 0, 100);
      s.stage = "soothe";
      s.bubbles = createBubbles();
      s.bubbleStep = 0;
      g.hit();
      g.feedback("Игрушка помогла наладить контакт.");
      persist();
      draw();
    };
    for (const [id, toy] of Object.entries(TOYS)) {
      const b = document.createElement("button");
      b.className = "care-toy";
      b.type = "button";
      b.innerHTML = `<span>${toy.icon}</span><small>${toy.name}</small>`;
      b.setAttribute("aria-label", `Выбрать игрушку: ${toy.name}`);
      b.addEventListener("click", () => {
        selected = id;
        shelf
          .querySelectorAll("button")
          .forEach((x) => x.classList.toggle("selected", x === b));
      });
      b.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        selected = id;
        b.setPointerCapture(e.pointerId);
        dragging = {
          id,
          pointer: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          moved: false,
        };
        b.classList.add("dragging");
      });
      b.addEventListener("pointermove", (e) => {
        if (!dragging || dragging.pointer !== e.pointerId) return;
        const x = e.clientX - dragging.startX,
          y = e.clientY - dragging.startY;
        if (Math.hypot(x, y) > 5) dragging.moved = true;
        b.style.transform = `translate(${x}px,${y}px) scale(1.1)`;
        const r = child.getBoundingClientRect();
        child.classList.toggle(
          "care-drop-hover",
          e.clientX >= r.left &&
            e.clientX <= r.right &&
            e.clientY >= r.top &&
            e.clientY <= r.bottom,
        );
      });
      b.addEventListener("pointerup", (e) => {
        if (!dragging || dragging.pointer !== e.pointerId) return;
        const wasMoved = dragging.moved;
        dragging = null;
        b.classList.remove("dragging");
        b.style.transform = "";
        child.classList.remove("care-drop-hover");
        const r = child.getBoundingClientRect();
        if (
          wasMoved &&
          e.clientX >= r.left &&
          e.clientX <= r.right &&
          e.clientY >= r.top &&
          e.clientY <= r.bottom
        )
          give(id);
        else {
          shelf
            .querySelectorAll("button")
            .forEach((x) => x.classList.toggle("selected", x === b));
        }
      });
      b.addEventListener("pointercancel", () => {
        dragging = null;
        b.classList.remove("dragging");
        b.style.transform = "";
      });
      shelf.append(b);
    }
    child.addEventListener("click", () => {
      if (selected) give(selected);
      else g.feedback("Сначала выберите игрушку.", false);
    });
    child.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (selected) give(selected);
      }
    });
  }

  function createBubbles() {
    const n = difficultyValue(ctx.difficulty, 8, 10, 12);
    const cells = shuffle(Array.from({ length: 15 }, (_, i) => i)).slice(0, n);
    return cells.map((cell, i) => ({
      x: 10 + (cell % 5) * 19 + (Math.random() * 4 - 2),
      y: 20 + Math.floor(cell / 5) * 28 + (Math.random() * 4 - 2),
      n: i + 1,
    }));
  }

  function renderSoothe(interaction) {
    g.setObjective(
      `Игра на доверие · светлячок ${Math.min(s.bubbleStep + 1, s.bubbles.length)} / ${s.bubbles.length}`,
    );
    g.hint.textContent =
      "Ловите светлячков по возрастанию номеров. Ошибки пугают ребёнка; действуйте спокойно и точно.";
    interaction.innerHTML = `<div class="care-step-label">СВЕТЛЯЧКИ СПОКОЙСТВИЯ <span>${s.bubbleStep}/${s.bubbles.length}</span></div><div class="care-firefly-field" aria-label="Поймайте светлячков по порядку"></div>`;
    const field = interaction.querySelector(".care-firefly-field");
    for (const bubble of s.bubbles) {
      if (bubble.n <= s.bubbleStep) continue;
      const b = document.createElement("button");
      b.className = `care-firefly${bubble.n === s.bubbleStep + 1 && ctx.difficulty !== "hard" ? " next" : ""}`;
      b.type = "button";
      b.style.left = `${bubble.x}%`;
      b.style.top = `${bubble.y}%`;
      b.textContent = bubble.n;
      b.setAttribute("aria-label", `Светлячок ${bubble.n}`);
      b.addEventListener("click", () => {
        if (bubble.n !== s.bubbleStep + 1) {
          s.fear = clamp(s.fear + 3, 0, 100);
          g.miss(`Сейчас нужен светлячок ${s.bubbleStep + 1}.`);
          persist();
          return;
        }
        s.bubbleStep++;
        s.trust = clamp(s.trust + 2, 0, 100);
        s.fear = clamp(s.fear - 3, 0, 100);
        g.hit();
        ctx.audio.play("tap");
        if (s.bubbleStep >= s.bubbles.length) {
          s.stage = "exam";
          s.examIndex = 0;
          g.feedback("Пациент успокоился и готов к осмотру.");
        }
        persist();
        draw();
      });
      field.append(b);
    }
  }

  function renderExam(interaction) {
    const tool = tools[s.examIndex];
    g.setObjective(`Осмотр · ${tool.name} · ${s.examIndex + 1} / ${tools.length}`);
    g.hint.textContent = 'Выберите прибор. Затем удерживайте подсвеченную область на пациенте, пока круг не заполнится. Клавиатура: удерживайте пробел.';
    interaction.innerHTML = `<div class="care-step-label">БЕРЕЖНЫЙ ОСМОТР</div><div class="care-instruments"></div><div class="care-hold-meter"><i class="care-hold-fill"></i><span>Удерживайте область осмотра</span></div><div class="care-findings">${s.findings.map(f => `<span>${escapeHTML(f)}</span>`).join('')}</div>`;
    const toolbar = interaction.querySelector('.care-instruments');
    let selected = null;
    for (const t of tools) {
      let lastTouch = -Infinity;
      const activate = () => {
        if (t.id !== tool.id) {
          s.fatigue = clamp(s.fatigue + 4, 0, 100);
          g.miss('Сначала используйте прибор, указанный в задании.'); persist(); return;
        }
        selected = t.id;
        toolbar.querySelectorAll('button').forEach(x => x.classList.toggle('selected', x === b));
        target.classList.add('ready'); ctx.audio.play('tap');
      };
      const b = g.button(`${t.icon} ${t.name}`, () => {
        if (performance.now() - lastTouch >= 600) activate();
      }, 'care-instrument');
      // Selecting a tool happens immediately on touch. Do not let a following
      // precise gesture cancel the browser's delayed compatibility click.
      b.addEventListener('pointerdown', e => {
        if (e.pointerType === 'touch' || e.pointerType === 'pen') {
          e.preventDefault(); lastTouch = performance.now(); activate();
        }
      });
      toolbar.append(b);
    }
    const target = document.createElement('button');
    target.className = `care-exam-target ${tool.target}`; target.type = 'button';
    target.innerHTML = `<span>${tool.icon}</span><svg viewBox="0 0 60 60" aria-hidden="true"><circle class="care-hold-ring" cx="30" cy="30" r="26"/></svg>`;
    target.setAttribute('aria-label', `Удерживайте для измерения: ${tool.name}`);
    g.scene.querySelector('.care-child').append(target);
    let completed = false;
    const completeMeasurement = () => {
      if (completed || s.stage !== 'exam' || tools[s.examIndex] !== tool) return;
      completed = true; stopHold(); s.examIndex++;
      s.trust = clamp(s.trust + 5, 0, 100); g.hit();
      const finding = tool.id === 'thermometer' ? `Температура: ${patient().temp}°`
        : tool.id === 'stethoscope' ? 'Дыхание: спокойное' : `Ритм: ${patient().pulse}`;
      s.findings.push(finding); g.feedback(`Измерение завершено. ${finding}`);
      if (s.examIndex >= tools.length) s.stage = 'conclusion';
      persist(); draw();
    };
    const releaseHold = () => {
      // A slow animation frame must not invalidate a completed real-time hold.
      if (hold && performance.now() - hold.start >= hold.duration) {
        completeMeasurement(); return;
      }
      stopHold(); target.style.setProperty('--hold', 0);
    };
    const start = e => {
      if (e.type === 'pointerdown') {
        if (e.button !== 0) return;
        e.preventDefault(); target.setPointerCapture(e.pointerId);
      }
      if (hold) return;
      if (selected !== tool.id) { g.feedback('Сначала выберите нужный прибор.', false); return; }
      const duration = difficultyValue(ctx.difficulty, 1800, 2200, 2700) + (s.trust < 50 ? 700 : 0);
      hold = {start: performance.now(), pointer: e.pointerId, duration};
      const animate = now => {
        if (!hold || stopped) return;
        const value = clamp((now - hold.start) / duration, 0, 1);
        target.style.setProperty('--hold', value);
        const fill = interaction.querySelector('.care-hold-fill');
        if (fill) fill.style.width = `${value * 100}%`;
        if (value >= 1) { completeMeasurement(); return; }
        holdRaf = requestAnimationFrame(animate);
      };
      holdRaf = requestAnimationFrame(animate);
    };
    target.addEventListener('pointerdown', start);
    target.addEventListener('pointermove', e => {
      if (!hold) return;
      const r = target.getBoundingClientRect();
      if (e.clientX < r.left - 20 || e.clientX > r.right + 20 || e.clientY < r.top - 20 || e.clientY > r.bottom + 20) {
        stopHold(); target.style.setProperty('--hold', 0);
        g.feedback('Верните прибор в область осмотра.', false);
      }
    });
    target.addEventListener('pointerup', releaseHold);
    target.addEventListener('pointercancel', () => { stopHold(); target.style.setProperty('--hold', 0); });
    target.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) start(e); }
    });
    target.addEventListener('keyup', e => {
      if (e.key === ' ' || e.key === 'Enter') releaseHold();
    });
  }

  function renderConclusion(interaction) {
    g.setObjective("Сопоставьте наблюдения и завершите приём");
    g.hint.textContent =
      "Это условный игровой вывод. Используйте жалобу, контекст и измеренные показатели.";
    const p = patient();
    interaction.innerHTML = `<div class="care-step-label">КАРТА НАБЛЮДЕНИЙ</div><div class="care-case-notes"><span>Жалоба: <b>${escapeHTML(p.symptom)}</b></span>${s.findings.map((f) => `<span>${escapeHTML(f)}</span>`).join("")}<p>${escapeHTML(p.clue)}</p></div>`;
    const variants = shuffle([
      p.pattern,
      ...shuffle(
        [...new Set(PATIENTS.map((x) => x.pattern))].filter(
          (x) => x !== p.pattern,
        ),
      ).slice(0, 2),
    ]);
    for (const variant of variants) {
      const b = g.button(
        variant,
        () => {
          if (variant !== p.pattern) {
            s.fatigue = clamp(s.fatigue + 8, 0, 100);
            g.miss(
              "Этот вывод не объясняет контекст. Сопоставьте все наблюдения.",
            );
            persist();
            return;
          }
          g.hit(3);
          const quality = clamp(
            Math.round(s.trust * 0.7 + (100 - s.fear) * 0.3),
            0,
            100,
          );
          s.quality.push(quality);
          s.summary.push(
            `${p.name}: ${p.pattern}, доверие ${Math.round(s.trust)}%`,
          );
          s.round++;
          if (s.round >= s.deck.length) {
            complete();
            return;
          }
          const next = patient();
          Object.assign(s, {
            stage: "dialogue",
            trust: 24,
            fear: next.fear,
            fatigue: 8,
            dialogue: 0,
            bubbles: [],
            bubbleStep: 0,
            examIndex: 0,
            findings: [],
          });
          g.feedback("Приём завершён. Следующий маленький пациент уже ждёт.");
          persist();
          draw();
        },
        "care-conclusion",
      );
      interaction.append(b);
    }
  }

  function complete(timeout = false) {
    if (s.done) return;
    s.done = true;
    stopHold();
    const quality = s.quality.length
      ? s.quality.reduce((a, b) => a + b, 0) / s.quality.length
      : 0;
    const completed = s.round / s.deck.length;
    const score = clamp(
      Math.round(completed * (65 + quality * 0.35) - g.mistakes * 2),
      0,
      100,
    );
    persist();
    g.finish(score, [
      `${s.round} из ${s.deck.length} пациентов получили заботливый приём.`,
      ...s.summary,
      timeout ? "Смена закончилась по времени." : "Приёмы завершены.",
    ]);
  }
  g.onTimeout = () => complete(true);
  if (!ctx.state) s.fear = patient().fear;
  g.every(5000, () => {
    if (s.done || g.paused) return;
    s.fatigue = clamp(s.fatigue + 0.5, 0, 100);
    persist();
  });
  draw();
  persist();
  return {
    destroy() {
      stopped = true;
      stopHold();
      if (nextTimer) clearTimeout(nextTimer);
      g.destroy();
    },
  };
}
