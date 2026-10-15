import {
  GameSession,
  shuffle,
  clamp,
  difficultyValue,
} from "../js/game-kit.js";

// The substances, protocols and readings below exist only inside this game.
const CASES = [
  {
    id: "n01",
    name: "Ночной курьер",
    age: 24,
    story: "После ночной доставки заметил мерцающие огни и сильную усталость.",
    sample: "N7",
    agent: "Неон N7",
    peaks: [0.19, 0.46, 0.79],
    gain: 64,
    history: "Говорит, что весь день не пользовался энергетическими капсулами.",
    fact: "В кармане найдена упаковка капсул N7.",
    contradiction: "Не принимал капсулы",
    options: ["Не принимал капсулы", "Работал ночью", "Чувствует усталость"],
    protocol: "quiet",
  },
  {
    id: "n02",
    name: "Садовник оранжереи",
    age: 47,
    story:
      "На работе появилась сонливость; на перчатках осталась светящаяся пыль.",
    sample: "L2",
    agent: "Лотос L2",
    peaks: [0.25, 0.54, 0.85],
    gain: 48,
    history: "Уверен, что сегодня не заходил в оранжерею.",
    fact: "На одежде обнаружена пыль сектора L2.",
    contradiction: "Не был в оранжерее",
    options: ["Не был в оранжерее", "Носил перчатки", "Пришёл с работы"],
    protocol: "observe",
  },
  {
    id: "n03",
    name: "Звукооператор",
    age: 31,
    story:
      "После репетиции трудно сосредоточиться, движения стали замедленными.",
    sample: "I4",
    agent: "Ирис I4",
    peaks: [0.15, 0.39, 0.71],
    gain: 74,
    history: "Говорит, что пил только воду из запечатанной бутылки.",
    fact: "Контроль выявил след I4 в открытой бутылке.",
    contradiction: "Бутылка была запечатана",
    options: [
      "Бутылка была запечатана",
      "Была репетиция",
      "Трудно сосредоточиться",
    ],
    protocol: "control",
  },
  {
    id: "n04",
    name: "Дизайнер выставки",
    age: 29,
    story: "После монтажа декораций появились странные ощущения и утомление.",
    sample: "A3",
    agent: "Астра A3",
    peaks: [0.28, 0.61, 0.82],
    gain: 56,
    history: "Отрицает работу с краской серии A3.",
    fact: "В журнале указан открытый им комплект A3.",
    contradiction: "Не открывал комплект A3",
    options: [
      "Не открывал комплект A3",
      "Монтировал декорации",
      "Чувствует утомление",
    ],
    protocol: "quiet",
  },
  {
    id: "n05",
    name: "Пассажир экспресса",
    age: 38,
    story: "После поездки стал рассеянным, путает названия станций.",
    sample: "V8",
    agent: "Вега V8",
    peaks: [0.11, 0.48, 0.73],
    gain: 81,
    history: "Считает, что не пробовал напиток попутчика.",
    fact: "Спектр совпадает с пробой напитка V8.",
    contradiction: "Не пробовал напиток",
    options: ["Не пробовал напиток", "Ехал экспрессом", "Путает станции"],
    protocol: "observe",
  },
  {
    id: "n06",
    name: "Лаборант архива",
    age: 42,
    story: "После сортировки старых образцов появилась необычная сонливость.",
    sample: "K5",
    agent: "Кварц K5",
    peaks: [0.21, 0.42, 0.88],
    gain: 61,
    history: "Говорит, что контейнер K5 оставался закрытым.",
    fact: "Датчик контейнера зарегистрировал открытие.",
    contradiction: "Контейнер не открывался",
    options: [
      "Контейнер не открывался",
      "Работал в архиве",
      "Чувствует сонливость",
    ],
    protocol: "control",
  },
  {
    id: "n07",
    name: "Участник фестиваля",
    age: 22,
    story: "После яркого шоу беспокоится и не может удержать внимание.",
    sample: "R1",
    agent: "Рубин R1",
    peaks: [0.32, 0.55, 0.75],
    gain: 70,
    history: "Уверяет, что светящийся браслет не повреждён.",
    fact: "На браслете трещина со следами R1.",
    contradiction: "Браслет цел",
    options: ["Браслет цел", "Посещал шоу", "Трудно удержать внимание"],
    protocol: "quiet",
  },
  {
    id: "n08",
    name: "Пилот дрона",
    age: 34,
    story: "После настройки дрона стал медленно реагировать на сигналы.",
    sample: "S6",
    agent: "Сапфир S6",
    peaks: [0.17, 0.57, 0.81],
    gain: 45,
    history: "Отрицает контакт с охлаждающим картриджем.",
    fact: "В смыве с перчаток найден след S6.",
    contradiction: "Не касался картриджа",
    options: ["Не касался картриджа", "Настраивал дрон", "Реагирует медленно"],
    protocol: "observe",
  },
  {
    id: "n09",
    name: "Хранитель музея",
    age: 56,
    story: "После уборки витрины заметил странные цветные блики.",
    sample: "O9",
    agent: "Опал O9",
    peaks: [0.23, 0.38, 0.68],
    gain: 78,
    history: "Сообщает, что защитная плёнка была целой.",
    fact: "В журнале контроля отмечен разрыв плёнки O9.",
    contradiction: "Плёнка была целой",
    options: ["Плёнка была целой", "Убирал витрину", "Видит блики"],
    protocol: "control",
  },
  {
    id: "n10",
    name: "Механик дирижабля",
    age: 39,
    story: "После смены стал забывать последовательность рабочих операций.",
    sample: "F2",
    agent: "Флюор F2",
    peaks: [0.12, 0.51, 0.89],
    gain: 53,
    history: "Считает, что фильтр F2 заменили вчера.",
    fact: "Бирка фильтра показывает пропущенную замену.",
    contradiction: "Фильтр заменён",
    options: [
      "Фильтр заменён",
      "Была рабочая смена",
      "Забывает порядок операций",
    ],
    protocol: "observe",
  },
  {
    id: "n11",
    name: "Кондитер",
    age: 27,
    story:
      "После тестирования нового декора появились усталость и рассеянность.",
    sample: "M4",
    agent: "Мираж M4",
    peaks: [0.27, 0.47, 0.69],
    gain: 66,
    history: "Утверждает, что не открывал банку декора M4.",
    fact: "Защитное кольцо банки M4 снято.",
    contradiction: "Банка не открывалась",
    options: [
      "Банка не открывалась",
      "Тестировал декор",
      "Чувствует усталость",
    ],
    protocol: "quiet",
  },
  {
    id: "n12",
    name: "Инженер станции",
    age: 45,
    story: "После проверки светового модуля появились необычные ощущения.",
    sample: "P3",
    agent: "Призма P3",
    peaks: [0.18, 0.62, 0.84],
    gain: 59,
    history: "Говорит, что модуль был обесточен всё время.",
    fact: "Лог фиксирует включение и выброс частиц P3.",
    contradiction: "Модуль не включался",
    options: ["Модуль не включался", "Проверял модуль", "Пришёл после работы"],
    protocol: "control",
  },
  {
    id: "n13",
    name: "Тестировщик аттракционов",
    age: 26,
    story: "После тестового заезда трудно сконцентрироваться на беседе.",
    sample: "T8",
    agent: "Топаз T8",
    peaks: [0.14, 0.44, 0.77],
    gain: 72,
    history: "Отрицает использование туманного эффекта.",
    fact: "На костюме есть маркер генератора T8.",
    contradiction: "Эффект тумана отключён",
    options: [
      "Эффект тумана отключён",
      "Был тестовый заезд",
      "Трудно сконцентрироваться",
    ],
    protocol: "quiet",
  },
  {
    id: "n14",
    name: "Флорист",
    age: 33,
    story: "После составления светящейся композиции чувствует сонливость.",
    sample: "E5",
    agent: "Эхо E5",
    peaks: [0.29, 0.58, 0.86],
    gain: 50,
    history: "Говорит, что работал только с обычными цветами.",
    fact: "В составе композиции обнаружен синтетический E5.",
    contradiction: "Только обычные цветы",
    options: [
      "Только обычные цветы",
      "Создавал композицию",
      "Чувствует сонливость",
    ],
    protocol: "observe",
  },
  {
    id: "n15",
    name: "Актёр иммерсивного театра",
    age: 40,
    story: "После спектакля путает реплики и медленнее отвечает.",
    sample: "G6",
    agent: "Гелиос G6",
    peaks: [0.22, 0.52, 0.72],
    gain: 83,
    history: "Уверен, что реквизитный баллон не использовался.",
    fact: "Индикатор баллона G6 показывает расход.",
    contradiction: "Баллон не использовался",
    options: ["Баллон не использовался", "Играл спектакль", "Путает реплики"],
    protocol: "control",
  },
];
const PROTOCOLS = [
  {
    id: "quiet",
    name: "«Тихая палата»",
    text: "Снизить игровые раздражители; передать врачу.",
  },
  {
    id: "observe",
    name: "«Наблюдение»",
    text: "Записать динамику сигнала; передать врачу.",
  },
  {
    id: "control",
    name: "«Контроль образца»",
    text: "Изолировать пробу; передать контрольной группе.",
  },
];
const PROTOCOL_NAMES = {
  quiet: "«Тихая палата»",
  observe: "«Наблюдение»",
  control: "«Контроль образца»",
};
const family = (id) => CASES.find((c) => c.id === id);
const wavePath = (peaks, gain = 65, shift = 0) =>
  Array.from({ length: 161 }, (_, i) => {
    const x = i / 160;
    const y = peaks.reduce(
      (s, p, k) =>
        s +
        Math.exp(-((x - p - shift) ** 2) / (k === 1 ? 0.0008 : 0.00045)) *
          (k === 1 ? 0.87 : 1),
      0,
    );
    return `${i ? "L" : "M"}${(x * 600).toFixed(1)},${(160 - y * gain * 1.45).toFixed(1)}`;
  }).join(" ");

