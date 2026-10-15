import { GameSession, clamp, difficultyValue } from "../js/game-kit.js";
import {
  MedicalScene,
  PrecisionField,
  webglFallback,
} from "./medical-scene.js";

const TOOLS = {
  scanner: "Сканер",
  scalpel: "Контурный инструмент",
  forceps: "Захват",
  patch: "Аппликатор",
  suture: "Сшиватель",
};
const INSTRUCTIONS = {
  hold: "Нажмите на светящийся маркер и сопровождайте его, не отпуская палец. Заполните шкалу точности.",
  trace:
    "Начните с подсвеченной точки и плавно проведите инструмент по всей пунктирной траектории. При отрыве продолжайте с активной точки.",
  extract:
    "Захватите золотой объект и перенесите его в бирюзовый контейнер. Обойдите розовые защитные зоны.",
  align:
    "Коснитесь поля и поверните золотой сегмент до совпадения с пунктирным контуром. Отпустите для фиксации.",
  stitch:
    "Проведите через пары пронумерованных точек по порядку. После отрыва пальца продолжайте с подсвеченной точки.",
};
const OPERATIONS = [
  {
    title: "Удаление виртуального образования",
    code: "OP-01",
    story:
      "Изолируйте светящийся объект, перенесите его в контейнер и восстановите геометрию учебного поля.",
    steps: [
      {
        title: "Обозначьте границы",
        tool: "scalpel",
        kind: "trace",
        cycles: 3,
      },
      {
        title: "Перенесите виртуальные фрагменты",
        tool: "forceps",
        kind: "extract",
        cycles: 3,
      },
      {
        title: "Восстановите целостность поля",
        tool: "suture",
        kind: "stitch",
        cycles: 3,
      },
    ],
  },
  {
    title: "Извлечение инородного объекта",
    code: "OP-02",
    story:
      "Найдите геометрические фрагменты с помощью наведения, откройте безопасный путь и извлеките объекты.",
    steps: [
      {
        title: "Уточните положение объектов",
        tool: "scanner",
        kind: "hold",
        cycles: 2,
      },
      {
        title: "Создайте безопасный доступ",
        tool: "scalpel",
        kind: "trace",
        cycles: 2,
      },
      {
        title: "Извлеките объекты",
        tool: "forceps",
        kind: "extract",
        cycles: 4,
      },
      {
        title: "Закройте учебное поле",
        tool: "suture",
        kind: "stitch",
        cycles: 2,
      },
    ],
  },
  {
    title: "Восстановление повреждённой ткани",
    code: "OP-03",
    story:
      "В этом абстрактном тренажёре соедините геометрические сегменты и закрепите их точными линиями.",
    steps: [
      {
        title: "Подготовьте границы сегментов",
        tool: "scalpel",
        kind: "trace",
        cycles: 2,
      },
      {
        title: "Совместите восстановительные элементы",
        tool: "patch",
        kind: "align",
        cycles: 5,
      },
      {
        title: "Закрепите соединения",
        tool: "suture",
        kind: "stitch",
        cycles: 4,
      },
    ],
  },
  {
    title: "Малоинвазивная игровая процедура",
    code: "OP-04",
    story:
      "Работайте через виртуальный оптический канал. Удерживайте наведение и перемещайте инструмент по узкому маршруту.",
    steps: [
      {
        title: "Откалибруйте оптический канал",
        tool: "scanner",
        kind: "hold",
        cycles: 3,
      },
      {
        title: "Пройдите инструментальный маршрут",
        tool: "forceps",
        kind: "trace",
        cycles: 4,
      },
      {
        title: "Перенесите целевые элементы",
        tool: "forceps",
        kind: "extract",
        cycles: 3,
      },
      {
        title: "Совместите защитный элемент",
        tool: "patch",
        kind: "align",
        cycles: 2,
      },
    ],
  },
  {
    title: "Сложная многоэтапная операция",
    code: "OP-05",
    story:
      "Полный виртуальный протокол: точный доступ, извлечение, реконструкция, фиксация и контроль наведения.",
    steps: [
      {
        title: "Откройте точный контур",
        tool: "scalpel",
        kind: "trace",
        cycles: 3,
      },
      {
        title: "Извлеките целевые элементы",
        tool: "forceps",
        kind: "extract",
        cycles: 3,
      },
      {
        title: "Восстановите геометрию",
        tool: "patch",
        kind: "align",
        cycles: 4,
      },
      {
        title: "Зафиксируйте соединения",
        tool: "suture",
        kind: "stitch",
        cycles: 4,
      },
      {
        title: "Проверьте устойчивость наведения",
        tool: "scanner",
        kind: "hold",
        cycles: 2,
      },
    ],
  },
];

