import { GameSession, clamp, choose, difficultyValue } from "../js/game-kit.js";
import { MedicalScene, webglFallback } from "./medical-scene.js";

const CASES = [
  {
    name: "Ночной рейс",
    patient: "Алексей · 34 года",
    story:
      "После долгой смены тренировочный пациент теряет стабильность. Сенсоры ещё не подключены.",
    target: 68,
  },
  {
    name: "После марафона",
    patient: "Ирина · 28 лет",
    story:
      "Симулятор моделирует перегрузку. Важно восстановить ритм и удержать игровой контур в зелёной зоне.",
    target: 72,
  },
  {
    name: "Горный маршрут",
    patient: "Данияр · 41 год",
    story:
      "После эвакуации показатели нестабильны. Следите за контактом датчиков и динамикой монитора.",
    target: 75,
  },
  {
    name: "Возвращение домой",
    patient: "Виктор · 57 лет",
    story:
      "Пациент доставлен для наблюдения. Пройдите несколько циклов стабилизации без потери контакта.",
    target: 70,
  },
  {
    name: "Учебная тревога",
    patient: "Мария · 32 года",
    story:
      "Умный манекен проверяет реакцию на внезапные сигналы оборудования. Все показатели условные.",
    target: 74,
  },
  {
    name: "Зимняя смена",
    patient: "Айгерим · 26 лет",
    story:
      "После транспортировки нужно проверить датчики, настроить контур и восстановить устойчивый ритм.",
    target: 73,
  },
  {
    name: "Перевод в палату",
    patient: "Сергей · 46 лет",
    story:
      "Новая палата, неподключённое оборудование и несколько этапов наблюдения. Не упускайте сигналы монитора.",
    target: 71,
  },
];

const PHASE_LABELS = {
  connect: "ПОДКЛЮЧЕНИЕ",
  assess: "СКАНИРОВАНИЕ",
  oxygen: "НАСТРОЙКА КОНТУРА",
  rhythm: "РИТМ",
  event: "СИГНАЛ ОБОРУДОВАНИЯ",
  review: "КОНТРОЛЬ",
};

