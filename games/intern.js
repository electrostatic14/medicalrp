import {
  GameSession,
  clamp,
  shuffle,
  difficultyValue,
  escapeHTML,
} from "../js/game-kit.js";

// These fictional admission cards deliberately contain one clerical inconsistency.
export const INTERN_CASES = [
  {
    id: "heat",
    name: "Арина",
    age: 24,
    complaint: "Слабость после долгой прогулки на солнце",
    temp: "38.2",
    bp: "104 / 68",
    pulse: 102,
    triage: 2,
    error: "Жалоба",
    color: "#d5bca6",
    note: "В карточке указано: «Болит запястье».",
  },
  {
    id: "ankle",
    name: "Тимур",
    age: 32,
    complaint: "Болит лодыжка после тренировки",
    temp: "36.7",
    bp: "122 / 78",
    pulse: 76,
    triage: 3,
    error: "Возраст",
    color: "#be9e83",
    note: "В карточке указан возраст: 23 года.",
  },
  {
    id: "breath",
    name: "Лея",
    age: 41,
    complaint: "Трудно дышать, нужна помощь",
    temp: "37.1",
    bp: "142 / 88",
    pulse: 118,
    triage: 1,
    error: "Браслет",
    color: "#e1bfa9",
    note: "Браслет MR-214, в карточке MR-241.",
  },
  {
    id: "chill",
    name: "Илья",
    age: 27,
    complaint: "Озноб и усталость с утра",
    temp: "38.6",
    bp: "118 / 74",
    pulse: 96,
    triage: 2,
    error: "Возраст",
    color: "#d1a68b",
    note: "В карточке указан возраст: 72 года.",
  },
  {
    id: "check",
    name: "Майя",
    age: 36,
    complaint: "Плановый осмотр, жалоб нет",
    temp: "36.6",
    bp: "118 / 76",
    pulse: 70,
    triage: 3,
    error: "Жалоба",
    color: "#b88565",
    note: "В карточке указано: «Озноб».",
  },
  {
    id: "dizzy",
    name: "Лев",
    age: 58,
    complaint: "Выраженное головокружение",
    temp: "36.4",
    bp: "168 / 98",
    pulse: 108,
    triage: 1,
    error: "Браслет",
    color: "#d6b099",
    note: "Браслет MR-530, в карточке MR-503.",
  },
  {
    id: "throat",
    name: "Соня",
    age: 22,
    complaint: "Першит горло, немного устала",
    temp: "37.4",
    bp: "116 / 72",
    pulse: 82,
    triage: 3,
    error: "Возраст",
    color: "#e5c5b0",
    note: "В карточке указан возраст: 42 года.",
  },
  {
    id: "strain",
    name: "Руслан",
    age: 45,
    complaint: "Потянул плечо, боль при движении",
    temp: "36.8",
    bp: "128 / 82",
    pulse: 80,
    triage: 3,
    error: "Браслет",
    color: "#b38b70",
    note: "Браслет MR-607, в карточке MR-670.",
  },
  {
    id: "fever",
    name: "Ева",
    age: 30,
    complaint: "Высокая температура и ломота",
    temp: "39.1",
    bp: "108 / 70",
    pulse: 110,
    triage: 2,
    error: "Жалоба",
    color: "#d8ac97",
    note: "В карточке указано: «Жалоб нет».",
  },
  {
    id: "faint",
    name: "Даниил",
    age: 49,
    complaint: "Предобморочное состояние",
    temp: "36.2",
    bp: "88 / 58",
    pulse: 112,
    triage: 1,
    error: "Возраст",
    color: "#cda88c",
    note: "В карточке указан возраст: 94 года.",
  },
  {
    id: "wrist",
    name: "Ника",
    age: 25,
    complaint: "Болит кисть, общее состояние хорошее",
    temp: "36.5",
    bp: "120 / 76",
    pulse: 72,
    triage: 3,
    error: "Жалоба",
    color: "#e0b296",
    note: "В карточке указано: «Трудно дышать».",
  },
  {
    id: "palpitation",
    name: "Олег",
    age: 53,
    complaint: "Сильное сердцебиение и слабость",
    temp: "36.9",
    bp: "152 / 92",
    pulse: 126,
    triage: 1,
    error: "Браслет",
    color: "#c7987b",
    note: "Браслет MR-812, в карточке MR-821.",
  },
];
const TOOLS = [
  {
    id: "temp",
    icon: "♧",
    name: "Термометр",
    target: "head",
    hint: "Перенесите термометр к голове. Затем удерживайте кнопку, пока датчик не заполнится.",
  },
  {
    id: "bp",
    icon: "◴",
    name: "Тонометр",
    target: "arm",
    hint: "Перенесите манжету к руке. Качайте воздух и зафиксируйте стрелку в бирюзовом диапазоне.",
  },
  {
    id: "pulse",
    icon: "♧",
    name: "Стетоскоп",
    target: "chest",
    hint: "Перенесите стетоскоп к груди. Поймайте три импульса в центральной зоне.",
  },
];
const TRIAGE = [
  {
    n: 1,
    label: "01 · Срочно",
    hint: "Нестабильные показатели / выраженные жалобы",
  },
  {
    n: 2,
    label: "02 · Скоро",
    hint: "Повышенная температура / умеренное недомогание",
  },
  {
    n: 3,
    label: "03 · Планово",
    hint: "Стабильные показатели / локальная жалоба",
  },
];
const findCase = (id) =>
  INTERN_CASES.find((c) => c.id === id) || INTERN_CASES[0];