export async function mount(ctx) {
  const count = difficultyValue(ctx.difficulty, 4, 5, 6);
  const initial = {
    ids: shuffle(CASES.map((c) => c.id)).slice(0, count),
    index: 0,
    stage: "load",
    loaded: false,
    shift: Math.random() > 0.5 ? 0.17 : -0.17,
    gain: 35,
    tests: [],
    chosenAgent: null,
    chosenProtocol: null,
    contradiction: null,
    calibrated: false,
    reports: [],
    caseMistakes: 0,
  };
  const game = new GameSession(ctx, {
    title: "Токсикологический анализ",
    subtitle: "Лаборатория спектральных следов",
    duration: difficultyValue(ctx.difficulty, 480, 450, 420),
    state: initial,
  });
  const s = game.state;
  game.scene.classList.add("diagnostic-scene", "laboratory-scene");
  let activeDrag = null,
    move = null,
    up = null;
  const current = () => family(s.ids[s.index]);
  const persist = () => {
    game.save();
    game.setProgress(s.index / s.ids.length);
    game.setMetric(
      "Исследования",
      `${Math.max(0, difficultyValue(ctx.difficulty, 4, 3, 2) - s.tests.length)}`,
    );
  };
  const cleanDrag = () => {
    if (move) window.removeEventListener("pointermove", move);
    if (up) {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    }
    move = up = null;
    activeDrag = null;
  };
  function wrong(message) {
    s.caseMistakes++;
    game.miss(message);
    persist();
  }
  function next() {
    const c = current();
    s.reports.push({ name: c.name, agent: c.agent, errors: s.caseMistakes });
    s.index++;
    if (s.index === s.ids.length) {
      const total = s.reports.reduce((n, r) => n + r.errors, 0);
      game.finish(
        clamp(Math.round(100 - total * 5), 15, 100),
        s.reports.map((r) => `${r.name}: ${r.agent}; ошибок ${r.errors}`),
      );
      return;
    }
    Object.assign(s, {
      stage: "load",
      loaded: false,
      shift: Math.random() > 0.5 ? 0.17 : -0.17,
      gain: 35,
      tests: [],
      chosenAgent: null,
      chosenProtocol: null,
      contradiction: null,
      calibrated: false,
      caseMistakes: 0,
    });
    game.save();
    render();
  }
  function render() {
    cleanDrag();
    const c = current();
    const limit = difficultyValue(ctx.difficulty, 4, 3, 2);
    game.setObjective(
      s.calibrated
        ? "Сопоставьте след, найдите противоречие и выберите игровой протокол."
        : s.loaded
          ? "Совместите бирюзовый сигнал с пунктирным эталоном."
          : "Перетащите пробирку в гнездо анализатора.",
    );
    game.hint.textContent =
      "Условная лабораторная головоломка. Все вещества и протоколы вымышлены. Ведите линию пальцем, меняйте усиление ползунком.";
    game.scene.innerHTML = `<div class="dx-case-strip"><span class="dx-live"><i></i> LAB / ${s.index + 1} ИЗ ${s.ids.length}</span><span>ОБРАЗЕЦ ${c.sample} · ${ctx.difficulty === "hard" ? "ЭКСПЕРТ" : "АНАЛИЗ"}</span></div>
      <div class="dx-lab-grid"><section class="dx-patient-card"><div class="dx-patient-icon">◉<span>+ </span></div><div><small>КАРТА ПАЦИЕНТА · ${c.age}</small><h3>${c.name}</h3><p>${c.story}</p></div></section>
      <div class="dx-analyzer ${s.loaded ? "is-loaded" : ""}"><div class="dx-machine-header"><span>SPCT / 08</span><span class="dx-live"><i></i>${s.calibrated ? "СЛЕД ВЫДЕЛЕН" : s.loaded ? "СИГНАЛ ПРИНЯТ" : "ОЖИДАНИЕ ПРОБЫ"}</span></div><div class="dx-chart"><svg viewBox="0 0 600 190" role="img" aria-label="Спектр образца. Перетащите линию для совмещения с пунктирным эталоном"><defs><pattern id="labgrid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="currentColor" opacity=".16"/></pattern></defs><rect width="600" height="190" fill="url(#labgrid)"/><path d="${wavePath(c.peaks, c.gain)}" class="dx-reference"/><path id="lab-wave" d="${wavePath(c.peaks, s.gain, s.shift)}" class="dx-wave"/><text x="14" y="22" class="dx-chart-text">${s.calibrated ? "СОВПАДЕНИЕ ПОДТВЕРЖДЕНО" : "← СДВИГ СПЕКТРА →"}</text></svg></div>
      <div class="dx-calibration"><label>УСИЛЕНИЕ <input aria-label="Усиление спектра" id="lab-gain" type="range" min="25" max="95" value="${s.gain}" ${!s.loaded || s.calibrated ? "disabled" : ""}/><output>${s.gain}%</output></label><div class="dx-sample-dock" id="sample-dock"><span>${s.loaded ? "◈ ПРОБА ПОДКЛЮЧЕНА" : "↓ ПОМЕСТИТЬ ПРОБУ"}</span></div></div></div>
      <div class="dx-bench"><div class="dx-vial ${s.loaded ? "used" : ""}" id="lab-vial" role="button" tabindex="0" aria-label="Образец. Перетащите в анализатор или нажмите для установки"><i></i><span>${c.sample}</span></div><div class="dx-bench-caption"><b>Виртуальный образец</b><small>${s.loaded ? "Проба в анализаторе" : "Перетащите в подсвеченное гнездо ↗"}</small></div><span class="dx-molecule">✦<i>◌</i></span></div>
      </div>
      <div class="dx-evidence-grid"><article class="dx-note"><small>СЛОВА ПАЦИЕНТА</small><p>«${c.history}»</p></article><article class="dx-note"><small>КОНТРОЛЬ / ${s.tests.length} ИЗ ${limit}</small><p>${s.tests.includes("history") ? c.fact : "Сверьте историю с контрольным журналом."}</p></article></div>
      ${s.calibrated ? `<div class="dx-assay-report"><span class="dx-live"><i></i> СПЕКТР ВЫДЕЛЕН</span><p>Маркер: <b>${c.sample}</b>. Протокол допуска: <b>${PROTOCOL_NAMES[c.protocol]}</b>.</p><small>Сопоставьте маркер с картотекой ниже. Для хорошего заключения нужна проверка истории.</small></div>` : ""}`;
    game.controls.innerHTML = "";
    if (!s.calibrated) {
      game.controls.append(
        game.button(
          "Проверить совмещение",
          () => {
            if (!s.loaded) {
              game.feedback("Сначала установите виртуальную пробу.", false);
              return;
            }
            const tolerance = difficultyValue(
                ctx.difficulty,
                0.025,
                0.018,
                0.012,
              ),
              gainTol = difficultyValue(ctx.difficulty, 8, 6, 4);
            if (
              Math.abs(s.shift) < tolerance &&
              Math.abs(s.gain - c.gain) < gainTol
            ) {
              s.calibrated = true;
              game.hit(3);
              game.feedback("Пики совмещены. След выделен.");
              game.save();
              render();
            } else
              wrong("Линии расходятся: сдвиньте спектр и настройте усиление.");
          },
          "primary",
        ),
      );
    }
    const testRow = document.createElement("div");
    testRow.className = "dx-test-buttons";
    [
      { id: "history", label: "Журнал / 1 тест", text: c.fact },
      {
        id: "reference",
        label: "Эталон / 1 тест",
        text: `Усиление эталона: ${c.gain}%. Центрируйте три пика.`,
      },
      {
        id: "protocol",
        label: "Допуск / 1 тест",
        text: `Для маркера ${c.sample} указан протокол ${PROTOCOL_NAMES[c.protocol]}.`,
      },
    ].forEach((test) => {
      const btn = game.button(
        s.tests.includes(test.id)
          ? `✓ ${test.label.split(" /")[0]}`
          : test.label,
        () => {
          if (s.tests.includes(test.id)) return;
          if (s.tests.length >= limit) {
            game.feedback(
              "Лимит исследований исчерпан. Используйте собранные данные.",
              false,
            );
            return;
          }
          if (
            test.id !== "history" &&
            !s.tests.includes("history") &&
            s.tests.length >= limit - 1
          ) {
            game.feedback(
              "Последнее исследование зарезервировано для обязательной сверки журнала.",
              false,
            );
            return;
          }
          s.tests.push(test.id);
          game.hit();
          game.feedback(test.text);
          game.save();
          render();
        },
      );
      btn.disabled = s.tests.includes(test.id);
      testRow.append(btn);
    });
    game.controls.append(testRow);
    if (s.calibrated) {
      const form = document.createElement("div");
      form.className = "dx-conclusion";
      const agents = shuffle([
        c,
        ...shuffle(CASES.filter((x) => x.id !== c.id)).slice(0, 3),
      ]);
      // Preserve choice order while interacting and when resuming a report.
      if (!s.agentOptions) s.agentOptions = agents.map((a) => a.id);
      form.innerHTML = `<label>01 / КАРТОТЕКА СЛЕДОВ<select id="agent-select" aria-label="Условная причина"><option value="">Выберите причину по маркеру</option>${s.agentOptions
        .map((id) => {
          const a = family(id);
          return `<option value="${id}" ${s.chosenAgent === id ? "selected" : ""}>${a.agent} · ${a.sample}</option>`;
        })
        .join(
          "",
        )}</select></label><label>02 / КАКОЕ УТВЕРЖДЕНИЕ ПРОТИВОРЕЧИТ ЖУРНАЛУ?<select id="contradiction-select" aria-label="Противоречие"><option value="">Выберите противоречие</option>${c.options.map((o) => `<option ${s.contradiction === o ? "selected" : ""}>${o}</option>`).join("")}</select></label><label>03 / ИГРОВОЙ ПРОТОКОЛ<select id="protocol-select" aria-label="Игровой протокол"><option value="">Выберите протокол</option>${PROTOCOLS.map((p) => `<option value="${p.id}" ${s.chosenProtocol === p.id ? "selected" : ""}>${p.name} — ${p.text}</option>`).join("")}</select></label>`;
      game.controls.append(form);
      form.querySelector("#agent-select").addEventListener("change", (e) => {
        s.chosenAgent = e.target.value;
        game.save();
      });
      form
        .querySelector("#contradiction-select")
        .addEventListener("change", (e) => {
          s.contradiction = e.target.value;
          game.save();
        });
      form.querySelector("#protocol-select").addEventListener("change", (e) => {
        s.chosenProtocol = e.target.value;
        game.save();
      });
      game.controls.append(
        game.button(
          "Подписать лабораторное заключение",
          () => {
            if (!s.chosenAgent || !s.chosenProtocol || !s.contradiction) {
              game.feedback("Заполните все три поля заключения.", false);
              return;
            }
            if (!s.tests.includes("history")) {
              wrong(
                "Заключение требует сверки с журналом. Выполните исследование «Журнал».",
              );
              return;
            }
            let errors = [];
            if (s.chosenAgent !== c.id)
              errors.push("Маркер не совпадает с причиной");
            if (s.contradiction !== c.contradiction)
              errors.push("Противоречие не подтверждено");
            if (s.chosenProtocol !== c.protocol)
              errors.push("Протокол не совпадает с допуском");
            if (errors.length) {
              wrong(errors.join(". "));
              return;
            }
            game.hit(4);
            game.feedback(
              "Цепочка доказательств замкнута. Кейс передан врачу.",
            );
            s.agentOptions = null;
            next();
          },
          "primary",
        ),
      );
    }
    bindPuzzle();
    persist();
  }
  function bindPuzzle() {
    const vial = game.scene.querySelector("#lab-vial"),
      dock = game.scene.querySelector("#sample-dock"),
      chart = game.scene.querySelector(".dx-chart"),
      gain = game.scene.querySelector("#lab-gain");
    const load = () => {
      if (s.loaded) return;
      s.loaded = true;
      game.hit();
      game.feedback("Проба загружена. Совместите пики сигнала.");
      game.save();
      render();
    };
    vial.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        load();
      }
    });
    vial.addEventListener("pointerdown", (e) => {
      if (s.loaded) return;
      e.preventDefault();
      cleanDrag();
      const startX = e.clientX,
        startY = e.clientY;
      activeDrag = vial;
      vial.classList.add("dragging");
      vial.setPointerCapture?.(e.pointerId);
      move = (ev) => {
        vial.style.transform = `translate(${ev.clientX - startX}px,${ev.clientY - startY}px) rotate(-8deg)`;
        dock.classList.add("is-target");
      };
      up = (ev) => {
        const r = dock.getBoundingClientRect(),
          inside =
            ev.clientX >= r.left - 28 &&
            ev.clientX <= r.right + 28 &&
            ev.clientY >= r.top - 28 &&
            ev.clientY <= r.bottom + 28;
        const wasClick =
          Math.hypot(ev.clientX - startX, ev.clientY - startY) < 8;
        vial.style.transform = "";
        vial.classList.remove("dragging");
        dock.classList.remove("is-target");
        cleanDrag();
        if (inside || wasClick) load();
        else game.feedback("Перенесите пробу в подсвеченное гнездо.", false);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up, { once: true });
      window.addEventListener("pointercancel", up, { once: true });
    });
    chart.addEventListener("pointerdown", (e) => {
      if (!s.loaded || s.calibrated) return;
      e.preventDefault();
      cleanDrag();
      const start = e.clientX,
        offset = s.shift,
        r = chart.getBoundingClientRect();
      chart.setPointerCapture?.(e.pointerId);
      move = (ev) => {
        s.shift = clamp(offset + (ev.clientX - start) / r.width, -0.32, 0.32);
        updateWave();
      };
      up = () => {
        cleanDrag();
        game.save();
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up, { once: true });
      window.addEventListener("pointercancel", up, { once: true });
    });
    chart.tabIndex = 0;
    chart.setAttribute(
      "aria-label",
      "Сдвиг спектра. Используйте стрелки влево и вправо.",
    );
    chart.addEventListener("keydown", (e) => {
      if (
        !s.loaded ||
        s.calibrated ||
        !["ArrowLeft", "ArrowRight"].includes(e.key)
      )
        return;
      e.preventDefault();
      s.shift = clamp(
        s.shift + (e.key === "ArrowLeft" ? -0.005 : 0.005),
        -0.32,
        0.32,
      );
      updateWave();
      game.save();
    });
    gain.addEventListener("input", (e) => {
      s.gain = Number(e.target.value);
      gain.nextElementSibling.textContent = `${s.gain}%`;
      updateWave();
      game.save();
    });
  }
  function updateWave() {
    game.scene
      .querySelector("#lab-wave")
      ?.setAttribute("d", wavePath(current().peaks, s.gain, s.shift));
  }
  game.onTimeout = () =>
    game.finish(Math.min(55, Math.round((s.index / s.ids.length) * 80)), [
      `${s.index} из ${s.ids.length} заключений завершено. Время лабораторной смены истекло.`,
    ]);
  render();
  game.every(4000, () => game.save());
  return {
    destroy() {
      cleanDrag();
      game.destroy();
    },
  };
}
