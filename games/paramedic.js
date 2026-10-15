import {
  GameSession,
  clamp,
  shuffle,
  difficultyValue,
  escapeHTML,
} from "../js/game-kit.js";

export const PARAMEDIC_SCENARIOS = [
  {
    id: "collision",
    title: "Перекрёсток",
    type: "ДТП",
    dispatch:
      "После столкновения пассажир в сознании. Болит нога. Рядом разбитое стекло и работающий двигатель.",
    required: ["splint", "monitor"],
    hazards: ["Осколки", "Двигатель"],
    kind: "align",
    action: "Совместите игровую шину",
    color: "#44667e",
    condition: "Фиксация конечности",
    hint: "Перенесите бирюзовую шину на контур ноги. Затем отпустите в отмеченной области.",
  },
  {
    id: "unconscious",
    title: "Тихий сквер",
    type: "Потеря сознания",
    dispatch:
      "Посетитель сквера не отвечает на обращение. Нужны монитор и условный кислородный модуль.",
    required: ["oxygen", "monitor"],
    hazards: ["Толпа", "Самокат"],
    kind: "hold",
    action: "Стабилизируйте подачу воздуха",
    color: "#355f64",
    condition: "Поддержка состояния",
    hint: "Удерживайте подачу, пока шкала в рабочей зоне. Отпускайте, если давление слишком высокое.",
  },
  {
    id: "fall",
    title: "Строительная площадка",
    type: "Падение",
    dispatch:
      "Работник упал с невысокой платформы. Он в сознании. Нужны фиксация и наблюдение.",
    required: ["splint", "monitor"],
    hazards: ["Провод", "Лестница"],
    kind: "align",
    action: "Зафиксируйте опору",
    color: "#746246",
    condition: "Устойчивая фиксация",
    hint: "Переместите опору на пунктирный контур. Для точности ориентируйтесь на центр мишени.",
  },
  {
    id: "home",
    title: "Квартира 24",
    type: "Бытовая травма",
    dispatch:
      "Пациент повредил руку на кухне. Подготовьте перевязочный модуль и монитор. На полу вода.",
    required: ["bandage", "monitor"],
    hazards: ["Лужа", "Острый предмет"],
    kind: "trace",
    action: "Наложите условную повязку",
    color: "#65576e",
    condition: "Защита повреждения",
    hint: "Проведите инструментом по точкам от 1 до 5. Двигайтесь по порядку.",
  },
  {
    id: "incident",
    title: "Городской терминал",
    type: "Чрезвычайное происшествие",
    dispatch:
      "После эвакуации у человека резко ухудшилось состояние. Подготовьте монитор и реанимационный модуль.",
    required: ["resus", "monitor"],
    hazards: ["Дым", "Обломки"],
    kind: "rhythm",
    action: "Поймайте ритм модуля",
    color: "#63525b",
    condition: "Синхронизация поддержки",
    hint: "Нажмите на импульс, когда белое кольцо входит в бирюзовую область. Нужно 6 попаданий.",
  },
  {
    id: "breathing",
    title: "Платформа Б",
    type: "Нарушение дыхания",
    dispatch:
      "Пациент жалуется на дыхание. Подготовьте кислородный модуль и монитор. Освободите площадку.",
    required: ["oxygen", "monitor"],
    hazards: ["Багаж", "Толпа"],
    kind: "rhythm",
    action: "Синхронизируйте вентиляцию",
    color: "#3d5871",
    condition: "Ритмичная поддержка",
    hint: "Нажимайте в центре светового импульса. Это условный игровой ритм, а не медицинская инструкция.",
  },
  {
    id: "deterioration",
    title: "Дежурная станция",
    type: "Ухудшение состояния",
    dispatch:
      "Во время ожидания у пациента меняются показатели. Нужны монитор и инфузионный игровой модуль.",
    required: ["infusion", "monitor"],
    hazards: ["Тележка", "Разлитый раствор"],
    kind: "connect",
    action: "Подключите модуль наблюдения",
    color: "#3b5f64",
    condition: "Контроль оборудования",
    hint: "Соедините кабель и порт одинакового цвета: бирюзовый, синий, янтарный.",
  },
];
const EQUIPMENT = [
  { id: "monitor", name: "Монитор", icon: "⌁" },
  { id: "oxygen", name: "Кислородный модуль", icon: "◉" },
  { id: "splint", name: "Шина", icon: "▰" },
  { id: "bandage", name: "Перевязочный модуль", icon: "▤" },
  { id: "resus", name: "Реанимационный модуль", icon: "♥" },
  { id: "infusion", name: "Инфузионный модуль", icon: "◈" },
];
const colors = ["#55e1c5", "#6fa9ff", "#ffbd76"];
const scenario = (id) =>
  PARAMEDIC_SCENARIOS.find((v) => v.id === id) || PARAMEDIC_SCENARIOS[0];