const makePatient = (id, elapsed) => ({
  id,
  arrived: elapsed,
  read: false,
  measure: {},
  verified: false,
  priority: 0,
  done: false,
  lost: false,
  errors: 0,
});
export async function mount(ctx) {
  const fresh = {
    ids: shuffle(INTERN_CASES.map((c) => c.id)),
    patients: [],
    next: 0,
    selected: 0,
    completed: 0,
    points: 0,
    tool: null,
  };
  const state = ctx.state || fresh;
  const duration = difficultyValue(ctx.difficulty, 360, 330, 300);
  const rounds = difficultyValue(ctx.difficulty, 6, 7, 8);
  const s = new GameSession(ctx, {
    title: "Первое дежурство",
    subtitle: "Приёмное отделение · 2.5D",
    duration,
    state,
  });
  const patience = difficultyValue(ctx.difficulty, 200, 165, 140);
  let destroyed = false,
    drag = null,
    measuring = null,
    holdStart = 0,
    pressure = 0,
    beats = 0,
    phase = 0;
  const addPatient = () => {
    if (state.next < rounds) {
      state.patients.push(makePatient(state.ids[state.next++], s.elapsed));
    }
  };
  if (!state.patients.length) {
    addPatient();
    addPatient();
    addPatient();
  }
  s.scene.classList.add("response-scene", "intern-scene");
  s.controls.classList.add("response-controls");
  const active = () => state.patients[state.selected];
  function select(index) {
    state.selected = index;
    state.tool = null;
    measuring = null;
    render();
    s.save();
  }
  function person(c) {
    return `<svg viewBox="0 0 360 245" class="admission-illustration" aria-hidden="true"><defs><linearGradient id="internWall" x2="0" y2="1"><stop stop-color="#173747"/><stop offset="1" stop-color="#0b1b2c"/></linearGradient><linearGradient id="internBed" x2="1" y2="1"><stop stop-color="#a1c1c3"/><stop offset="1" stop-color="#47677a"/></linearGradient></defs><path d="M0 0H360V245H0Z" fill="url(#internWall)"/><path d="M0 178L220 132 360 181V245H0Z" fill="#122b3b"/><path d="M250 22H334V105H250Z" fill="#0c1e2c" stroke="#396472"/><path d="M257 77h15l6-18 8 29 8-39 9 28h22" fill="none" stroke="#52e5c2" stroke-width="2"/><path d="M32 40H95V113H32Z" fill="#426471"/><path d="M54 52h19v43H54zM42 64h43v19H42z" fill="#c0e4df"/><path d="M70 194L267 194 302 220H38Z" fill="#163c4b"/><path d="M68 175V226M268 175V226" stroke="#658796" stroke-width="8"/><path d="M52 127L208 108 295 164 111 197 52 169Z" fill="url(#internBed)"/><path d="M57 129L102 120 143 143 98 156Z" fill="#c2d5d5"/><path d="M124 125Q146 109 175 130L231 160 181 184 123 159Z" fill="#58a6ab"/><path d="M178 161L226 157 267 172 246 188 195 184Z" fill="#2c697a"/><path d="M121 138L100 154 130 171 149 161" fill="none" stroke="${c.color}" stroke-width="13" stroke-linecap="round"/><ellipse cx="109" cy="132" rx="18" ry="20" transform="rotate(-25 109 132)" fill="${c.color}"/><path d="M92 130q-5-22 16-23 21-1 20 18-13-5-18-7Z" fill="#28353f"/><path d="M104 133l5 1m8-4l4-1" stroke="#30404a" stroke-width="2"/><path d="M75 205H27V159H63" fill="none" stroke="#688d9c" stroke-width="5"/><circle cx="37" cy="221" r="6" fill="#8ca5ae"/><circle cx="266" cy="229" r="6" fill="#8ca5ae"/></svg>`;
  }
  function render() {
    const p = active();
    if (!p || p.done || p.lost) {
      const i = state.patients.findIndex((v) => !v.done && !v.lost);
      if (i < 0) {
        finish();
        return;
      }
      state.selected = i;
      return render();
    }
    const c = findCase(p.id);
    s.setObjective(`Примите пациентов: ${state.completed} / ${rounds}`);
    s.setMetric(
      "Очередь",
      state.patients.filter((v) => !v.done && !v.lost).length,
    );
    s.setProgress(
      state.patients.filter((v) => v.done || v.lost).length / rounds,
    );
    s.scene.innerHTML = `<div class="intake-topline"><span class="response-live">● ПРИЁМНОЕ ОТДЕЛЕНИЕ</span><span>СМЕНА 07 · ${state.completed}/${rounds}</span></div><div class="patient-queue" aria-label="Очередь пациентов">${state.patients.map((q, i) => (q.done || q.lost ? "" : `<button class="patient-ticket ${i === state.selected ? "selected" : ""}" data-patient="${i}"><span class="ticket-avatar">${findCase(q.id).name[0]}</span><span><b>${escapeHTML(findCase(q.id).name)}</b><small class="wait-label" data-wait="${i}"></small></span><i class="wait-indicator" data-wait-dot="${i}"></i></button>`)).join("")}</div><div class="patient-stage">${person(c)}<div class="patient-nameplate"><strong>${c.name}, ${c.age}</strong><span>Браслет проверяется · ${p.read ? "Карта открыта" : "Новая карта"}</span></div><button class="body-target target-head ${p.measure.temp ? "measured" : ""}" data-target="head" aria-label="Измерить температуру у головы">${p.measure.temp ? "✓" : "+"}</button><button class="body-target target-chest ${p.measure.pulse ? "measured" : ""}" data-target="chest" aria-label="Послушать грудь">${p.measure.pulse ? "✓" : "+"}</button><button class="body-target target-arm ${p.measure.bp ? "measured" : ""}" data-target="arm" aria-label="Надеть манжету на руку">${p.measure.bp ? "✓" : "+"}</button><div class="scene-caption">${p.read ? escapeHTML(c.complaint) : "Откройте карту, затем обследуйте пациента."}</div></div><div class="vitals-strip"><div><small>ТЕМПЕРАТУРА</small><b>${p.measure.temp ? c.temp + "°" : "— —"}</b></div><div><small>ДАВЛЕНИЕ</small><b>${p.measure.bp ? c.bp : "— / —"}</b></div><div><small>ПУЛЬС</small><b>${p.measure.pulse ? c.pulse : "— —"}</b></div></div><div class="procedure-dock" aria-live="polite"></div>`;
    s.controls.innerHTML = "";
    const read = s.button(
      p.read ? "↗ Карта пациента открыта" : "↗ Изучить карту и жалобы",
      () => {
        if (!p.read) {
          p.read = true;
          s.hit();
          s.feedback(`${c.name}: «${c.complaint}»`);
          s.save();
          render();
        }
      },
      "primary",
    );
    s.controls.append(read);
    if (p.read) {
      const card = document.createElement("div");
      card.className = "intake-card";
      card.innerHTML = `<span class="g-label">ПРОВЕРКА ЗАПИСИ</span><p>${escapeHTML(c.note)}</p><small>${p.verified ? "✓ Неточность отмечена." : `Сравните с жалобой, возрастом и браслетом на кушетке. Найдите ошибку:`}</small>`;
      if (!p.verified) {
        const row = document.createElement("div");
        row.className = "g-row";
        ["Возраст", "Жалоба", "Браслет"].forEach((label) =>
          row.append(
            s.button(label, () => {
              if (label === c.error) {
                p.verified = true;
                s.hit();
                s.feedback("Ошибка карты исправлена");
                render();
              } else {
                p.errors++;
                s.miss("Эта запись верна. Сравните данные внимательнее.");
              }
              s.save();
            }),
          ),
        );
        card.append(row);
      }
      s.controls.append(card);
    }
    const tray = document.createElement("div");
    tray.className = "instrument-tray";
    TOOLS.forEach((t) => {
      const b = s.button(`${p.measure[t.id] ? "✓" : t.icon} ${t.name}`, () =>
        equip(t.id),
      );
      b.dataset.tool = t.id;
      b.classList.toggle("selected", state.tool === t.id);
      b.disabled = !!p.measure[t.id];
      b.addEventListener("pointerdown", (e) => {
        if (b.disabled) return;
        e.preventDefault();
        equip(t.id);
        drag = { id: t.id, startX: e.clientX, startY: e.clientY };
        b.setPointerCapture(e.pointerId);
      });
      b.addEventListener("pointermove", (e) => {
        if (!drag) return;
        showGhost(e.clientX, e.clientY, t.name);
      });
      b.addEventListener("pointerup", (e) => {
        if (!drag) return;
        const target = document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest("[data-target]");
        drag = null;
        removeGhost();
        if (target) beginTool(t.id, target.dataset.target);
      });
      b.addEventListener("pointercancel", () => {
        drag = null;
        removeGhost();
      });
      tray.append(b);
    });
    s.scene.insertBefore(tray, s.scene.querySelector(".procedure-dock"));
    const priorities = document.createElement("div");
    priorities.className = "triage-row";
    TRIAGE.forEach((v) => {
      const b = s.button(v.label, () => {
        p.priority = v.n;
        s.save();
        render();
      });
      b.title = v.hint;
      b.classList.toggle("selected", p.priority === v.n);
      b.dataset.priority = v.n;
      priorities.append(b);
    });
    s.controls.append(priorities);
    s.controls.append(
      s.button("Передать пациента врачу →", handoff, "primary"),
    );
    s.scene
      .querySelectorAll("[data-patient]")
      .forEach((b) =>
        b.addEventListener("click", () => select(Number(b.dataset.patient))),
      );
    s.scene.querySelectorAll("[data-target]").forEach((b) =>
      b.addEventListener("click", () => {
        if (!state.tool) {
          s.feedback(
            "Выберите прибор на подносе или перетащите его сюда.",
            false,
          );
          return;
        }
        beginTool(state.tool, b.dataset.target);
      }),
    );
    s.hint.textContent =
      ctx.difficulty === "hard"
        ? "Приоритет определяйте по совокупности жалоб и показателей. Очередь продолжает ждать."
        : "Сначала карта → исправление записи → 3 прибора → приоритет → врач. Датчик + голова, манжета + рука, стетоскоп + грудь. Срочно: нестабильные показатели; скоро: высокая температура; планово: стабильные.";
    updateQueue();
  }
  function equip(id) {
    state.tool = id;
    s.scene
      .querySelectorAll("[data-tool]")
      .forEach((b) => b.classList.toggle("selected", b.dataset.tool === id));
    const tool = TOOLS.find((t) => t.id === id);
    s.feedback(tool.hint);
    ctx.audio.play("tap");
    s.save();
  }
  function showGhost(x, y, label) {
    let ghost = s.scene.querySelector(".instrument-ghost");
    if (!ghost) {
      ghost = document.createElement("div");
      ghost.className = "instrument-ghost";
      s.scene.append(ghost);
    }
    ghost.textContent = label;
    ghost.style.left = x + "px";
    ghost.style.top = y + "px";
  }
  function removeGhost() {
    s.scene.querySelector(".instrument-ghost")?.remove();
  }
  function beginTool(id, target) {
    const p = active(),
      t = TOOLS.find((v) => v.id === id);
    if (!p.read) {
      s.feedback("Сначала прочитайте жалобы и карту пациента.", false);
      return;
    }
    if (p.measure[id]) return;
    if (t.target !== target) {
      p.errors++;
      s.miss("Прибор выбран верно, но область измерения другая.");
      s.save();
      return;
    }
    measuring = id;
    holdStart = 0;
    pressure = 0;
    beats = 0;
    phase = 0;
    const dock = s.scene.querySelector(".procedure-dock");
    dock.innerHTML = `<div class="procedure-panel"><div class="g-row"><b>${t.name}</b><button class="procedure-close" aria-label="Закрыть процедуру">×</button></div><div class="procedure-instruction"></div><div class="procedure-content"></div></div>`;
    dock.querySelector(".procedure-close").addEventListener("click", () => {
      measuring = null;
      dock.innerHTML = "";
    });
    const instruction = dock.querySelector(".procedure-instruction"),
      content = dock.querySelector(".procedure-content");
    if (id === "temp") {
      instruction.textContent = "Удерживайте датчик 2,5 секунды, не отпуская.";
      content.innerHTML = '<div class="g-meter"><i style="width:0%"></i></div>';
      const b = s.button("Удерживать датчик", () => {}, "primary hold-control");
      content.append(b);
      const end = () => {
        if (holdStart) {
          holdStart = 0;
          content.querySelector("i").style.width = "0%";
        }
      };
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        holdStart = performance.now();
      });
      b.addEventListener("pointerup", end);
      b.addEventListener("pointercancel", end);
      b.addEventListener("keydown", (e) => {
        if (e.code === "Space" && !holdStart) {
          e.preventDefault();
          holdStart = performance.now();
        }
      });
      b.addEventListener("keyup", end);
    }
    if (id === "bp") {
      instruction.textContent =
        "Накачивайте манжету. Поймайте давление в зоне 65–85.";
      content.innerHTML =
        '<div class="pressure-scale"><span></span><i></i></div><b class="pressure-value">0</b>';
      content.append(
        s.button("◉ Накачать +18", () => {
          pressure = clamp(pressure + 18, 0, 110);
          ctx.audio.play("tap");
        }),
        s.button(
          "Зафиксировать",
          () => {
            if (pressure >= 65 && pressure <= 85) completeTool();
            else {
              p.errors++;
              s.miss("Стрелка должна находиться в бирюзовой зоне.");
              pressure = 20;
              s.save();
            }
          },
          "primary",
        ),
      );
    }
    if (id === "pulse") {
      instruction.textContent =
        "Нажмите, когда импульс проходит центральную зону. Нужно 3 точных попадания.";
      content.innerHTML =
        '<div class="pulse-track"><span></span><i></i></div><b class="pulse-score">0 / 3</b>';
      content.append(
        s.button(
          "♥ Поймать импульс",
          () => {
            const pos = (Math.sin(phase) + 1) / 2;
            const tolerance = difficultyValue(ctx.difficulty, 0.25, 0.19, 0.14);
            if (Math.abs(pos - 0.5) < tolerance) {
              beats++;
              s.feedback("Чистый сигнал");
              if (beats >= 3) completeTool();
            } else {
              p.errors++;
              s.miss("Шум датчика. Ловите импульс ближе к центру.");
            }
            s.save();
          },
          "primary",
        ),
      );
    }
  }
  function completeTool() {
    if (!measuring) return;
    const p = active();
    p.measure[measuring] = true;
    measuring = null;
    holdStart = 0;
    s.hit();
    s.feedback("Показатель измерен и внесён в карту");
    s.save();
    render();
  }
  function handoff() {
    const p = active(),
      c = findCase(p.id);
    if (
      !p.read ||
      !p.verified ||
      Object.keys(p.measure).length < 3 ||
      !p.priority
    ) {
      s.feedback(
        "Заполните карту: исправление, все три измерения и приоритет.",
        false,
      );
      return;
    }
    const correct = p.priority === c.triage;
    if (correct) {
      s.hit(2);
      s.feedback("Верный маршрут. Пациент передан врачу.");
    } else {
      p.errors += 2;
      s.miss(
        `Приоритет не совпал: ${TRIAGE[c.triage - 1].label}. Оценивайте жалобы вместе с показателями.`,
      );
    }
    p.done = true;
    state.completed++;
    state.points += Math.max(20, 100 - p.errors * 12 - (correct ? 0 : 20));
    addPatient();
    s.save();
    const next = state.patients.findIndex((v) => !v.done && !v.lost);
    if (next < 0) {
      finish();
      return;
    }
    state.selected = next;
    state.tool = null;
    render();
  }
  function updateQueue() {
    state.patients.forEach((p, i) => {
      if (p.done || p.lost) return;
      const remaining = Math.max(0, patience - (s.elapsed - p.arrived));
      const label = s.scene.querySelector(`[data-wait="${i}"]`);
      if (label)
        label.textContent = `Ожидание ${Math.floor(s.elapsed - p.arrived)}с`;
      const dot = s.scene.querySelector(`[data-wait-dot="${i}"]`);
      if (dot) dot.style.background = remaining < 45 ? "#ffaf70" : "#5ce1ca";
    });
  }
  function finish() {
    if (destroyed) return;
    measuring = null;
    const losses = state.patients.filter((p) => p.lost).length;
    const score = Math.round(state.points / rounds);
    s.finish(score, [
      `Принято пациентов: ${state.completed} из ${rounds}`,
      `Покинули очередь: ${losses}`,
      `Изучено типов обращений: ${new Set(state.patients.map((p) => p.id)).size}`,
    ]);
  }
  s.every(50, () => {
    if (!measuring) return;
    const dock = s.scene.querySelector(".procedure-dock");
    if (measuring === "temp" && holdStart) {
      const pct = clamp((performance.now() - holdStart) / 2500, 0, 1);
      const bar = dock.querySelector(".g-meter i");
      if (bar) bar.style.width = pct * 100 + "%";
      if (pct >= 1) completeTool();
    }
    if (measuring === "bp") {
      pressure = Math.max(0, pressure - 0.22);
      const marker = dock.querySelector(".pressure-scale i");
      if (marker)
        marker.style.left = clamp((pressure / 110) * 100, 0, 100) + "%";
      const number = dock.querySelector(".pressure-value");
      if (number) number.textContent = Math.round(pressure);
    }
    if (measuring === "pulse") {
      phase += difficultyValue(ctx.difficulty, 0.11, 0.14, 0.18);
      const marker = dock.querySelector(".pulse-track i");
      if (marker) marker.style.left = (Math.sin(phase) + 1) * 50 + "%";
      const value = dock.querySelector(".pulse-score");
      if (value) value.textContent = beats + " / 3";
    }
  });
  s.every(1000, () => {
    updateQueue();
    let changed = false;
    state.patients.forEach((p) => {
      if (!p.done && !p.lost && s.elapsed - p.arrived > patience) {
        p.lost = true;
        s.miss(`${findCase(p.id).name}: время ожидания истекло.`);
        addPatient();
        changed = true;
      }
    });
    if (changed) {
      measuring = null;
      render();
      s.save();
    }
  });
  s.onTimeout = finish;
  render();
  s.save();
  return {
    destroy() {
      destroyed = true;
      removeGhost();
      s.destroy();
    },
  };
}
