import {
  GameSession,
  shuffle,
  clamp,
  difficultyValue,
} from "../js/game-kit.js";

// Fictional diagnostic systems: puzzle evidence is deliberately not clinical advice.
const CASES = [
  {
    id: "t01",
    name: "Алина",
    age: 26,
    role: "Архитектор",
    symptom: "Устаёт к вечеру, жалуется на тяжесть в голове.",
    detail: "Началось после перехода на ночные проекты.",
    trigger: "Смена режима",
    diagnosis: "Контур «Север»",
    marker: "N-12",
    scan: "Ровный контур",
    wrong1: "Контур «Маяк»",
    wrong2: "Контур «Орбита»",
    color: "#67d8ef",
  },
  {
    id: "t02",
    name: "Марк",
    age: 35,
    role: "Проводник",
    symptom: "Рассеянность и непривычная сонливость после маршрута.",
    detail: "Ощущения возникают только после поездки в новом вагоне.",
    trigger: "Новый вагон",
    diagnosis: "Эхо «Транзит»",
    marker: "T-08",
    scan: "Двойной контур",
    wrong1: "Эхо «Тишина»",
    wrong2: "Эхо «Вектор»",
    color: "#9fbbff",
  },
  {
    id: "t03",
    name: "Ева",
    age: 22,
    role: "Студентка",
    symptom: "Во время подготовки к выставке быстро теряет силы.",
    detail: "Перед каждым эпизодом включает экспериментальную лампу.",
    trigger: "Экспериментальная лампа",
    diagnosis: "Спектр «Люмен»",
    marker: "L-24",
    scan: "Светлая дуга",
    wrong1: "Спектр «Тень»",
    wrong2: "Спектр «Искра»",
    color: "#ffd88e",
  },
  {
    id: "t04",
    name: "Сергей",
    age: 51,
    role: "Часовщик",
    symptom: "Сложно сосредоточиться на мелкой работе.",
    detail: "В мастерской недавно появился ультразвуковой очиститель.",
    trigger: "Новый очиститель",
    diagnosis: "Резонанс «Такт»",
    marker: "R-31",
    scan: "Тройная полоса",
    wrong1: "Резонанс «Пульс»",
    wrong2: "Резонанс «Нота»",
    color: "#84e3bd",
  },
  {
    id: "t05",
    name: "Нина",
    age: 43,
    role: "Куратор",
    symptom: "Отмечает усталость и необычную чувствительность к свету.",
    detail: "Симптомы появляются в зале с новой голограммой.",
    trigger: "Зал голограмм",
    diagnosis: "Фаза «Гало»",
    marker: "G-17",
    scan: "Замкнутое кольцо",
    wrong1: "Фаза «Шлейф»",
    wrong2: "Фаза «Сфера»",
    color: "#cba9fa",
  },
  {
    id: "t06",
    name: "Данил",
    age: 28,
    role: "Оператор",
    symptom: "Путает последовательности и чувствует утомление.",
    detail: "Недавно перешёл на пульт с пульсирующей подсветкой.",
    trigger: "Пульсирующий пульт",
    diagnosis: "Ритм «Каскад»",
    marker: "K-09",
    scan: "Ступенчатая линия",
    wrong1: "Ритм «Поток»",
    wrong2: "Ритм «Дельта»",
    color: "#72dce7",
  },
  {
    id: "t07",
    name: "Лев",
    age: 61,
    role: "Библиотекарь",
    symptom: "Зябкость и рассеянность в конце рабочего дня.",
    detail: "Каждый эпизод связан с сортировкой новых архивных карточек.",
    trigger: "Новые карточки",
    diagnosis: "След «Архив»",
    marker: "A-42",
    scan: "Тонкая рамка",
    wrong1: "След «Перо»",
    wrong2: "След «Лист»",
    color: "#e2c697",
  },
  {
    id: "t08",
    name: "Полина",
    age: 30,
    role: "Фотограф",
    symptom: "После съёмок чувствует тяжесть и вялость.",
    detail: "Вспомнила, что использовала новый светофильтр.",
    trigger: "Новый светофильтр",
    diagnosis: "Спектр «Объектив»",
    marker: "O-19",
    scan: "Парные дуги",
    wrong1: "Спектр «Кадр»",
    wrong2: "Спектр «Фокус»",
    color: "#92c9ff",
  },
  {
    id: "t09",
    name: "Артём",
    age: 40,
    role: "Шеф-повар",
    symptom: "После смены жалуется на сонливость и рассеянность.",
    detail: "Это началось с запуска ароматической установки.",
    trigger: "Ароматическая установка",
    diagnosis: "Контур «Арома»",
    marker: "M-26",
    scan: "Мягкая волна",
    wrong1: "Контур «Пар»",
    wrong2: "Контур «Соль»",
    color: "#ffa7ae",
  },
  {
    id: "t10",
    name: "Вера",
    age: 33,
    role: "Сценограф",
    symptom: "На репетициях быстро утомляется и отвлекается.",
    detail: "Связывает эпизоды с включением синего сценического света.",
    trigger: "Синий сценический свет",
    diagnosis: "Фаза «Кулиса»",
    marker: "C-15",
    scan: "Диагональный след",
    wrong1: "Фаза «Занавес»",
    wrong2: "Фаза «Авансцена»",
    color: "#b0b7ff",
  },
  {
    id: "t11",
    name: "Илья",
    age: 46,
    role: "Инженер",
    symptom: "Необычная слабость появляется во время испытаний.",
    detail: "Проявления исчезают при отключении тестового генератора.",
    trigger: "Тестовый генератор",
    diagnosis: "Резонанс «Вольт»",
    marker: "V-37",
    scan: "Острый пик",
    wrong1: "Резонанс «Ампер»",
    wrong2: "Резонанс «Ом»",
    color: "#f5d77b",
  },
  {
    id: "t12",
    name: "Лада",
    age: 25,
    role: "Иллюстратор",
    symptom: "После рисования ощущает усталость и лёгкую рассеянность.",
    detail: "Использует новый планшет с необычным тактильным режимом.",
    trigger: "Тактильный режим",
    diagnosis: "Эхо «Пиксель»",
    marker: "P-11",
    scan: "Пунктирная дуга",
    wrong1: "Эхо «Кисть»",
    wrong2: "Эхо «Слой»",
    color: "#f3b5e7",
  },
  {
    id: "t13",
    name: "Руслан",
    age: 37,
    role: "Диспетчер",
    symptom: "Утром тяжело сосредоточиться на сигналах.",
    detail: "Недавно изменился звуковой пакет оповещений.",
    trigger: "Новые оповещения",
    diagnosis: "Ритм «Сигнал»",
    marker: "S-33",
    scan: "Равные импульсы",
    wrong1: "Ритм «Канал»",
    wrong2: "Ритм «Частота»",
    color: "#84d8cb",
  },
  {
    id: "t14",
    name: "София",
    age: 48,
    role: "Реставратор",
    symptom: "После работы появляется утомление и чувствительность к бликам.",
    detail: "Эпизоды связаны с новым защитным экраном.",
    trigger: "Защитный экран",
    diagnosis: "Спектр «Патина»",
    marker: "B-22",
    scan: "Разомкнутый овал",
    wrong1: "Спектр «Лак»",
    wrong2: "Спектр «Фреска»",
    color: "#d2d49d",
  },
  {
    id: "t15",
    name: "Тимур",
    age: 32,
    role: "Логист",
    symptom: "В определённом складе становится сонливым.",
    detail: "Вспомнил про новый навигационный маяк в этом помещении.",
    trigger: "Навигационный маяк",
    diagnosis: "След «Полюс»",
    marker: "Q-14",
    scan: "Две вертикали",
    wrong1: "След «Компас»",
    wrong2: "След «Карта»",
    color: "#a0cded",
  },
  {
    id: "t16",
    name: "Кира",
    age: 29,
    role: "Музыкант",
    symptom: "После репетиций трудно удерживать внимание.",
    detail: "Проблема началась после установки виброплатформы.",
    trigger: "Виброплатформа",
    diagnosis: "Резонанс «Аккорд»",
    marker: "D-28",
    scan: "Гармоническая дуга",
    wrong1: "Резонанс «Бас»",
    wrong2: "Резонанс «Темп»",
    color: "#c4a6f0",
  },
  {
    id: "t17",
    name: "Глеб",
    age: 55,
    role: "Агроном",
    symptom: "Быстро устаёт в экспериментальной теплице.",
    detail: "Все эпизоды совпадают с работой светового купола.",
    trigger: "Световой купол",
    diagnosis: "Фаза «Купол»",
    marker: "U-41",
    scan: "Высокий свод",
    wrong1: "Фаза «Росток»",
    wrong2: "Фаза «Крона»",
    color: "#a5deaf",
  },
  {
    id: "t18",
    name: "Ася",
    age: 24,
    role: "Аниматор",
    symptom: "Во время работы в костюме чувствует рассеянность.",
    detail: "Новый костюм имеет постоянно включённый модуль мерцания.",
    trigger: "Модуль мерцания",
    diagnosis: "Эхо «Маска»",
    marker: "F-16",
    scan: "Прерывистый круг",
    wrong1: "Эхо «Сцена»",
    wrong2: "Эхо «Роль»",
    color: "#ffb9a1",
  },
  {
    id: "t19",
    name: "Олег",
    age: 44,
    role: "Техник",
    symptom: "После сервисной смены жалуется на вялость.",
    detail: "Обслуживает экспериментальный охлаждающий блок.",
    trigger: "Охлаждающий блок",
    diagnosis: "Контур «Крио»",
    marker: "E-35",
    scan: "Холодная петля",
    wrong1: "Контур «Иней»",
    wrong2: "Контур «Снег»",
    color: "#97e4f7",
  },
  {
    id: "t20",
    name: "Милана",
    age: 36,
    role: "Экскурсовод",
    symptom: "Забывает фразы и устаёт на одном маршруте.",
    detail: "Маршрут проходит через новый звуковой тоннель.",
    trigger: "Звуковой тоннель",
    diagnosis: "Ритм «Тоннель»",
    marker: "Z-23",
    scan: "Протяжённая волна",
    wrong1: "Ритм «Мост»",
    wrong2: "Ритм «Путь»",
    color: "#e3c4f7",
  },
];
const byId = (id) => CASES.find((c) => c.id === id);
const ASSESSMENTS = [
  { id: "marker", name: "Маркерный анализ", cost: 2 },
  { id: "scan", name: "Контурный скан", cost: 2 },
  { id: "control", name: "Контрольный профиль", cost: 1 },
];
export async function mount(ctx) {
  const count = difficultyValue(ctx.difficulty, 4, 5, 6);
  const initial = {
    ids: shuffle(CASES.map((c) => c.id)).slice(0, count),
    index: 0,
    dialogue: 0,
    revealed: ["complaint"],
    tests: [],
    budget: difficultyValue(ctx.difficulty, 7, 6, 5),
    placements: {},
    selected: null,
    notes: [],
    caseErrors: 0,
    options: shuffle(["correct", "alt1", "alt2"]),
  };
  const game = new GameSession(ctx, {
    title: "Клинический детектив",
    subtitle: "От симптома — к цепочке доказательств",
    duration: difficultyValue(ctx.difficulty, 540, 510, 480),
    state: initial,
  });
  const s = game.state;
  game.scene.classList.add("diagnostic-scene", "detective-scene");
  let drag = null,
    move = null,
    up = null,
    focusedClue = null;
  const c = () => byId(s.ids[s.index]);
  const nameFor = (id) =>
    id === "correct" ? c().diagnosis : id === "alt1" ? c().wrong1 : c().wrong2;
  const clueData = () => ({
    complaint: {
      id: "complaint",
      label: "Жалобы",
      text: c().symptom,
      kind: "neutral",
    },
    history: {
      id: "history",
      label: "Диалог / триггер",
      text: `Связь: ${c().trigger}. ${c().detail}`,
      kind: "support",
      target: "correct",
    },
    marker: {
      id: "marker",
      label: "Маркерный анализ",
      text: `Выделен игровой маркер ${c().marker}. Совпадение с профилем «${c().diagnosis}».`,
      kind: "support",
      target: "correct",
    },
    scan: {
      id: "scan",
      label: "Контурный скан",
      text: `Паттерн «${c().scan}». Поддерживает «${c().diagnosis}».`,
      kind: "support",
      target: "correct",
    },
    control: {
      id: "control",
      label: "Контрольный профиль",
      text: `У профиля «${c().wrong1}» должен быть контрольный пик. Пик отсутствует.`,
      kind: "refute",
      target: "alt1",
    },
    context: {
      id: "context",
      label: "Уточнение истории",
      text: `Игровой профиль «${c().wrong2}» развивается вне рабочего места. Здесь эпизоды только на работе.`,
      kind: "refute",
      target: "alt2",
    },
  });
  function cleanupDrag() {
    if (move) window.removeEventListener("pointermove", move);
    if (up) {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    }
    if (drag) drag.classList.remove("dragging");
    move = up = null;
    drag = null;
  }
  function miss(text) {
    s.caseErrors++;
    game.miss(text);
    game.save();
  }
  function evidence(id) {
    if (!s.revealed.includes(id)) {
      s.revealed.push(id);
      game.hit();
    }
  }
  function save() {
    game.save();
    game.setProgress(s.index / s.ids.length);
    game.setMetric("Бюджет", `${s.budget} ед.`);
  }
  function place(id, target, kind) {
    const clue = clueData()[id];
    if (!clue || clue.kind === "neutral") {
      game.feedback(
        "Жалоба неоднозначна. Для связи нужны уточняющие данные.",
        false,
      );
      return;
    }
    if (
      s.placements[id]?.target === target &&
      s.placements[id]?.kind === kind
    ) {
      game.feedback("Эта связь уже прикреплена.");
      return;
    }
    if (clue.target === target && clue.kind === kind) {
      s.placements[id] = { target, kind };
      game.hit();
      game.feedback(
        kind === "support"
          ? "Улика поддерживает гипотезу."
          : "Противоречие исключает гипотезу.",
      );
      focusedClue = null;
      save();
      render();
    } else
      miss(
        kind === "support"
          ? "Эта улика не доказывает выбранную гипотезу. Перечитайте профиль."
          : "Эта улика не опровергает выбранную гипотезу.",
      );
  }
  function render() {
    cleanupDrag();
    const record = c(),
      clues = clueData();
    game.setObjective(
      s.dialogue < 2
        ? "Поговорите с пациентом и уточните контекст."
        : "Назначьте исследования и соедините улики с гипотезами.",
    );
    game.hint.textContent =
      "Перетащите улику в ячейку «За» или «Против». На телефоне можно нажать улику, затем ячейку. Для заключения нужны две опоры и одно исключение. Игровые профили вымышлены.";
    game.scene.innerHTML = `<div class="dx-case-strip"><span class="dx-live"><i></i> ДЕЛО ${String(s.index + 1).padStart(2, "0")} / ${s.ids.length}</span><span>ОТДЕЛ ДИАГНОСТИКИ</span></div><div class="dx-detective-grid"><section class="dx-patient-file"><div class="dx-file-top"><div class="dx-avatar" style="--patient-color:${record.color}">${record.name.slice(0, 1)}</div><div><small>ПАЦИЕНТ · ${record.age} ЛЕТ</small><h3>${record.name}</h3><p>${record.role}</p></div><span class="dx-file-stamp">OPEN<br/>CASE</span></div><p class="dx-patient-quote">«${record.symptom}»</p><div class="dx-dialogue-log">${s.dialogue >= 1 ? `<p><b>Уточнение:</b> ${record.detail}</p>` : "<p>Начните с открытого вопроса о времени и обстоятельствах.</p>"}${s.dialogue >= 2 ? "<p><b>Контекст:</b> вне работы эпизодов нет.</p>" : ""}</div><div id="dialogue-actions" class="dx-dialogue-actions"></div></section><div class="dx-casebook"><div class="dx-casebook-heading"><span>КАРТОТЕКА ИГРОВЫХ ПРОФИЛЕЙ</span><span>03 ГИПОТЕЗЫ</span></div>${s.options
      .map(
        (id) =>
          `<article class="dx-profile ${s.selected === id ? "selected" : ""}" data-profile="${id}"><button class="dx-profile-heading" aria-label="Выбрать гипотезу ${nameFor(id)}"><span class="dx-profile-dot"></span><b>${nameFor(id)}</b><span>${s.selected === id ? "◉" : "○"}</span></button><p>${id === "correct" ? `Триггер: ${record.trigger}. Маркер ${record.marker}. Скан: ${record.scan}.` : id === "alt1" ? "Требуется контрольный пик. При его отсутствии гипотеза противоречит данным." : "Профиль даёт эпизоды и вне рабочего места. Проверьте контекст."}</p><div class="dx-proof-slots"><button class="dx-proof-slot support" data-target="${id}" data-kind="support"><span>+ ЗА</span>${Object.entries(
            s.placements,
          )
            .filter(([, p]) => p.target === id && p.kind === "support")
            .map(([key]) => `<small>✓ ${clues[key].label}</small>`)
            .join(
              "",
            )}</button><button class="dx-proof-slot refute" data-target="${id}" data-kind="refute"><span>− ПРОТИВ</span>${Object.entries(
            s.placements,
          )
            .filter(([, p]) => p.target === id && p.kind === "refute")
            .map(([key]) => `<small>✓ ${clues[key].label}</small>`)
            .join("")}</button></div></article>`,
      )
      .join(
        "",
      )}</div></div><div class="dx-evidence-heading"><span>ДОСКА УЛИК</span><span>Нажать → связать · Перетащить → прикрепить</span></div><div class="dx-clue-board">${s.revealed
      .map((id) => {
        const item = clues[id];
        return `<button class="dx-clue ${s.placements[id] ? "is-linked" : ""} ${focusedClue === id ? "is-focused" : ""}" data-clue="${id}" aria-label="Улика ${item.label}. ${item.text}"><span>${s.placements[id] ? "✓ СВЯЗАНО" : item.kind === "neutral" ? "НАБЛЮДЕНИЕ" : "УЛИКА"}</span><b>${item.label}</b><p>${item.text}</p><i>${item.kind === "neutral" ? "◌" : "↗"}</i></button>`;
      })
      .join("")}</div>`;
    const dialogue = game.scene.querySelector("#dialogue-actions");
    if (s.dialogue === 0) {
      dialogue.append(
        game.button(
          "Когда это началось и что изменилось?",
          () => {
            s.dialogue = 1;
            evidence("history");
            save();
            render();
          },
          "primary",
        ),
        game.button("Вы просто устали, верно?", () => {
          miss("Наводящий вопрос закрыл детали. Спросите об обстоятельствах.");
        }),
      );
    } else if (s.dialogue === 1) {
      dialogue.append(
        game.button(
          "А вне работы такое бывает?",
          () => {
            s.dialogue = 2;
            evidence("context");
            save();
            render();
          },
          "primary",
        ),
        game.button("Поставим диагноз без уточнений", () => {
          miss(
            "Уточните контекст: он помогает исключить конкурирующий профиль.",
          );
        }),
      );
    } else {
      const complete = document.createElement("p");
      complete.className = "dx-dialogue-complete";
      complete.textContent = "✓ История собрана · пациент услышан";
      dialogue.append(complete);
    }
    game.controls.innerHTML = "";
    const tests = document.createElement("div");
    tests.className = "dx-test-buttons";
    ASSESSMENTS.forEach((exam) => {
      const done = s.tests.includes(exam.id),
        btn = game.button(
          done ? `✓ ${exam.name}` : `${exam.name} · ${exam.cost}`,
          () => {
            if (s.tests.includes(exam.id)) return;
            if (s.budget < exam.cost) {
              game.feedback(
                "Бюджета не хватает. Используйте доступные улики.",
                false,
              );
              return;
            }
            s.budget -= exam.cost;
            s.tests.push(exam.id);
            evidence(exam.id);
            game.feedback(clueData()[exam.id].text);
            save();
            render();
          },
        );
      btn.disabled = done || s.budget < exam.cost;
      tests.append(btn);
    });
    game.controls.append(tests);
    game.controls.append(
      game.button(
        "Закрыть дело / подписать заключение",
        () => {
          if (s.dialogue < 2) {
            game.feedback("Сначала завершите диалог с пациентом.", false);
            return;
          }
          if (!s.selected) {
            game.feedback(
              "Выберите итоговую гипотезу нажатием на её название.",
              false,
            );
            return;
          }
          const proofs = Object.values(s.placements),
            support = proofs.filter(
              (p) => p.target === s.selected && p.kind === "support",
            ).length,
            refute = proofs.filter(
              (p) => p.target !== s.selected && p.kind === "refute",
            ).length;
          if (support < 2 || refute < 1) {
            game.feedback(
              "Нужны две поддерживающие улики и хотя бы одно исключение. Перенесите карточки в ячейки.",
              false,
            );
            return;
          }
          if (s.selected !== "correct") {
            miss(
              "Заключение противоречит доказательствам. Проверьте гипотезу.",
            );
            return;
          }
          game.hit(4);
          s.notes.push({
            name: record.name,
            diagnosis: record.diagnosis,
            errors: s.caseErrors,
            budget: s.budget,
          });
          s.index++;
          if (s.index === s.ids.length) {
            const total = s.notes.reduce((n, a) => n + a.errors, 0);
            game.finish(
              clamp(100 - total * 5, 15, 100),
              s.notes.map(
                (n) => `${n.name}: ${n.diagnosis}; ошибок ${n.errors}`,
              ),
            );
            return;
          }
          Object.assign(s, {
            dialogue: 0,
            revealed: ["complaint"],
            tests: [],
            budget: difficultyValue(ctx.difficulty, 7, 6, 5),
            placements: {},
            selected: null,
            caseErrors: 0,
            options: shuffle(["correct", "alt1", "alt2"]),
          });
          focusedClue = null;
          game.feedback("Обоснованное заключение принято. Следующий пациент.");
          save();
          render();
        },
        "primary",
      ),
    );
    game.scene.querySelectorAll(".dx-profile-heading").forEach((el) =>
      el.addEventListener("click", () => {
        s.selected = el.closest("[data-profile]").dataset.profile;
        save();
        render();
      }),
    );
    game.scene.querySelectorAll(".dx-proof-slot").forEach((el) =>
      el.addEventListener("click", () => {
        if (focusedClue) place(focusedClue, el.dataset.target, el.dataset.kind);
        else game.feedback("Сначала выберите карточку улики.", false);
      }),
    );
    game.scene.querySelectorAll(".dx-clue").forEach((el) => {
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          focusedClue = el.dataset.clue;
          render();
        }
      });
      el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        cleanupDrag();
        const id = el.dataset.clue,
          startX = e.clientX,
          startY = e.clientY;
        let moved = false;
        drag = el;
        el.setPointerCapture?.(e.pointerId);
        move = (ev) => {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 7)
            moved = true;
          if (moved) {
            el.classList.add("dragging");
            el.style.transform = `translate(${ev.clientX - startX}px,${ev.clientY - startY}px) rotate(-3deg)`;
            game.scene.querySelectorAll(".dx-proof-slot").forEach((slot) => {
              const r = slot.getBoundingClientRect();
              slot.classList.toggle(
                "drag-target",
                ev.clientX >= r.left &&
                  ev.clientX <= r.right &&
                  ev.clientY >= r.top &&
                  ev.clientY <= r.bottom,
              );
            });
          }
        };
        up = (ev) => {
          el.style.transform = "";
          game.scene
            .querySelectorAll(".drag-target")
            .forEach((t) => t.classList.remove("drag-target"));
          cleanupDrag();
          if (!moved) {
            focusedClue = focusedClue === id ? null : id;
            render();
            return;
          }
          const target = document
            .elementFromPoint(ev.clientX, ev.clientY)
            ?.closest(".dx-proof-slot");
          if (target) place(id, target.dataset.target, target.dataset.kind);
          else
            game.feedback(
              "Отпустите улику над ячейкой «За» или «Против».",
              false,
            );
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up, { once: true });
        window.addEventListener("pointercancel", up, { once: true });
      });
    });
    save();
  }
  game.onTimeout = () =>
    game.finish(Math.min(55, Math.round((s.index / s.ids.length) * 80)), [
      `${s.index} из ${s.ids.length} дел закрыто. Время диагностической смены истекло.`,
    ]);
  render();
  game.every(4000, () => game.save());
  return {
    destroy() {
      cleanupDrag();
      game.destroy();
    },
  };
}