export async function mount(ctx) {
  const rounds = difficultyValue(ctx.difficulty, 5, 6, 7),
    duration = difficultyValue(ctx.difficulty, 480, 450, 420);
  const state = ctx.state || {
    ids: shuffle(PARAMEDIC_SCENARIOS.map((v) => v.id)),
    index: 0,
    stage: "bag",
    bag: [],
    hazards: [],
    assessed: [],
    stability: 88,
    done: 0,
    points: 0,
    actions: 0,
    caseErrors: 0,
    align: { x: 0.2, y: 0.7 },
    trace: 0,
    connections: [],
    transport: 0,
    complication: false,
  };
  const s = new GameSession(ctx, {
    title: "Экстренный вызов",
    subtitle: "Мобильная бригада · 2.5D",
    duration,
    state,
  });
  s.scene.classList.add("response-scene", "paramedic-scene");
  s.controls.classList.add("response-controls");
  let destroyed = false,
    holding = false,
    phase = 0,
    pulseLock = 0,
    procedureProgress = state.holdProgress || 0,
    drag = null,
    callStarted = state.callStarted ?? s.elapsed;
  const current = () => scenario(state.ids[state.index % state.ids.length]);
  const minStability = difficultyValue(ctx.difficulty, 24, 32, 40);
  const route = [
    [0.1, 0.74],
    [0.32, 0.57],
    [0.53, 0.72],
    [0.75, 0.49],
    [0.9, 0.29],
  ];
  function objective() {
    const labels = {
      bag: "Соберите медицинский чемодан",
      safety: "Обеспечьте безопасность сцены",
      assess: "Проведите первичный игровой осмотр",
      treat: current().action,
      transport: "Доставьте пациента к машине",
    };
    s.setObjective(`${state.index + 1}/${rounds} · ${labels[state.stage]}`);
    s.setMetric("Стабильность", Math.round(state.stability) + "%");
    s.setProgress(
      (state.done +
        (state.stage === "bag"
          ? 0
          : state.stage === "safety"
            ? 0.15
            : state.stage === "assess"
              ? 0.35
              : state.stage === "treat"
                ? 0.55
                : 0.85)) /
        rounds,
    );
  }
  function background() {
    const c = current();
    return `<svg viewBox="0 0 620 310" class="emergency-illustration" aria-hidden="true"><defs><linearGradient id="responseSky" x2="0" y2="1"><stop stop-color="${c.color}"/><stop offset="1" stop-color="#102838"/></linearGradient></defs><path d="M0 0H620V310H0Z" fill="url(#responseSky)"/><path d="M0 90L80 57 80 160 128 130 128 30 205 30 205 158 260 130 260 70 344 70 344 160 420 124 420 37 490 37 490 154 550 121 550 77 620 77V260H0Z" fill="#0a1e2b" opacity=".6"/><path d="M0 203L620 170V310H0Z" fill="#162b35"/><path d="M0 282L620 216M120 310L475 194" stroke="#70818a" opacity=".25" stroke-width="3"/><path d="M426 145h113l46 36v61H415v-78Z" fill="#d3e2e2"/><path d="M505 152h29l33 31h-62Z" fill="#315768"/><path d="M438 172h34v43h-34Zm-10 11h54v20h-54Z" fill="#42b9aa"/><path d="M447 137h33v9h-33Z" fill="#66d9dc"/><circle cx="446" cy="241" r="20" fill="#10212d"/><circle cx="446" cy="241" r="8" fill="#93a5ae"/><circle cx="553" cy="241" r="20" fill="#10212d"/><circle cx="553" cy="241" r="8" fill="#93a5ae"/><ellipse cx="259" cy="260" rx="116" ry="15" fill="#071721" opacity=".6"/><path d="M162 210L280 184 357 222 225 257Z" fill="#467882"/><path d="M155 214L226 258 353 224M163 213L153 256M340 229L349 260" stroke="#b1c5c9" stroke-width="5"/><ellipse cx="204" cy="207" rx="21" ry="19" fill="#d8b39a"/><path d="M186 203q0-24 20-19 18 0 19 17l-22-5Z" fill="#343e47"/><path d="M223 209L262 204 305 225 256 243 220 225Z" fill="#5296a1"/><path d="M270 226L310 219 330 231 286 245Z" fill="#346677"/><path d="M229 213L228 232 259 242" fill="none" stroke="#d8b39a" stroke-width="11" stroke-linecap="round"/><path d="M101 217l10-23 11 23Z" fill="#ffbd76"/><path d="M100 217h24" stroke="#bf8760" stroke-width="4"/><path d="M374 234l8-20 12 20Z" fill="#ffbd76"/></svg>`;
  }
  function render() {
    holding = false;
    objective();
    const c = current();
    s.scene.innerHTML = `<div class="intake-topline"><span class="response-live">● БРИГАДА 07 · ${escapeHTML(c.type.toUpperCase())}</span><span>ВЫЗОВ ${String(state.index + 1).padStart(2, "0")}</span></div><div class="dispatch-line"><b>${escapeHTML(c.title)}</b><span>${state.stage === "bag" ? "Подготовка к выезду" : "Бригада на месте"}</span></div><div class="emergency-stage">${background()}<div class="scene-shade"></div><div class="emergency-overlay"></div><div class="stability-panel"><small>СТАБИЛЬНОСТЬ</small><b data-stability>${Math.round(state.stability)}<em>%</em></b><div class="g-meter"><i style="width:${state.stability}%"></i></div><span data-vital>♥ ${Math.round(145 - state.stability * 0.5)} · СИГНАЛ</span></div></div><div class="call-phase-strip">${["Чемодан", "Безопасность", "Осмотр", "Помощь", "Перевозка"].map((x, i) => `<span class="${["bag", "safety", "assess", "treat", "transport"].indexOf(state.stage) >= i ? "active" : ""}">${i + 1}<small>${x}</small></span>`).join("")}</div>`;
    s.controls.innerHTML = "";
    if (state.stage === "bag") renderBag(c);
    if (state.stage === "safety") renderSafety(c);
    if (state.stage === "assess") renderAssessment(c);
    if (state.stage === "treat") renderTreatment(c);
    if (state.stage === "transport") renderTransport();
    s.hint.textContent =
      ctx.difficulty === "hard"
        ? "Самостоятельная работа бригады. Следите за очерёдностью действий и стабильностью; при помехе устраните источник сигнала."
        : state.stage === "bag"
          ? "В чемодане три ячейки. По описанию вызова выберите нужные модули. Это условная игра, действия не являются медицинскими рекомендациями."
          : state.stage === "safety"
            ? "Нажмите на все янтарные метки опасности. Нельзя начинать осмотр, пока площадка не подготовлена."
            : state.stage === "assess"
              ? "Касайтесь головы, груди и запястья для первичного осмотра. Показатели меняются в реальном времени."
              : state.stage === "treat"
                ? c.hint
                : "Проведите носилки по пяти контрольным точкам. Перескок точки снижает стабильность.";
  }
  function overlay() {
    return s.scene.querySelector(".emergency-overlay");
  }
  function renderBag(c) {
    const brief = document.createElement("div");
    brief.className = "dispatch-card";
    brief.innerHTML = `<span class="g-label">ДИСПЕТЧЕР · НОВЫЙ ВЫЗОВ</span><p>${escapeHTML(c.dispatch)}</p>`;
    s.controls.append(brief);
    const bag = document.createElement("div");
    bag.className = "equipment-grid";
    EQUIPMENT.forEach((t) => {
      const b = s.button(`${t.icon} ${t.name}`, () => {
        if (state.bag.includes(t.id))
          state.bag = state.bag.filter((x) => x !== t.id);
        else if (state.bag.length < 3) state.bag.push(t.id);
        else {
          s.feedback(
            "В чемодане только три ячейки. Уберите ненужный модуль.",
            false,
          );
          return;
        }
        ctx.audio.play("tap");
        s.save();
        render();
      });
      b.classList.toggle("selected", state.bag.includes(t.id));
      bag.append(b);
    });
    s.controls.append(
      bag,
      s.button(
        `Выезд · занято ${state.bag.length}/3`,
        () => {
          if (!state.bag.length) {
            s.feedback("Соберите чемодан перед выездом.", false);
            return;
          }
          state.stage = "safety";
          state.callStarted = callStarted = s.elapsed;
          s.save();
          render();
        },
        "primary",
      ),
    );
  }
  function hazardButton(label, i) {
    const b = s.button(
      "⚠ " + label,
      () => {
        if (state.stage === "safety") {
          if (!state.hazards.includes(i)) {
            state.hazards.push(i);
            s.hit();
            s.feedback("Опасность устранена");
            s.save();
            render();
          }
        } else {
          state.complication = false;
          state.stability = clamp(state.stability + 7, 0, 100);
          s.hit();
          s.feedback("Обстановка снова под контролем");
          s.save();
          render();
        }
      },
      "scene-hazard",
    );
    b.style.left = (i ? 65 : 13) + "%";
    b.style.top = (i ? 47 : 66) + "%";
    return b;
  }
  function renderSafety(c) {
    c.hazards.forEach((h, i) => {
      if (!state.hazards.includes(i)) overlay().append(hazardButton(h, i));
    });
    s.controls.append(
      s.button(
        state.hazards.length === c.hazards.length
          ? "✓ Площадка готова · начать осмотр"
          : "Осмотрите место происшествия",
        () => {
          if (state.hazards.length < c.hazards.length) {
            s.miss("Сначала устраните отмеченные опасности.");
            state.caseErrors++;
            return;
          }
          state.stage = "assess";
          s.save();
          render();
        },
        "primary",
      ),
    );
  }
  function renderAssessment() {
    const zones = [
      { id: "head", name: "Сознание", x: 33, y: 60 },
      { id: "chest", name: "Дыхание", x: 40, y: 69 },
      { id: "wrist", name: "Пульс", x: 46, y: 78 },
    ];
    zones.forEach((z) => {
      const b = s.button(
        state.assessed.includes(z.id) ? "✓" : "+",
        () => {
          if (state.assessed.includes(z.id)) return;
          state.assessed.push(z.id);
          s.hit();
          s.feedback(
            z.id === "head"
              ? "Реакция на обращение зарегистрирована."
              : z.id === "chest"
                ? "Дыхательный датчик подключён."
                : "Пульс обнаружен. Монитор собирает сигнал.",
          );
          s.save();
          render();
        },
        "body-target assessment-point",
      );
      b.style.left = z.x + "%";
      b.style.top = z.y + "%";
      b.setAttribute("aria-label", z.name);
      overlay().append(b);
    });
    const status = document.createElement("div");
    status.className = "assessment-summary";
    status.innerHTML = zones
      .map(
        (z) =>
          `<span>${state.assessed.includes(z.id) ? "✓" : "○"} ${z.name}</span>`,
      )
      .join("");
    s.controls.append(
      status,
      s.button(
        "Перейти к стабилизации →",
        () => {
          if (state.assessed.length < 3) {
            s.feedback("Проверьте три отмеченные области.", false);
            return;
          }
          const missing = current().required.filter(
            (x) => !state.bag.includes(x),
          );
          if (missing.length) {
            state.caseErrors++;
            s.miss(
              "Не хватает оборудования: " +
                missing
                  .map((id) => EQUIPMENT.find((x) => x.id === id).name)
                  .join(", "),
            );
            state.stability -= 7;
            state.stage = "bag";
            s.save();
            render();
            return;
          }
          state.stage = "treat";
          state.actions = 0;
          procedureProgress = 0;
          phase = 0;
          s.save();
          render();
        },
        "primary",
      ),
    );
  }
  function treatmentDone() {
    s.hit(2);
    state.stage = "transport";
    state.complication = false;
    state.stability = clamp(state.stability + 12, 0, 100);
    holding = false;
    s.feedback("Пациент стабилизирован. Подготовьте транспортировку.");
    s.save();
    render();
  }
  function renderTreatment(c) {
    const area = document.createElement("div");
    area.className = "field-procedure";
    overlay().append(area);
    const label = document.createElement("div");
    label.className = "field-task-label";
    label.textContent = c.condition;
    area.append(label);
    if (state.complication)
      overlay().append(hazardButton("Помеха монитора", 1));
    if (c.kind === "align") {
      area.innerHTML +=
        '<div class="alignment-target"><span>СОВМЕСТИТЬ</span></div><button class="alignment-splint" aria-label="Перетащите шину">▰</button>';
      const piece = area.querySelector(".alignment-splint"),
        target = area.querySelector(".alignment-target");
      piece.style.left = state.align.x * 100 + "%";
      piece.style.top = state.align.y * 100 + "%";
      piece.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        drag = { kind: "align" };
        piece.setPointerCapture(e.pointerId);
      });
      piece.addEventListener("pointermove", (e) => {
        if (drag?.kind !== "align") return;
        const r = area.getBoundingClientRect();
        state.align.x = clamp((e.clientX - r.left) / r.width, 0.05, 0.95);
        state.align.y = clamp((e.clientY - r.top) / r.height, 0.15, 0.9);
        piece.style.left = state.align.x * 100 + "%";
        piece.style.top = state.align.y * 100 + "%";
      });
      piece.addEventListener("pointerup", () => {
        if (!drag) return;
        drag = null;
        const tolerance = difficultyValue(ctx.difficulty, 0.16, 0.12, 0.085);
        if (Math.hypot(state.align.x - 0.6, state.align.y - 0.52) < tolerance) {
          state.actions++;
          s.hit();
          if (state.actions >= difficultyValue(ctx.difficulty, 2, 3, 4)) {
            treatmentDone();
            return;
          }
          state.align = {
            x: 0.12 + Math.random() * 0.2,
            y: 0.6 + Math.random() * 0.2,
          };
          s.feedback("Опора закреплена. Совместите следующий сегмент.");
          s.save();
          render();
        } else {
          s.miss("Контур не совпал. Переместите центр шины в центр рамки.");
          state.caseErrors++;
          s.save();
        }
      });
      piece.addEventListener("pointercancel", () => {
        drag = null;
      });
      const arrows = document.createElement("div");
      arrows.className = "alignment-arrows";
      [
        ["←", -0.05, 0],
        ["↑", 0, -0.05],
        ["↓", 0, 0.05],
        ["→", 0.05, 0],
      ].forEach(([label, dx, dy]) =>
        arrows.append(
          s.button(label, () => {
            state.align.x = clamp(state.align.x + dx, 0.05, 0.95);
            state.align.y = clamp(state.align.y + dy, 0.15, 0.9);
            piece.style.left = state.align.x * 100 + "%";
            piece.style.top = state.align.y * 100 + "%";
            s.save();
          }),
        ),
      );
      s.controls.append(
        arrows,
        s.button(
          "Закрепить опору",
          () => {
            if (
              Math.hypot(state.align.x - 0.6, state.align.y - 0.52) <
              difficultyValue(ctx.difficulty, 0.16, 0.12, 0.085)
            ) {
              state.actions++;
              s.hit();
              if (state.actions >= difficultyValue(ctx.difficulty, 2, 3, 4))
                treatmentDone();
              else {
                state.align = { x: 0.15, y: 0.75 };
                s.save();
                render();
              }
            } else {
              s.feedback("Сначала совместите шину с контуром.", false);
            }
          },
          "primary",
        ),
      );
    }
    if (c.kind === "hold") {
      area.innerHTML +=
        '<div class="oxygen-orb">O₂<small>ИГРОВОЙ МОДУЛЬ</small></div><div class="hold-pressure"><span></span><i></i></div><div class="field-progress"><i></i></div>';
      const b = s.button("Удерживать подачу", () => {}, "primary hold-control");
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        holding = true;
        b.setPointerCapture(e.pointerId);
      });
      b.addEventListener("pointerup", () => (holding = false));
      b.addEventListener("pointercancel", () => (holding = false));
      b.addEventListener("keydown", (e) => {
        if (e.code === "Space") {
          e.preventDefault();
          holding = true;
        }
      });
      b.addEventListener("keyup", () => (holding = false));
      s.controls.append(b);
      const helper = document.createElement("p");
      helper.className = "procedure-explanation";
      helper.textContent =
        "Поддерживайте давление в зоне 35–70. Наберите 10 секунд устойчивой подачи.";
      s.controls.append(helper);
    }
    if (c.kind === "rhythm") {
      area.innerHTML +=
        '<div class="response-rhythm"><div class="rhythm-target"></div><div class="rhythm-orbit"></div><b>♥</b></div><div class="rhythm-counter"></div>';
      s.controls.append(
        s.button(
          "♥ Синхронизировать",
          () => {
            const distance = Math.abs((Math.sin(phase) + 1) / 2 - 0.5);
            const tolerance = difficultyValue(ctx.difficulty, 0.27, 0.21, 0.15);
            if (distance < tolerance && s.elapsed - pulseLock > 0.2) {
              state.actions++;
              pulseLock = s.elapsed;
              s.hit();
              s.feedback("Точный импульс");
              state.stability = clamp(state.stability + 2, 0, 100);
              if (state.actions >= difficultyValue(ctx.difficulty, 6, 8, 10))
                treatmentDone();
            } else {
              state.caseErrors++;
              state.stability -= 2;
              s.miss("Импульс вне зоны. Следите за белым кольцом.");
            }
            s.save();
          },
          "primary",
        ),
      );
    }
    if (c.kind === "trace") {
      const points = [
        [0.18, 0.35],
        [0.38, 0.66],
        [0.55, 0.34],
        [0.73, 0.65],
        [0.85, 0.35],
      ];
      area.innerHTML +=
        '<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="bandage-path"><path d="M18 35L38 66 55 34 73 65 85 35"/></svg>';
      points.forEach(([x, y], i) => {
        const dot = s.button(
          state.trace > i ? "✓" : String(i + 1),
          () => takeTrace(i),
          "trace-point",
        );
        dot.style.left = x * 100 + "%";
        dot.style.top = y * 100 + "%";
        dot.classList.toggle("complete", state.trace > i);
        dot.dataset.trace = i;
        area.append(dot);
      });
      const take = (e) => {
        const element = document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest("[data-trace]");
        if (element) takeTrace(Number(element.dataset.trace));
      };
      area.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        drag = { kind: "trace" };
        area.setPointerCapture(e.pointerId);
        take(e);
      });
      area.addEventListener("pointermove", (e) => {
        if (drag?.kind === "trace") take(e);
      });
      area.addEventListener("pointerup", () => {
        drag = null;
        s.save();
      });
      area.addEventListener("pointercancel", () => (drag = null));
      function takeTrace(i) {
        if (i < state.trace) return;
        if (i === state.trace) {
          state.trace++;
          s.hit();
          ctx.audio.play("tap");
          const dot = area.querySelector(`[data-trace="${i}"]`);
          if (dot) {
            dot.textContent = "✓";
            dot.classList.add("complete");
          }
          if (state.trace >= 5) treatmentDone();
          s.save();
        } else if (s.elapsed - pulseLock > 0.7) {
          pulseLock = s.elapsed;
          state.caseErrors++;
          s.miss("Следуйте по точкам по порядку.");
        }
      }
      const txt = document.createElement("p");
      txt.textContent =
        "Проведите пальцем по маршруту 1 → 5. Каждую точку также можно нажать.";
      s.controls.append(txt);
    }
    if (c.kind === "connect") {
      area.innerHTML += '<div class="cable-board"></div>';
      const board = area.querySelector(".cable-board");
      for (let i = 0; i < 3; i++) {
        const a = s.button(
          state.connections.includes(i) ? "✓" : "◉",
          () => {
            drag = { kind: "cable", i };
            s.feedback("Теперь выберите порт такого же цвета.");
          },
          "cable-end",
        );
        a.style.top = 25 + i * 28 + "%";
        a.style.left = "17%";
        a.style.setProperty("--cable-color", colors[i]);
        a.setAttribute("aria-label", "Кабель " + (i + 1));
        a.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          drag = { kind: "cable", i };
          a.setPointerCapture(e.pointerId);
        });
        a.addEventListener("pointerup", (e) => {
          const port = document
            .elementFromPoint(e.clientX, e.clientY)
            ?.closest("[data-port]");
          if (port) connect(i, Number(port.dataset.port));
        });
        board.append(a);
        const order = [1, 2, 0];
        const b = s.button(
          state.connections.includes(order[i]) ? "✓" : "○",
          () => {
            if (drag?.kind === "cable") connect(drag.i, order[i]);
            else s.feedback("Сначала выберите кабель слева.");
          },
          "cable-port",
        );
        b.dataset.port = order[i];
        b.style.left = "78%";
        b.style.top = 25 + i * 28 + "%";
        b.style.setProperty("--cable-color", colors[order[i]]);
        b.setAttribute("aria-label", "Порт " + (order[i] + 1));
        board.append(b);
      }
      function connect(a, b) {
        drag = null;
        if (state.connections.includes(a)) return;
        if (a === b) {
          state.connections.push(a);
          s.hit();
          s.feedback("Канал подключён");
          if (state.connections.length === 3) {
            treatmentDone();
            return;
          }
          s.save();
          render();
        } else {
          state.caseErrors++;
          s.miss("Цвета кабеля и порта не совпадают.");
          s.save();
        }
      }
      const txt = document.createElement("p");
      txt.textContent =
        "Перетащите кабель к порту или нажмите сначала кабель, затем порт того же цвета.";
      s.controls.append(txt);
    }
  }
  function renderTransport() {
    const area = document.createElement("div");
    area.className = "transport-map";
    overlay().append(area);
    area.innerHTML =
      '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M10 74L32 57 53 72 75 49 90 29"/></svg>';
    route.forEach(([x, y], i) => {
      const b = s.button(
        state.transport > i ? "✓" : i === 4 ? "✚" : String(i + 1),
        () => visit(i),
        "route-point",
      );
      b.style.left = x * 100 + "%";
      b.style.top = y * 100 + "%";
      b.dataset.route = i;
      b.classList.toggle("complete", state.transport > i);
      b.setAttribute("aria-label", "Точка маршрута " + (i + 1));
      area.append(b);
    });
    const take = (e) => {
      const dot = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest("[data-route]");
      if (dot) visit(Number(dot.dataset.route));
    };
    area.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      drag = { kind: "transport" };
      area.setPointerCapture(e.pointerId);
      take(e);
    });
    area.addEventListener("pointermove", (e) => {
      if (drag?.kind === "transport") take(e);
    });
    area.addEventListener("pointerup", () => {
      drag = null;
      s.save();
    });
    area.addEventListener("pointercancel", () => (drag = null));
    function visit(i) {
      if (i < state.transport) return;
      if (i === state.transport) {
        state.transport++;
        s.hit();
        ctx.audio.play("tap");
        const dot = area.querySelector(`[data-route="${i}"]`);
        if (dot) {
          dot.textContent = "✓";
          dot.classList.add("complete");
        }
        if (state.transport >= 5) {
          finishCall();
          return;
        }
        s.save();
      } else if (s.elapsed - pulseLock > 0.7) {
        pulseLock = s.elapsed;
        state.caseErrors++;
        state.stability -= 3;
        s.miss("Нельзя пропустить контрольную точку.");
        s.save();
      }
    }
    const text = document.createElement("p");
    text.textContent =
      "Проведите пальцем по маршруту 1 → 2 → 3 → 4 → машина. Можно нажимать точки по очереди.";
    s.controls.append(text);
  }
  function finishCall() {
    const grade = clamp(
      Math.round(75 + state.stability * 0.25 - state.caseErrors * 5),
      10,
      100,
    );
    state.points += grade;
    state.done++;
    s.feedback("Вызов завершён. Пациент передан дежурной бригаде.");
    if (state.done >= rounds) {
      finish();
      return;
    }
    state.index++;
    state.stage = "bag";
    state.bag = [];
    state.hazards = [];
    state.assessed = [];
    state.stability = difficultyValue(ctx.difficulty, 92, 86, 80);
    state.actions = 0;
    state.caseErrors = 0;
    state.align = { x: 0.2, y: 0.7 };
    state.trace = 0;
    state.connections = [];
    state.transport = 0;
    state.complication = false;
    state.eventShown = false;
    state.holdProgress = procedureProgress = 0;
    state.pressure = 0;
    holding = false;
    drag = null;
    phase = 0;
    s.save();
    render();
  }
  function finish() {
    if (destroyed) return;
    holding = false;
    s.finish(Math.round(state.points / rounds), [
      `Завершено вызовов: ${state.done} из ${rounds}`,
      `Последняя стабильность: ${Math.round(state.stability)}%`,
      `Сценарии: ${
        state.ids
          .slice(0, state.done)
          .map((id) => scenario(id).type)
          .join(", ") || "Нет завершённых вызовов"
      }`,
    ]);
  }
  s.every(50, () => {
    if (state.stage !== "treat") return;
    phase += difficultyValue(ctx.difficulty, 0.09, 0.12, 0.15);
    const c = current();
    if (c.kind === "hold") {
      const saved = state.pressure || 0;
      state.pressure = clamp(saved + (holding ? 1.1 : -0.65), 0, 100);
      if (state.pressure >= 35 && state.pressure <= 70) {
        procedureProgress += 0.05;
        state.holdProgress = procedureProgress;
        state.actions = Math.floor(procedureProgress * 10);
      } else if (state.pressure > 90) {
        state.stability = Math.max(0, state.stability - 0.06);
      }
      const marker = s.scene.querySelector(".hold-pressure i");
      if (marker) marker.style.left = state.pressure + "%";
      const bar = s.scene.querySelector(".field-progress i");
      if (bar)
        bar.style.width = Math.min(100, (procedureProgress / 10) * 100) + "%";
      if (procedureProgress >= 10) treatmentDone();
    }
    if (c.kind === "rhythm") {
      const ring = s.scene.querySelector(".rhythm-orbit");
      if (ring)
        ring.style.transform = `translate(-50%,-50%) scale(${0.5 + (Math.sin(phase) + 1) * 0.5})`;
      const counter = s.scene.querySelector(".rhythm-counter");
      if (counter)
        counter.textContent =
          state.actions + " / " + difficultyValue(ctx.difficulty, 6, 8, 10);
    }
  });
  s.every(1000, () => {
    if (state.stage === "bag") return;
    const speed = difficultyValue(ctx.difficulty, 0.09, 0.15, 0.22);
    state.stability = clamp(
      state.stability - speed - (state.complication ? 0.8 : 0),
      0,
      100,
    );
    if (
      state.stage === "treat" &&
      ctx.difficulty !== "easy" &&
      !state.complication &&
      !state.eventShown &&
      s.elapsed - callStarted > 25
    ) {
      state.complication = true;
      state.eventShown = true;
      s.feedback("Помеха монитора! Коснитесь янтарной метки.", false);
      render();
    }
    const num = s.scene.querySelector("[data-stability]");
    if (num) num.innerHTML = Math.round(state.stability) + "<em>%</em>";
    const bar = s.scene.querySelector(".stability-panel .g-meter i");
    if (bar) bar.style.width = state.stability + "%";
    const vital = s.scene.querySelector("[data-vital]");
    if (vital)
      vital.textContent =
        "♥ " +
        Math.round(145 - state.stability * 0.5) +
        " · " +
        (state.stability < 45 ? "ТРЕВОГА" : "СИГНАЛ");
    s.setMetric("Стабильность", Math.round(state.stability) + "%");
    if (state.stability <= minStability) {
      s.miss(
        "Состояние вышло за безопасные игровые пределы. Вызов завершён неудачно.",
      );
      finish();
    }
  });
  s.onTimeout = finish;
  render();
  s.save();
  return {
    destroy() {
      destroyed = true;
      holding = false;
      drag = null;
      s.destroy();
    },
  };
}