export async function mount(ctx) {
  const difficulty = ctx.difficulty || "easy";
  const rounds = difficultyValue(difficulty, 6, 7, 8);
  const initial = {
    case: choose(CASES),
    phase: "connect",
    round: 0,
    stability: 62,
    monitorReady: false,
    tool: null,
    oxygenValue: 35,
    target: 52 + Math.round(Math.random() * 29),
    charge: 0,
    assessment: 0,
    rhythmHits: [],
    rhythmMissed: 0,
    rhythmStart: null,
    complications: 0,
    eventType: null,
  };
  const session = new GameSession(ctx, {
    title: "Стабилизация",
    subtitle: "ФЕЛЬДШЕР · ИНТЕРАКТИВНОЕ 3D",
    duration: difficultyValue(difficulty, 600, 570, 540),
    state: initial,
  });
  const state = session.state;
  session.scene.classList.add("three-scene", "feldsher-scene");
  let scene,
    holding = false,
    disposed = false,
    lastError = -10,
    phaseUi = {},
    hitTimeout;
  let tickAt = performance.now();
  let rhythmOrigin =
    performance.now() -
    (session.elapsed - (state.rhythmStart ?? session.elapsed)) * 1000;
  const world = document.createElement("div");
  world.className = "three-world";
  const work = document.createElement("div");
  work.className = "medical-workstation";
  session.scene.append(world, work);
  try {
    scene = new MedicalScene(world, {
      mode: "feldsher",
      quality: ctx.settings?.quality,
      onInteract: interact,
    });
  } catch {
    work.remove();
    world.remove();
    webglFallback(session);
    return { destroy: () => session.destroy() };
  }

  const cameraBar = document.createElement("div");
  cameraBar.className = "scene-camera-bar";
  cameraBar.append(
    session.button("◎ К пациенту", () => scene.focus("field")),
    session.button("▧ Палата", () => scene.focus("room")),
    session.button("↗ Монитор", () => scene.focus("monitor")),
  );
  world.append(cameraBar);
  const patientInfo = document.createElement("div");
  patientInfo.className = "scene-patient";
  patientInfo.textContent = `${state.case.patient} · ${state.case.name}`;
  world.append(patientInfo);
  const orientation = document.createElement("div");
  orientation.className = "landscape-tip";
  orientation.textContent = "↻ Для широкого обзора поверните телефон";
  world.append(orientation);
  session.hint.textContent =
    "Учебная игровая система: условные показатели и действия. Проведите по палате для вращения, разведите два пальца для масштаба. Инструмент можно перенести на пациента или выбрать кнопкой.";
  session.onTimeout = () => finish(false, "Время наблюдения истекло.");

  function fail(message) {
    if (session.elapsed - lastError < 0.65) return;
    lastError = session.elapsed;
    state.stability = clamp(state.stability - 3, 0, 100);
    session.miss(message);
  }

  function next(phase) {
    state.phase = phase;
    state.tool = null;
    holding = false;
    scene.setTool(null);
    if (phase === "assess") state.assessment = 0;
    if (phase === "oxygen") state.charge = 0;
    if (phase === "rhythm") {
      state.rhythmHits = [];
      state.rhythmStart = session.elapsed + 1.5;
      rhythmOrigin = performance.now() + 1500;
    }
    if (phase === "event") {
      state.eventType = choose(["contact", "flow", "movement"]);
      state.charge = 0;
      state.assessment = 0;
      state.eventResolved = false;
      state.eventStarted = session.elapsed;
      state.target = 38 + Math.round(Math.random() * 43);
      state.complications++;
    }
    session.save();
    render();
  }

  function interact(target, draggedTool) {
    if (disposed || session.ended) return;
    if (draggedTool) state.tool = draggedTool;
    if (target === "tray") {
      session.feedback(
        "Выберите датчик, ритм-панели или маску. Затем коснитесь пациента.",
      );
      return;
    }
    if (["sensor", "pads", "mask"].includes(target)) {
      state.tool = target;
      scene.setTool(target);
      session.save();
      session.feedback(
        `${{ sensor: "Датчик", pads: "Ритм-панели", mask: "Маска контура" }[target]} выбран. Коснитесь пациента.`,
      );
      updateTools();
      return;
    }
    if (target === "monitor") {
      if (state.phase === "connect") {
        if (!state.monitorReady) session.hit();
        state.monitorReady = true;
        session.feedback(
          "Монитор включён. Теперь выберите датчик и перенесите его на пациента.",
        );
        render();
      } else if (state.phase === "review") {
        session.hit();
        state.stability = Math.min(100, state.stability + 8);
        if (state.round + 1 >= rounds) finish(true);
        else {
          state.round++;
          state.target = 48 + Math.round(Math.random() * 33);
          session.feedback(
            "Цикл наблюдения завершён. Следующий сценарий требует новой настройки.",
          );
          next("assess");
        }
      } else scene.focus("monitor");
      return;
    }
    if (target === "oxygen") {
      if (
        state.phase === "oxygen" ||
        (state.phase === "event" && state.eventType === "flow")
      ) {
        phaseUi.slider?.focus();
        session.feedback(
          "Установите регулятор в зелёный диапазон и удерживайте кнопку подачи.",
        );
      } else
        session.feedback("Контур исправен. Сейчас выполните текущую задачу.");
      return;
    }
    if (target !== "patient") return;
    if (state.phase === "connect") {
      if (!state.monitorReady) {
        session.feedback("Сначала включите монитор слева от кушетки.", false);
        return;
      }
      if (state.tool !== "sensor") {
        fail("Для подключения нужен датчик, расположенный на столике.");
        return;
      }
      session.hit();
      state.stability += 5;
      next("assess");
    } else if (state.phase === "assess") {
      phaseUi.hold?.focus();
      session.feedback(
        "Удерживайте кнопку сканирования, чтобы изучить состояние.",
      );
      scene.focus("field");
    } else if (state.phase === "oxygen") {
      if (state.tool === "mask") {
        if (!state.maskReady) session.hit();
        state.maskReady = true;
        session.feedback("Маска подключена. Настройте игровой контур.");
        render();
      } else {
        session.feedback("Выберите маску контура и коснитесь пациента.");
      }
    } else if (state.phase === "rhythm") {
      if (state.tool === "pads") {
        if (!state.padsReady) session.hit();
        state.padsReady = true;
        session.feedback("Панели готовы. Попадайте в ритм светового кольца.");
        render();
      } else session.feedback("Выберите ритм-панели на столике.");
    } else if (state.phase === "event") {
      if (state.eventType === "contact") {
        if (state.tool === "sensor") resolveEvent("Контакт восстановлен.");
        else fail("Сигнал датчика прерывается: переподключите датчик.");
      } else if (state.eventType === "movement") {
        phaseUi.hold?.focus();
        session.feedback(
          "Удерживайте кнопку стабилизации до заполнения шкалы.",
        );
      }
    }
  }

  function updateTools() {
    session.controls
      .querySelectorAll("[data-tool]")
      .forEach((button) =>
        button.classList.toggle("selected", button.dataset.tool === state.tool),
      );
  }

  function holdButton(label) {
    const button = session.button(label, () => {}, "primary hold-action");
    session.listen(button, "pointerdown", (event) => {
      if (event.isPrimary === false) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      holding = true;
      button.classList.add("holding");
    });
    const release = () => {
      holding = false;
      button.classList.remove("holding");
    };
    session.listen(button, "pointerup", release);
    session.listen(button, "pointercancel", release);
    session.listen(button, "blur", release);
    session.listen(button, "keydown", (event) => {
      if (event.code === "Space" || event.code === "Enter") {
        event.preventDefault();
        holding = true;
        button.classList.add("holding");
      }
    });
    session.listen(button, "keyup", release);
    phaseUi.hold = button;
    return button;
  }

  function heading(title, text) {
    const label = document.createElement("span");
    label.className = "g-label";
    label.textContent = `ЦИКЛ ${state.round + 1} / ${rounds} · ${PHASE_LABELS[state.phase]}`;
    const h = document.createElement("h3");
    h.textContent = title;
    const p = document.createElement("p");
    p.className = "medical-instruction";
    p.textContent = text;
    work.append(label, h, p);
    session.setObjective(title);
  }

  function meter(label) {
    const wrapper = document.createElement("div");
    wrapper.className = "procedure-progress";
    const text = document.createElement("span");
    text.textContent = label;
    const number = document.createElement("strong");
    number.textContent = "0%";
    const track = document.createElement("div");
    track.className = "g-meter";
    const fill = document.createElement("i");
    track.append(fill);
    wrapper.append(text, number, track);
    work.append(wrapper);
    phaseUi.fill = fill;
    phaseUi.number = number;
  }

  function regulator(eventMode = false) {
    const tolerance = difficultyValue(difficulty, 10, 7, 5);
    const band = document.createElement("div");
    band.className = "oxygen-band";
    const area = document.createElement("i");
    area.style.left = `${state.target - tolerance}%`;
    area.style.width = `${tolerance * 2}%`;
    band.append(area);
    const input = document.createElement("input");
    input.type = "range";
    input.min = "0";
    input.max = "100";
    input.step = "1";
    input.value = state.oxygenValue;
    input.setAttribute("aria-label", "Регулятор условного игрового контура");
    session.listen(input, "input", () => {
      state.oxygenValue = Number(input.value);
      phaseUi.setting.textContent = `${state.oxygenValue} ед.`;
    });
    session.listen(input, "change", () => session.save());
    const caption = document.createElement("div");
    caption.className = "g-row regulator-caption";
    const captionText = document.createElement("span");
    captionText.textContent = `Зелёная зона: ${state.target - tolerance}–${state.target + tolerance}`;
    const setting = document.createElement("strong");
    setting.textContent = `${state.oxygenValue} ед.`;
    caption.append(captionText, setting);
    work.append(band, input, caption);
    phaseUi.slider = input;
    phaseUi.setting = setting;
    meter(eventMode ? "Восстановление контура" : "Устойчивость потока");
    const hold = holdButton("Удерживать подачу");
    hold.disabled = !eventMode && !state.maskReady;
    work.append(hold);
  }

  function render() {
    holding = false;
    work.replaceChildren();
    phaseUi = {};
    session.controls.replaceChildren();
    const phase = state.phase;
    if (phase === "connect") {
      heading("Подключите монитор", state.case.story);
      const checklist = document.createElement("div");
      checklist.className = "medical-checklist";
      for (const [done, label] of [
        [state.monitorReady, "Включить монитор"],
        [false, "Подключить датчик к пациенту"],
      ]) {
        const item = document.createElement("div");
        item.className = done ? "done" : "";
        item.textContent = `${done ? "✓" : "○"} ${label}`;
        checklist.append(item);
      }
      work.append(
        checklist,
        session.button(
          "Включить монитор",
          () => interact("monitor"),
          "primary",
        ),
      );
    } else if (phase === "assess") {
      heading(
        "Изучите динамику пациента",
        "Коснитесь пациента для фокусировки. Удерживайте сканер, пока он не соберёт полный набор условных данных.",
      );
      meter("Сканирование");
      work.append(holdButton("Удерживать сканер"));
    } else if (phase === "oxygen") {
      heading(
        "Настройте условный контур",
        state.maskReady
          ? "Плавно сдвиньте регулятор в зелёную зону. Удерживайте подачу: за пределами зоны прогресс снижается."
          : "Выберите маску на столике и коснитесь пациента. Затем настройте регулятор в зелёную зону.",
      );
      regulator();
    } else if (phase === "rhythm") {
      heading(
        "Поймайте световой ритм",
        state.padsReady
          ? "Нажимайте большую кнопку, когда кольцо совпадает с бирюзовой окружностью. Один импульс — одно нажатие. Клавиатура: пробел."
          : "Выберите ритм-панели и коснитесь пациента. После подключения начнётся световая последовательность.",
      );
      const rhythm = document.createElement("div");
      rhythm.className = "rhythm-display";
      const pulse = document.createElement("i");
      pulse.className = "rhythm-pulse";
      const text = document.createElement("strong");
      text.textContent = "ГОТОВНОСТЬ";
      rhythm.append(pulse, text);
      work.append(rhythm);
      phaseUi.rhythm = rhythm;
      phaseUi.pulse = pulse;
      phaseUi.rhythmText = text;
      const tap = session.button("● Импульс", tapRhythm, "primary rhythm-tap");
      tap.disabled = !state.padsReady;
      work.append(tap);
      phaseUi.tap = tap;
    } else if (phase === "event") {
      const descriptions = {
        contact: [
          "Потеря контакта датчика",
          "Монитор сообщает о разрыве контакта. Выберите датчик и подключите его к пациенту повторно.",
        ],
        flow: [
          "Сбой игрового контура",
          "Зелёный диапазон изменился. Перенастройте регулятор и удерживайте подачу для восстановления.",
        ],
        movement: [
          "Движение пациента",
          "Манекен сместился. Удерживайте стабилизацию, чтобы восстановить точность показаний.",
        ],
      };
      heading(...descriptions[state.eventType]);
      if (state.eventType === "flow") regulator(true);
      if (state.eventType === "movement") {
        meter("Стабилизация");
        work.append(holdButton("Удерживать стабилизацию"));
      }
      if (state.eventType === "contact") {
        const signal = document.createElement("div");
        signal.className = "medical-alert";
        signal.textContent = "⚠ CONTACT LOST";
        work.append(signal);
      }
    } else if (phase === "review") {
      heading(
        "Подтвердите контрольный осмотр",
        `Оборудование стабильно. Проверьте монитор и подтвердите передачу ${state.round + 1 >= rounds ? "на наблюдение" : "к следующему циклу"}.`,
      );
      const summary = document.createElement("div");
      summary.className = "medical-round-summary";
      summary.textContent = `✓ Сканирование  ✓ Контур  ✓ Ритм  ✓ Сигнал оборудования`;
      work.append(summary);
      work.append(
        session.button(
          "Проверить монитор",
          () => interact("monitor"),
          "primary",
        ),
      );
    }
    for (const [id, label] of [
      ["sensor", "◉ Датчик"],
      ["mask", "◌ Маска"],
      ["pads", "▣ Ритм-панели"],
    ]) {
      const button = session.button(label, () => interact(id));
      button.dataset.tool = id;
      session.controls.append(button);
    }
    updateTools();
    scene.setStatus(state.stability, PHASE_LABELS[phase]);
    scene.setTool(state.tool);
    session.setMetric("Стабильность", `${Math.round(state.stability)}%`);
    session.setProgress(
      (state.round +
        ["connect", "assess", "oxygen", "rhythm", "event", "review"].indexOf(
          phase,
        ) /
          6) /
        rounds,
    );
  }

  function tapRhythm() {
    if (state.phase !== "rhythm" || !state.padsReady || session.ended) return;
    const period = difficultyValue(difficulty, 0.78, 0.66, 0.56);
    const total = difficultyValue(difficulty, 28, 34, 40);
    const raw = (performance.now() - rhythmOrigin) / 1000 / period;
    const beat = Math.round(raw);
    const tolerance = difficultyValue(difficulty, 0.25, 0.21, 0.17);
    if (
      beat >= 0 &&
      beat < total &&
      Math.abs(raw - beat) <= tolerance &&
      !state.rhythmHits.includes(beat)
    ) {
      state.rhythmHits.push(beat);
      state.stability = Math.min(100, state.stability + 0.7);
      phaseUi.rhythm?.classList.add("hit");
      clearTimeout(hitTimeout);
      hitTimeout = setTimeout(
        () => phaseUi.rhythm?.classList.remove("hit"),
        180,
      );
      ctx.audio?.play("monitor");
      session.hit();
    } else fail("Импульс вне светового окна. Дождитесь совпадения колец.");
    session.save();
  }

  function resolveEvent(message) {
    state.eventResolved = true;
    state.stability = clamp(state.stability + 9, 0, 100);
    session.hit();
    session.feedback(message);
    next("review");
  }

  function finish(success, reason = "") {
    if (session.ended) return;
    const score = success
      ? clamp(
          100 -
            session.mistakes * 2.6 -
            state.rhythmMissed * 0.7 -
            Math.max(0, 68 - state.stability) * 0.55,
          40,
          100,
        )
      : Math.min(39, (state.round / rounds) * 38);
    session.finish(score, [
      success
        ? `Пациент передан на наблюдение. Завершено циклов: ${rounds}.`
        : reason,
      `Сценарий: ${state.case.name}.`,
      `Устранено сигналов оборудования: ${state.complications}.`,
      "Все процедуры и показатели являются условными игровыми механиками.",
    ]);
  }

  session.listen(document, "keydown", (event) => {
    if (
      event.code === "Space" &&
      state.phase === "rhythm" &&
      !["INPUT", "BUTTON"].includes(event.target.tagName)
    ) {
      event.preventDefault();
      if (!event.repeat) tapRhythm();
    }
  });
  session.listen(document, "visibilitychange", () => {
    if (document.hidden) holding = false;
  });
  session.every(100, () => {
    const now = performance.now();
    const rawDt = (now - tickAt) / 1000;
    tickAt = now;
    if (session.ended || session.paused || disposed || document.hidden) {
      rhythmOrigin += rawDt * 1000;
      return;
    }
    const dt = Math.min(0.5, rawDt);
    state.stability = Math.max(
      0,
      state.stability -
        dt *
          (state.phase === "event"
            ? difficultyValue(difficulty, 0.16, 0.22, 0.3)
            : difficultyValue(difficulty, 0.018, 0.035, 0.055)),
    );
    if (state.phase === "assess") {
      if (holding)
        state.assessment = clamp(
          state.assessment + dt / difficultyValue(difficulty, 4, 5, 6),
          0,
          1,
        );
      phaseUi.fill.style.width = `${state.assessment * 100}%`;
      phaseUi.number.textContent = `${Math.round(state.assessment * 100)}%`;
      if (state.assessment >= 1) {
        session.hit();
        state.stability += 3;
        state.maskReady = false;
        next("oxygen");
      }
    } else if (
      state.phase === "oxygen" ||
      (state.phase === "event" && state.eventType === "flow")
    ) {
      const tolerance = difficultyValue(difficulty, 10, 7, 5);
      if (holding && Math.abs(state.oxygenValue - state.target) <= tolerance)
        state.charge = clamp(
          state.charge +
            dt /
              (state.phase === "event"
                ? 4
                : difficultyValue(difficulty, 12, 14, 16)),
          0,
          1,
        );
      else if (holding) {
        state.charge = Math.max(0, state.charge - dt * 0.06);
        fail("Подача вне зелёной зоны. Плавно настройте регулятор.");
      }
      phaseUi.fill.style.width = `${state.charge * 100}%`;
      phaseUi.number.textContent = `${Math.round(state.charge * 100)}%`;
      if (state.charge >= 1) {
        if (state.phase === "event") resolveEvent("Контур восстановлен.");
        else {
          session.hit();
          state.stability = Math.min(100, state.stability + 6);
          state.padsReady = false;
          next("rhythm");
        }
      }
    } else if (state.phase === "rhythm") {
      if (!state.padsReady) {
        state.rhythmStart = session.elapsed + 1.3;
        rhythmOrigin = performance.now() + 1300;
      }
      const period = difficultyValue(difficulty, 0.78, 0.66, 0.56);
      const total = difficultyValue(difficulty, 28, 34, 40);
      const raw = (performance.now() - rhythmOrigin) / 1000 / period;
      const phase = ((raw % 1) + 1) % 1;
      phaseUi.pulse.style.transform = `scale(${0.4 + (1 - phase) * 0.6})`;
      phaseUi.rhythm.classList.toggle(
        "in-window",
        Math.min(phase, 1 - phase) <
          difficultyValue(difficulty, 0.25, 0.21, 0.17),
      );
      phaseUi.rhythmText.textContent =
        raw < 0 ? "ПРИГОТОВЬТЕСЬ" : `${state.rhythmHits.length} / ${total}`;
      if (state.padsReady && raw > total - 0.5) {
        const missed = total - state.rhythmHits.length;
        state.rhythmMissed += missed;
        state.stability = Math.max(0, state.stability - missed * 1.2);
        if (state.rhythmHits.length >= Math.ceil(total * 0.5)) next("event");
        else {
          session.miss(
            "Ритм не удержан. Повторите последовательность, ориентируясь на кольцо.",
          );
          state.padsReady = true;
          next("rhythm");
        }
      }
    } else if (state.phase === "event" && state.eventType === "movement") {
      if (holding)
        state.assessment = clamp(
          state.assessment + dt / difficultyValue(difficulty, 4, 5, 6),
          0,
          1,
        );
      phaseUi.fill.style.width = `${state.assessment * 100}%`;
      phaseUi.number.textContent = `${Math.round(state.assessment * 100)}%`;
      if (state.assessment >= 1)
        resolveEvent("Пациент стабилизирован, контакт восстановлен.");
    }
    state.stability = clamp(state.stability, 0, 100);
    session.setMetric("Стабильность", `${Math.round(state.stability)}%`);
    scene.setStatus(state.stability, PHASE_LABELS[state.phase]);
    if (state.stability <= 0)
      finish(false, "Стабильность тренировочного пациента потеряна.");
  });
  render();
  session.save();
  return {
    destroy() {
      disposed = true;
      holding = false;
      clearTimeout(hitTimeout);
      scene.dispose();
      session.destroy();
    },
  };
}