export async function mount(ctx) {
  const difficulty = ctx.difficulty || "easy";
  const index = Math.floor(Math.random() * OPERATIONS.length);
  const operation = OPERATIONS[index];
  const extra = difficultyValue(difficulty, 0, 1, 2);
  const plan = [
    {
      title: "Подготовьте и исследуйте поле",
      tool: "scanner",
      kind: "hold",
      cycles: 2,
    },
    {
      title: "Совместите стерильное покрытие",
      tool: "patch",
      kind: "align",
      cycles: 2,
    },
    ...operation.steps.map((step) => ({
      ...step,
      cycles: step.cycles * 2 + extra,
    })),
    {
      title: "Выполните заключительный контроль",
      tool: "scanner",
      kind: "hold",
      cycles: 1 + extra,
    },
  ];
  const initial = {
    operation: index,
    plan,
    seed: 1 + Math.floor(Math.random() * 100000),
    patient: ["А. Соколов", "Д. Ахметов", "М. Волкова", "Е. Ким"][
      Math.floor(Math.random() * 4)
    ],
    step: 0,
    cycle: 0,
    completed: 0,
    stability: 92,
    tool: null,
    working: false,
    taskState: {},
    interruption: null,
    events: 0,
    eventsResolved: 0,
    pendingReview: false,
  };
  const session = new GameSession(ctx, {
    title: "Операционная",
    subtitle: "ХИРУРГ · ИНТЕРАКТИВНОЕ 3D",
    duration: difficultyValue(difficulty, 720, 720, 720),
    state: initial,
  });
  const state = session.state;
  const currentOperation = OPERATIONS[state.operation];
  const totalTasks = state.plan.reduce((sum, step) => sum + step.cycles, 0);
  let scene,
    field,
    destroyed = false,
    lastMistake = -10,
    progressText,
    progressFill,
    workButton;
  session.scene.classList.add("three-scene", "surgeon-scene");
  const world = document.createElement("div");
  world.className = "three-world";
  const work = document.createElement("div");
  work.className = "medical-workstation surgeon-workstation";
  session.scene.append(world, work);
  try {
    scene = new MedicalScene(world, {
      mode: "surgeon",
      quality: ctx.settings?.quality,
      onInteract: interact,
    });
  } catch {
    work.remove();
    world.remove();
    webglFallback(session);
    return { destroy: () => session.destroy() };
  }
  const cameras = document.createElement("div");
  cameras.className = "scene-camera-bar";
  cameras.append(
    session.button("◎ Поле", () => scene.focus("field")),
    session.button("▧ Операционная", () => scene.focus("room")),
    session.button("⊙ Сверху", () => scene.focus("top")),
  );
  world.append(cameras);
  const tag = document.createElement("div");
  tag.className = "scene-patient";
  tag.textContent = `${currentOperation.code} · ${state.patient} · УЧЕБНЫЙ СИМУЛЯТОР`;
  world.append(tag);
  const orientation = document.createElement("div");
  orientation.className = "landscape-tip";
  orientation.textContent = "↻ Для широкого обзора поверните телефон";
  world.append(orientation);
  session.hint.textContent =
    "Все операции — абстрактные игровые задачи. Вращайте сцену пальцем, масштабируйте двумя пальцами. Выберите инструмент и коснитесь пациента. Во время точной процедуры камера зафиксирована.";
  session.onTimeout = () => finish(false, "Время операции истекло.");

  function task() {
    return state.interruption || state.plan[state.step];
  }
  function currentTaskState() {
    return state.interruption ? state.interruption.taskState : state.taskState;
  }

  function mistake(message) {
    if (session.ended || session.elapsed - lastMistake < 1) return;
    lastMistake = session.elapsed;
    state.stability = Math.max(
      0,
      state.stability - difficultyValue(difficulty, 1.4, 2.2, 3),
    );
    session.miss(message);
    if (state.stability <= 0)
      finish(false, "Точность и стабильность учебного поля потеряны.");
  }

  function interact(target, draggedTool) {
    if (destroyed || session.ended || state.working) return;
    if (draggedTool) state.tool = draggedTool;
    if (target === "monitor") {
      if (state.pendingReview) {
        session.hit();
        finish(true);
      } else {
        scene.focus("monitor");
        session.feedback(
          `Стабильность ${Math.round(state.stability)}%. ${state.interruption ? "Требуется калибровка." : "Продолжайте текущий этап."}`,
        );
      }
      return;
    }
    if (target === "tray") {
      session.feedback(
        "Инструменты доступны на столике и на нижней панели. Выберите нужный, затем коснитесь пациента.",
      );
      return;
    }
    if (target === "oxygen") {
      session.feedback(
        "Фоновый игровой контур работает. Следите за точностью процедуры.",
      );
      return;
    }
    if (TOOLS[target]) {
      state.tool = target;
      scene.setTool(target);
      updateTools();
      session.save();
      session.feedback(
        `${TOOLS[target]} выбран. Коснитесь операционного поля.`,
      );
      return;
    }
    if (target === "patient" && !state.pendingReview) startProcedure();
  }

  function updateTools() {
    session.controls.querySelectorAll("[data-tool]").forEach((button) => {
      button.classList.toggle("selected", button.dataset.tool === state.tool);
      button.disabled = state.working || state.pendingReview;
      button.classList.toggle(
        "recommended",
        difficulty === "easy" && button.dataset.tool === task()?.tool,
      );
    });
  }

  function stopField() {
    field?.destroy();
    field = null;
    scene.setManipulating(false);
    world.classList.remove("precision-active");
  }

  function startProcedure() {
    if (session.ended || state.working || state.pendingReview) return;
    const active = task();
    if (!state.tool) {
      session.feedback(
        `Для этого этапа нужен ${TOOLS[active.tool].toLocaleLowerCase("ru")}. Выберите инструмент.`,
        false,
      );
      return;
    }
    if (state.tool !== active.tool) {
      mistake("Инструмент не подходит к текущему этапу. Проверьте протокол.");
      return;
    }
    state.working = true;
    session.save();
    render();
  }

  function completeTask() {
    if (session.ended || destroyed) return;
    stopField();
    state.working = false;
    state.stability = clamp(state.stability + 2.1, 0, 100);
    session.hit();
    if (state.interruption) {
      state.interruption = null;
      state.eventsResolved++;
      session.feedback(
        "Наведение восстановлено. Продолжите основной протокол.",
      );
    } else {
      state.completed++;
      state.cycle++;
      state.taskState = {};
      if (state.cycle >= state.plan[state.step].cycles) {
        state.step++;
        state.cycle = 0;
        state.tool = null;
        scene.setTool(null);
        session.feedback(
          state.step >= state.plan.length
            ? "Все этапы выполнены. Подтвердите передачу на мониторе."
            : "Этап завершён. Подготовьте следующий инструмент.",
        );
      } else
        session.feedback("Участок завершён. Продолжите со следующим участком.");
      if (state.step >= state.plan.length) {
        state.pendingReview = true;
      } else if (
        state.completed % difficultyValue(difficulty, 6, 5, 4) === 0 &&
        state.events < difficultyValue(difficulty, 1, 2, 4)
      ) {
        state.events++;
        const kind = state.events % 2 ? "hold" : "align";
        state.interruption = {
          title:
            kind === "hold"
              ? "Восстановите оптическое наведение"
              : "Скорректируйте смещение инструмента",
          tool: kind === "hold" ? "scanner" : "patch",
          kind,
          seed: state.seed + state.completed * 319,
          taskState: {},
        };
        state.tool = null;
        scene.setTool(null);
        ctx.audio?.play("error");
      }
    }
    session.save();
    render();
  }

  function render() {
    stopField();
    work.replaceChildren();
    session.controls.replaceChildren();
    const active = task();
    const label = document.createElement("span");
    label.className = "g-label";
    label.textContent = state.pendingReview
      ? "ПРОТОКОЛ ЗАВЕРШЁН"
      : state.interruption
        ? "⚠ НЕОЖИДАННОЕ СОБЫТИЕ"
        : `ЭТАП ${state.step + 1} / ${state.plan.length} · УЧАСТОК ${state.cycle + 1} / ${active.cycles}`;
    const title = document.createElement("h3");
    title.textContent = state.pendingReview
      ? "Передайте пациента на наблюдение"
      : active.title;
    work.append(label, title);
    const description = document.createElement("p");
    description.className = "medical-instruction";
    description.textContent = state.pendingReview
      ? "Проверьте трёхмерный монитор слева от пациента и подтвердите завершение операции."
      : state.interruption
        ? "Система обнаружила дрейф точности. Восстановите наведение, затем продолжите с сохранённого участка."
        : state.step === 0
          ? currentOperation.story
          : `Протокол: ${currentOperation.title}.`;
    work.append(description);
    session.setObjective(title.textContent);
    if (state.pendingReview) {
      const summary = document.createElement("div");
      summary.className = "medical-round-summary";
      summary.textContent = `✓ ${state.completed} участков · ✓ ${state.eventsResolved} калибровок · ${Math.round(state.stability)}% стабильности`;
      work.append(summary);
      work.append(
        session.button(
          "Проверить монитор и завершить",
          () => interact("monitor"),
          "primary",
        ),
      );
    } else {
      const tool = document.createElement("div");
      tool.className = "surgical-tool-requirement";
      const name = document.createElement("span");
      name.textContent = "Инструмент";
      const value = document.createElement("strong");
      value.textContent = TOOLS[active.tool];
      tool.append(name, value);
      work.append(tool);
      const instruction = document.createElement("p");
      instruction.className = "procedure-instruction";
      instruction.textContent = INSTRUCTIONS[active.kind];
      work.append(instruction);
      if (state.working) {
        scene.setManipulating(true);
        scene.focus("field");
        world.classList.add("precision-active");
        const fieldHost = document.createElement("div");
        fieldHost.className = "surgery-field-host";
        work.append(fieldHost);
        const seed =
          state.interruption?.seed ||
          state.seed + state.step * 997 + state.cycle * 71;
        field = new PrecisionField(fieldHost, {
          kind: active.kind,
          seed,
          difficulty,
          initial: currentTaskState(),
          onProgress: (progress) => {
            if (state.interruption) state.interruption.taskState = progress;
            else state.taskState = progress;
            if (progressFill) {
              progressFill.style.width = `${progress.progress * 100}%`;
              progressText.textContent = `${Math.round(progress.progress * 100)}%`;
            }
            if (session.elapsed - (state.lastFieldSave || 0) > 1) {
              state.lastFieldSave = session.elapsed;
              session.save();
            }
          },
          onError: mistake,
          onComplete: completeTask,
        });
        const status = document.createElement("div");
        status.className = "procedure-progress";
        const caption = document.createElement("span");
        caption.textContent = state.interruption
          ? "Калибровка"
          : "Точность участка";
        progressText = document.createElement("strong");
        progressText.textContent = `${Math.round((currentTaskState()?.progress || 0) * 100)}%`;
        const track = document.createElement("div");
        track.className = "g-meter";
        progressFill = document.createElement("i");
        progressFill.style.width = `${(currentTaskState()?.progress || 0) * 100}%`;
        track.append(progressFill);
        status.append(caption, progressText, track);
        work.append(status);
        const exit = session.button(
          "Отложить инструмент · осмотреть палату",
          () => {
            stopField();
            state.working = false;
            session.save();
            render();
          },
        );
        work.append(exit);
      } else {
        const card = document.createElement("div");
        card.className = "surgical-start-card";
        const icon = document.createElement("span");
        icon.textContent = {
          hold: "◎",
          trace: "⌁",
          extract: "↗",
          align: "⤾",
          stitch: "⋈",
        }[active.kind];
        const caption = document.createElement("p");
        caption.textContent =
          "Выберите инструмент и коснитесь пациента в 3D-сцене, чтобы открыть увеличенное поле.";
        card.append(icon, caption);
        work.append(card);
        workButton = session.button(
          "Открыть операционное поле",
          startProcedure,
          "primary",
        );
        work.append(workButton);
      }
    }
    for (const [id, name] of Object.entries(TOOLS)) {
      const button = session.button(name, () => interact(id));
      button.dataset.tool = id;
      session.controls.append(button);
    }
    updateTools();
    scene.setTool(state.tool);
    session.setProgress(state.completed / totalTasks);
    session.setMetric("Стабильность", `${Math.round(state.stability)}%`);
    scene.setStatus(
      state.stability,
      state.interruption
        ? "НУЖНА КАЛИБРОВКА"
        : state.pendingReview
          ? "ПРОТОКОЛ ЗАВЕРШЁН"
          : "ОПЕРАЦИЯ",
    );
  }

  function finish(success, reason = "") {
    if (session.ended) return;
    stopField();
    const score = success
      ? clamp(
          100 -
            session.mistakes * 1.8 -
            Math.max(0, 75 - state.stability) * 0.5,
          40,
          100,
        )
      : Math.min(39, Math.floor((state.completed / totalTasks) * 39));
    session.finish(score, [
      success ? `Операция завершена: ${currentOperation.title}.` : reason,
      `Выполнено участков: ${state.completed} из ${totalTasks}.`,
      `Восстановлений наведения: ${state.eventsResolved}.`,
      `Итоговая стабильность: ${Math.round(state.stability)}%.`,
      "Процедуры представлены условными геометрическими игровыми задачами.",
    ]);
  }

  session.every(250, () => {
    if (session.ended || session.paused || destroyed) return;
    state.stability = Math.max(
      0,
      state.stability -
        (state.interruption ? 0.045 : 0.0035) *
          difficultyValue(difficulty, 0.7, 1, 1.35),
    );
    session.setMetric("Стабильность", `${Math.round(state.stability)}%`);
    scene.setStatus(
      state.stability,
      state.interruption
        ? "НУЖНА КАЛИБРОВКА"
        : state.pendingReview
          ? "КОНТРОЛЬ"
          : "ОПЕРАЦИЯ",
    );
    if (state.stability <= 0)
      finish(false, "Стабильность учебного поля потеряна.");
  });
  render();
  session.save();
  return {
    destroy() {
      destroyed = true;
      stopField();
      scene.dispose();
      session.destroy();
    },
  };
}
