import {
  GameSession,
  clamp,
  shuffle,
  escapeHTML,
  difficultyValue,
} from "../js/game-kit.js";

// Geometry is expressed in radiograph coordinates. Every pattern has its own
// target joints, segment lengths, rotations and fixation rule.
const PUZZLES = [
  {
    name: "Лучевая кость",
    code: "RAD-01",
    points: [
      [11, -28],
      [13, -10],
      [11, 10],
      [17, 29],
    ],
    width: 5.5,
    fix: "splint",
  },
  {
    name: "Локтевая кость",
    code: "ULN-02",
    points: [
      [4, -27],
      [12, -10],
      [20, 9],
      [25, 28],
    ],
    width: 5,
    fix: "plate",
  },
  {
    name: "Ключица",
    code: "CLV-03",
    points: [
      [-3, -5],
      [9, -12],
      [21, -8],
      [32, -12],
      [42, -5],
    ],
    width: 5,
    fix: "brace",
  },
  {
    name: "Плечевая кость",
    code: "HUM-04",
    points: [
      [7, -28],
      [13, -9],
      [17, 11],
      [12, 29],
    ],
    width: 7,
    fix: "plate",
  },
  {
    name: "Фаланга пальца",
    code: "PHL-05",
    points: [
      [9, -27],
      [12, -14],
      [14, 0],
      [10, 14],
      [14, 28],
    ],
    width: 6,
    fix: "splint",
  },
  {
    name: "Большеберцовая кость",
    code: "TIB-06",
    points: [
      [15, -29],
      [10, -14],
      [12, 0],
      [19, 15],
      [22, 29],
    ],
    width: 7,
    fix: "plate",
  },
  {
    name: "Малоберцовая кость",
    code: "FIB-07",
    points: [
      [8, -30],
      [13, -15],
      [10, 0],
      [16, 15],
      [13, 30],
    ],
    width: 4,
    fix: "splint",
  },
  {
    name: "Рёберная дуга",
    code: "RIB-08",
    points: [
      [-4, -18],
      [12, -25],
      [28, -20],
      [38, -7],
      [34, 10],
    ],
    width: 4.5,
    fix: "brace",
  },
  {
    name: "Плюсневая дуга",
    code: "MET-09",
    points: [
      [6, 24],
      [8, 11],
      [15, 0],
      [23, -8],
      [32, -15],
      [36, -26],
    ],
    width: 5,
    fix: "splint",
  },
  {
    name: "Кости запястья",
    code: "CAR-10",
    points: [
      [7, -22],
      [20, -15],
      [10, -3],
      [22, 9],
      [12, 24],
    ],
    width: 7,
    fix: "brace",
  },
  {
    name: "Лопаточная дуга",
    code: "SCP-11",
    points: [
      [3, -18],
      [25, -25],
      [35, -7],
      [24, 14],
      [6, 21],
    ],
    width: 8,
    fix: "brace",
  },
  {
    name: "Голеностопный сегмент",
    code: "ANK-12",
    points: [
      [12, -28],
      [12, -12],
      [15, 4],
      [30, 13],
      [38, 26],
    ],
    width: 6.5,
    fix: "plate",
  },
  {
    name: "Пястная кость",
    code: "MCP-13",
    points: [
      [4, 27],
      [10, 12],
      [12, -3],
      [19, -17],
      [23, -30],
    ],
    width: 5,
    fix: "splint",
  },
  {
    name: "Плечевой комплекс",
    code: "SHL-14",
    points: [
      [-2, -11],
      [8, -24],
      [23, -26],
      [35, -14],
      [30, 2],
      [20, 13],
    ],
    width: 6,
    fix: "brace",
  },
  {
    name: "Составная реконструкция",
    code: "CMP-15",
    points: [
      [7, -30],
      [18, -20],
      [12, -10],
      [24, 0],
      [16, 10],
      [27, 20],
      [22, 31],
    ],
    width: 5.5,
    fix: "plate",
  },
];
const FIXATIONS = {
  splint: {
    name: "Мягкая шина",
    icon: "▤",
    clue: "Условная карта: нужна лёгкая внешняя опора без жёсткого контура.",
  },
  brace: {
    name: "Контурный ортез",
    icon: "◈",
    clue: "Условная карта: сохранить дугу и распределить опору по всему контуру.",
  },
  plate: {
    name: "Игровая пластина",
    icon: "⫶",
    clue: "Условная карта: требуется жёсткая продольная фиксация реконструкции.",
  },
};
const norm = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const targetSegments = (definition) =>
  definition.points.slice(1).map((b, i) => {
    const a = definition.points[i];
    return {
      id: i,
      x: (a[0] + b[0]) / 2,
      y: (a[1] + b[1]) / 2,
      angle: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI,
      length: Math.hypot(b[0] - a[0], b[1] - a[1]),
      width: definition.width * (1 + ((i % 3) - 1) * 0.09),
    };
  });

export async function mount(ctx) {
  const roundCount = difficultyValue(ctx.difficulty, 4, 5, 6);
  const initial = {
    deck: shuffle(PUZZLES.map((_, i) => i)).slice(0, roundCount),
    round: 0,
    stage: "inspect",
    pieces: null,
    selected: 0,
    accuracy: [],
    fixation: null,
    inspected: [],
    view: { zoom: 1, x: 0, y: 0 },
    done: false,
  };
  const g = new GameSession(ctx, {
    title: "Реконструкция",
    subtitle: "Травматолог · пространственная лаборатория",
    duration: difficultyValue(ctx.difficulty, 480, 540, 600),
    state: initial,
  });
  const s = g.state;
  let stopped = false,
    canvas = null,
    drawCtx = null,
    resizeObserver = null,
    raf = 0;
  let selectedMode = "fragment";
  let width = 600,
    height = 420,
    dpr = 1;
  let drag = null,
    pinch = null;
  let flash = null;
  const pointers = new Map();
  const tolerance = difficultyValue(ctx.difficulty, 5, 3.4, 2.2);
  const angleTolerance = difficultyValue(ctx.difficulty, 14, 10, 7);
  if (!s.inspectCursor) s.inspectCursor = { x: 0, y: 0 };
  const definition = () => PUZZLES[s.deck[s.round]];
  const targets = () => targetSegments(definition());
  const save = () => g.save();

  function initPieces() {
    s.pieces = targets().map((t, i) => ({
      id: t.id,
      x: -40 + (i % 2) * 13,
      y: -24 + Math.floor(i / 2) * 22,
      angle: norm(t.angle + chooseOffset()),
      locked: false,
      precision: null,
    }));
    s.selected = 0;
    s.view = { zoom: 1, x: 0, y: 0 };
    s.inspectCursor = { x: 0, y: 0 };
  }
  function chooseOffset() {
    return (
      shuffle([-120, -90, -60, 60, 90, 120])[0] +
      Math.round((Math.random() - 0.5) * 12)
    );
  }
  if (!s.pieces) initPieces();

  function render() {
    if (stopped || s.done) return;
    if (resizeObserver) resizeObserver.disconnect();
    if (raf) cancelAnimationFrame(raf);
    pointers.clear();
    drag = null;
    pinch = null;
    const def = definition();
    g.scene.className = "game-scene trauma-scene";
    g.scene.dataset.stage = s.stage;
    g.scene.innerHTML = `<div class="trauma-topline"><div><strong>ORTHO / RECONSTRUCTION</strong>МЕДИЦИНСКИЙ ИГРОВОЙ СИМУЛЯТОР<br><span class="trauma-live">● СИСТЕМА АКТИВНА</span></div><div class="trauma-xray-tag">${escapeHTML(def.code)} · ${s.round + 1}/${s.deck.length}<br>${escapeHTML(def.name)}<br>ПРОЕКЦИЯ AP / УСЛОВНАЯ</div></div><div class="trauma-canvas-wrap"><canvas class="trauma-canvas" tabindex="0" role="application" aria-label="Рентген и фрагменты. Выберите фрагмент, перетащите его к контуру. Стрелки перемещают, клавиши Q и E вращают."></canvas></div><div class="trauma-statusline"><span class="trauma-stage-text"></span><b class="trauma-accuracy"></b></div>`;
    canvas = g.scene.querySelector("canvas");
    drawCtx = canvas.getContext("2d");
    g.controls.replaceChildren();
    if (s.stage === "repair") renderRepairControls();
    else if (s.stage === "fixation") renderFixation();
    else renderInspectControls();
    bindCanvas();
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(g.scene.querySelector(".trauma-canvas-wrap"));
    resize();
    updateHUD();
    save();
    animate();
  }

  function resize() {
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    width = Math.max(200, rect.width);
    height = Math.max(250, rect.height);
    dpr = Math.min(
      window.devicePixelRatio || 1,
      ctx.settings.quality === "low"
        ? 1
        : ctx.settings.quality === "high"
          ? 2
          : 1.5,
    );
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }
  function scale() {
    return Math.min(width / 100, height / 80) * s.view.zoom;
  }
  function toWorld(clientX, clientY) {
    const r = canvas.getBoundingClientRect(),
      k = scale();
    return {
      x: (clientX - r.left - width / 2) / k - s.view.x,
      y: (clientY - r.top - height / 2) / k - s.view.y,
    };
  }
  function toScreen(x, y) {
    const k = scale();
    return {
      x: width / 2 + (x + s.view.x) * k,
      y: height / 2 + (y + s.view.y) * k,
    };
  }

  function renderInspectControls() {
    g.setObjective("Изучите снимок и отметьте область разрыва");
    g.hint.textContent =
      "Найдите разрыв светлого контура и коснитесь его. Два пальца меняют масштаб; режим «Обзор» позволяет двигать снимок. На ПК: колесо — масштаб, стрелки — курсор, Enter — отметить.";
    addViewControls();
    const hint = document.createElement("div");
    hint.className = "trauma-hint-bar";
    hint.textContent =
      "01  АНАЛИЗ СНИМКА · отметьте место повреждения перед реконструкцией";
    g.scene.append(hint);
  }

  function addViewControls() {
    const row = document.createElement("div");
    row.className = "trauma-view-modes";
    const move = g.button(
      "✥ Обзор",
      () => {
        selectedMode = selectedMode === "view" ? "fragment" : "view";
        move.classList.toggle("active", selectedMode === "view");
        move.textContent =
          selectedMode === "view" ? "✥ Обзор включён" : "✥ Обзор";
      },
      "",
    );
    const minus = g.button("−", () => {
      s.view.zoom = clamp(s.view.zoom - 0.2, 0.75, 2.5);
      save();
    });
    minus.setAttribute("aria-label", "Уменьшить снимок");
    const plus = g.button("+", () => {
      s.view.zoom = clamp(s.view.zoom + 0.2, 0.75, 2.5);
      save();
    });
    plus.setAttribute("aria-label", "Увеличить снимок");
    const reset = g.button("Центр", () => {
      s.view = { zoom: 1, x: 0, y: 0 };
      save();
    });
    const percent = document.createElement("span");
    percent.className = "trauma-zoom-label";
    percent.textContent = `${Math.round(s.view.zoom * 100)}%`;
    row.append(move, minus, plus, reset, percent);
    g.scene.append(row);
  }

  function renderRepairControls() {
    g.setObjective("Совместите все фрагменты с исходным контуром");
    g.hint.textContent =
      ctx.difficulty === "hard"
        ? "Перемещайте и вращайте фрагменты. Точность: положение ±2.2, угол ±7°. Стрелки — движение, Q/E — вращение."
        : "Выберите фрагмент и перетащите к светлому контуру. Поворачивайте ползунком, кнопками или ручкой у края фрагмента. Точный фрагмент защёлкнется.";
    const list = document.createElement("div");
    list.className = "trauma-fragment-list";
    list.setAttribute("role", "group");
    list.setAttribute("aria-label", "Фрагменты");
    for (const piece of s.pieces) {
      const b = g.button(
        `${String(piece.id + 1).padStart(2, "0")}${piece.locked ? " ✓" : ""}`,
        () => {
          s.selected = piece.id;
          updateSelection();
          save();
        },
        "trauma-fragment",
      );
      b.dataset.piece = piece.id;
      b.setAttribute(
        "aria-label",
        `Фрагмент ${piece.id + 1}${piece.locked ? ", совмещён" : ""}`,
      );
      list.append(b);
    }
    g.scene.append(list);
    const toolbar = document.createElement("div");
    toolbar.className = "trauma-precision-tools";
    const left = g.button("↶", () =>
      rotate(-difficultyValue(ctx.difficulty, 5, 4, 3)),
    );
    left.setAttribute("aria-label", "Повернуть против часовой стрелки");
    const control = document.createElement("label");
    control.className = "trauma-angle-control";
    control.innerHTML =
      '<span>Угол</span><input type="range" min="-180" max="180" step="1" aria-label="Угол выбранного фрагмента"><output>0°</output>';
    const slider = control.querySelector("input");
    slider.addEventListener("input", () => {
      const p = selectedPiece();
      if (!p || p.locked) return;
      p.angle = Number(slider.value);
      updateSelection();
    });
    slider.addEventListener("change", () => {
      checkSnap();
      save();
    });
    const right = g.button("↷", () =>
      rotate(difficultyValue(ctx.difficulty, 5, 4, 3)),
    );
    right.setAttribute("aria-label", "Повернуть по часовой стрелке");
    toolbar.append(left, control, right);
    g.scene.append(toolbar);
    const nudge = document.createElement("div");
    nudge.className = "trauma-nudge";
    for (const [label, dx, dy, aria] of [
      ["←", -1, 0, "Сдвинуть влево"],
      ["↑", 0, -1, "Сдвинуть вверх"],
      ["↓", 0, 1, "Сдвинуть вниз"],
      ["→", 1, 0, "Сдвинуть вправо"],
    ]) {
      const b = g.button(label, () => moveSelected(dx, dy));
      b.setAttribute("aria-label", aria);
      nudge.append(b);
    }
    g.scene.append(nudge);
    addViewControls();
    const row = document.createElement("div");
    row.className = "trauma-actions";
    row.append(g.button("Проверить совмещение", validate, "primary"));
    g.controls.append(row);
    updateSelection();
  }

  function renderFixation() {
    g.setObjective("Выберите условную фиксацию по карте задания");
    g.hint.textContent =
      "Геометрия восстановлена. Прочитайте игровую карту и выберите подходящий тип опоры. Это условная механика, не клиническая рекомендация.";
    const panel = document.createElement("div");
    panel.className = "trauma-fixation-panel";
    panel.innerHTML = `<h3>Реконструкция завершена</h3><p>${escapeHTML(FIXATIONS[definition().fix].clue)}</p><div class="trauma-fixation-choices"></div>`;
    for (const [id, fix] of Object.entries(FIXATIONS)) {
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = `<span aria-hidden="true">${fix.icon}</span>${fix.name}`;
      b.addEventListener("click", () => {
        if (id !== definition().fix) {
          g.miss(
            "Тип фиксации не соответствует условной карте. Сопоставьте описание с формой опоры.",
          );
          save();
          return;
        }
        g.hit(2);
        s.fixation = id;
        completeRound();
      });
      panel.querySelector(".trauma-fixation-choices").append(b);
    }
    g.scene.append(panel);
    addViewControls();
  }

  function selectedPiece() {
    return s.pieces.find((p) => p.id === s.selected);
  }
  function updateSelection() {
    const p = selectedPiece();
    if (!p) return;
    for (const b of g.scene.querySelectorAll("[data-piece]")) {
      const piece = s.pieces.find((x) => x.id === Number(b.dataset.piece));
      b.classList.toggle("selected", piece.id === s.selected);
      b.classList.toggle("locked", piece.locked);
      b.textContent = `${String(piece.id + 1).padStart(2, "0")}${piece.locked ? " ✓" : ""}`;
      b.setAttribute(
        "aria-pressed",
        piece.id === s.selected ? "true" : "false",
      );
    }
    const slider = g.scene.querySelector("input[type=range]");
    if (slider) {
      slider.value = Math.round(p.angle);
      slider.disabled = p.locked;
      const output = g.scene.querySelector("output");
      output.textContent = `${Math.round(p.angle)}°`;
    }
    updateHUD();
  }
  function moveSelected(dx, dy) {
    const p = selectedPiece();
    if (!p || p.locked || s.stage !== "repair") return;
    p.x = clamp(p.x + dx, -47, 47);
    p.y = clamp(p.y + dy, -33, 33);
    checkSnap();
    save();
    updateSelection();
  }
  function rotate(amount) {
    const p = selectedPiece();
    if (!p || p.locked || s.stage !== "repair") return;
    p.angle = norm(p.angle + amount);
    checkSnap();
    save();
    updateSelection();
  }
  function currentAccuracy() {
    const ts = targets();
    return (
      s.pieces.reduce((sum, p) => {
        const t = ts[p.id],
          d = distance(p, t),
          a = Math.abs(norm(p.angle - t.angle));
        return sum + Math.max(0, 100 - d * 2.4 - a * 0.65);
      }, 0) / s.pieces.length
    );
  }
  function updateHUD() {
    const locked = s.pieces.filter((p) => p.locked).length;
    const phase =
      s.stage === "inspect"
        ? 0
        : s.stage === "repair"
          ? 0.15 + (0.65 * locked) / s.pieces.length
          : 0.9;
    g.setProgress((s.round + phase) / s.deck.length);
    g.setMetric(
      "Точность",
      s.stage === "inspect" ? "—" : `${Math.round(currentAccuracy())}%`,
    );
    const text = g.scene.querySelector(".trauma-stage-text");
    if (text)
      text.textContent =
        s.stage === "inspect"
          ? "01 / НАЙТИ ПОВРЕЖДЕНИЕ"
          : s.stage === "repair"
            ? `02 / ФРАГМЕНТЫ ${locked} / ${s.pieces.length}`
            : "03 / ФИКСАЦИЯ";
    const accuracy = g.scene.querySelector(".trauma-accuracy");
    if (accuracy)
      accuracy.textContent =
        s.stage === "inspect"
          ? "СНИМОК ГОТОВ"
          : `${Math.round(currentAccuracy())}%`;
  }

  function checkSnap() {
    if (s.stage !== "repair") return false;
    const p = selectedPiece();
    if (!p || p.locked) return false;
    const t = targets()[p.id],
      posError = distance(p, t),
      angleError = Math.abs(norm(p.angle - t.angle));
    if (posError <= tolerance && angleError <= angleTolerance) {
      p.precision = clamp(100 - posError * 1.5 - angleError * 0.35, 70, 100);
      p.x = t.x;
      p.y = t.y;
      p.angle = t.angle;
      p.locked = true;
      g.hit();
      g.feedback(`Фрагмент ${p.id + 1}: точное совмещение.`);
      flash = { x: t.x, y: t.y, start: performance.now() };
      const next = s.pieces.find((x) => !x.locked);
      if (next) s.selected = next.id;
      updateSelection();
      save();
      if (s.pieces.every((x) => x.locked)) {
        s.stage = "fixation";
        render();
      }
      return true;
    }
    return false;
  }
  function validate() {
    if (s.stage !== "repair") return;
    const p = selectedPiece();
    if (p && !p.locked) checkSnap();
    if (s.stage === "fixation") return;
    const unlocked = s.pieces.filter((x) => !x.locked);
    if (unlocked.length) {
      g.miss(
        `Осталось совместить ${unlocked.length} фрагм. Проверьте положение и угол; контуры должны совпасть.`,
      );
      save();
    }
  }
  function completeRound() {
    const value =
      s.pieces.reduce((a, p) => a + (p.precision || 80), 0) / s.pieces.length;
    s.accuracy.push(Math.round(value));
    s.round++;
    if (s.round >= s.deck.length) {
      finish();
      return;
    }
    s.stage = "inspect";
    s.fixation = null;
    initPieces();
    g.feedback("Реконструкция принята. Загружен следующий снимок.");
    render();
  }
  function finish(timeout = false) {
    if (s.done) return;
    s.done = true;
    const average = s.accuracy.length
      ? s.accuracy.reduce((a, b) => a + b, 0) / s.accuracy.length
      : 0;
    const score = clamp(
      Math.round(
        (s.round / s.deck.length) * (60 + average * 0.4) - g.mistakes * 2,
      ),
      0,
      100,
    );
    save();
    g.finish(score, [
      `Восстановлено снимков: ${s.round}/${s.deck.length}.`,
      `Средняя точность постановки: ${Math.round(average)}%.`,
      ...s.accuracy.map((a, i) => `${PUZZLES[s.deck[i]].name}: ${a}%.`),
      timeout
        ? "Время лабораторной смены истекло."
        : "Все реконструкции завершены.",
    ]);
  }

  function hitPiece(point) {
    const ts = targets();
    const ordered = [...s.pieces].sort((a, b) =>
      a.id === s.selected ? -1 : b.id === s.selected ? 1 : 0,
    );
    return ordered.find((p) => {
      if (p.locked) return false;
      const t = ts[p.id],
        a = (-p.angle * Math.PI) / 180,
        dx = point.x - p.x,
        dy = point.y - p.y;
      const lx = dx * Math.cos(a) - dy * Math.sin(a),
        ly = dx * Math.sin(a) + dy * Math.cos(a);
      return (
        Math.abs(lx) <= t.length / 2 + 2.4 && Math.abs(ly) <= t.width / 2 + 3.2
      );
    });
  }
  function rotationHandle(piece) {
    const t = targets()[piece.id],
      a = (piece.angle * Math.PI) / 180;
    return {
      x: piece.x + Math.cos(a) * (t.length / 2 + 5),
      y: piece.y + Math.sin(a) * (t.length / 2 + 5),
    };
  }
  function injuryPoint() {
    const pts = definition().points;
    const i = Math.max(1, Math.floor(pts.length / 2));
    return { x: pts[i][0], y: pts[i][1] };
  }

  function inspectPoint(w) {
    s.inspectCursor = { x: w.x, y: w.y };
    if (
      distance(w, injuryPoint()) <= difficultyValue(ctx.difficulty, 10, 8, 6.5)
    ) {
      s.inspected.push(definition().code);
      g.hit();
      s.stage = "repair";
      s.view = { zoom: 1, x: 0, y: 0 };
      g.feedback("Разрыв найден. Восстановите исходную геометрию.");
      render();
    } else {
      g.miss(
        "Здесь контур целый. Найдите разрыв и смещение соседних сегментов.",
      );
      flash = { x: w.x, y: w.y, start: performance.now(), bad: true };
      save();
    }
  }

  function bindCanvas() {
    canvas.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      canvas.focus({ preventScroll: true });
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        drag = null;
        const pts = [...pointers.values()];
        pinch = {
          distance: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y),
          zoom: s.view.zoom,
          center: {
            x: (pts[0].x + pts[1].x) / 2,
            y: (pts[0].y + pts[1].y) / 2,
          },
          view: { ...s.view },
        };
        return;
      }
      const w = toWorld(e.clientX, e.clientY);
      if (selectedMode === "view" || s.stage === "fixation") {
        drag = {
          type: "view",
          pointer: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          view: { ...s.view },
        };
        return;
      }
      if (s.stage === "inspect") {
        inspectPoint(w);
        return;
      }
      const selected = selectedPiece();
      if (
        selected &&
        !selected.locked &&
        distance(w, rotationHandle(selected)) < 5.5
      ) {
        drag = {
          type: "rotate",
          pointer: e.pointerId,
          start:
            (Math.atan2(w.y - selected.y, w.x - selected.x) * 180) / Math.PI,
          angle: selected.angle,
        };
        return;
      }
      const piece = hitPiece(w);
      if (piece) {
        s.selected = piece.id;
        drag = {
          type: "piece",
          pointer: e.pointerId,
          offset: { x: w.x - piece.x, y: w.y - piece.y },
        };
        updateSelection();
        save();
      } else {
        drag = {
          type: "view",
          pointer: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          view: { ...s.view },
        };
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!pointers.has(e.pointerId)) return;
      e.preventDefault();
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size >= 2) {
        const pts = [...pointers.values()];
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        s.view.zoom = clamp(
          (pinch.zoom * dist) / Math.max(10, pinch.distance),
          0.75,
          2.5,
        );
        const k = scale();
        s.view.x = clamp(
          pinch.view.x + ((pts[0].x + pts[1].x) / 2 - pinch.center.x) / k,
          -35,
          35,
        );
        s.view.y = clamp(
          pinch.view.y + ((pts[0].y + pts[1].y) / 2 - pinch.center.y) / k,
          -30,
          30,
        );
        return;
      }
      if (!drag || drag.pointer !== e.pointerId) return;
      if (drag.type === "view") {
        const k = scale();
        s.view.x = clamp(drag.view.x + (e.clientX - drag.x) / k, -35, 35);
        s.view.y = clamp(drag.view.y + (e.clientY - drag.y) / k, -30, 30);
        return;
      }
      const p = selectedPiece();
      if (!p || p.locked) return;
      const w = toWorld(e.clientX, e.clientY);
      if (drag.type === "rotate")
        p.angle = norm(
          drag.angle +
            (Math.atan2(w.y - p.y, w.x - p.x) * 180) / Math.PI -
            drag.start,
        );
      else {
        p.x = clamp(w.x - drag.offset.x, -47, 47);
        p.y = clamp(w.y - drag.offset.y, -33, 33);
      }
      updateSelection();
    });
    const release = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (drag && drag.pointer === e.pointerId) {
        const wasPiece = drag.type === "piece" || drag.type === "rotate";
        drag = null;
        if (wasPiece) checkSnap();
      }
      save();
    };
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        s.view.zoom = clamp(
          s.view.zoom * (e.deltaY > 0 ? 0.9 : 1.1),
          0.75,
          2.5,
        );
        save();
      },
      { passive: false },
    );
    canvas.addEventListener("keydown", (e) => {
      const moves = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      if (s.stage === "inspect") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inspectPoint(s.inspectCursor);
          return;
        }
        if (moves[e.key]) {
          e.preventDefault();
          const [dx, dy] = moves[e.key],
            step = e.shiftKey ? 4 : 1.5;
          s.inspectCursor.x = clamp(s.inspectCursor.x + dx * step, -47, 47);
          s.inspectCursor.y = clamp(s.inspectCursor.y + dy * step, -33, 33);
          save();
          return;
        }
      }
      if (moves[e.key]) {
        e.preventDefault();
        moveSelected(...moves[e.key]);
      } else if (e.key.toLowerCase() === "q") {
        e.preventDefault();
        rotate(-3);
      } else if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        rotate(3);
      } else if (e.key === "Tab") return;
      else if (e.key === "Enter") {
        e.preventDefault();
        validate();
      }
    });
  }

  function bonePath(c, t) {
    const l = t.length / 2,
      w = t.width / 2;
    c.beginPath();
    c.moveTo(-l, -w * 0.65);
    c.bezierCurveTo(-l - 1, -w * 1.4, -l + 3, -w * 1.7, -l + 4, -w);
    c.bezierCurveTo(-l + 5, -w * 0.5, l - 5, -w * 0.5, l - 3, -w);
    c.bezierCurveTo(l - 1, -w * 1.7, l + 2, -w * 1.3, l, -w * 0.35);
    c.bezierCurveTo(l + 2, w * 0.5, l, w * 1.7, l - 3, w);
    c.bezierCurveTo(l - 5, w * 0.45, -l + 5, w * 0.45, -l + 3, w);
    c.bezierCurveTo(-l + 1, w * 1.6, -l - 2, w * 1.2, -l, w * 0.35);
    c.closePath();
  }
  function drawBone(
    p,
    t,
    { ghost = false, selected = false, intact = false } = {},
  ) {
    const c = drawCtx;
    c.save();
    c.translate(p.x, p.y);
    c.rotate((p.angle * Math.PI) / 180);
    bonePath(c, t);
    if (ghost) {
      c.fillStyle = ctx.difficulty === "hard" ? "#598ba012" : "#588eaa20";
      c.fill();
      c.setLineDash([1.2, 1]);
      c.strokeStyle = "#9fe0eb60";
      c.lineWidth = 0.25;
      c.stroke();
    } else {
      c.shadowColor = p.locked ? "#61edc1" : "#9cd7f7";
      c.shadowBlur = p.locked ? 1.8 : 0.7;
      const grad = c.createLinearGradient(0, -t.width, 0, t.width);
      grad.addColorStop(0, p.locked ? "#609d9a" : "#7194aa");
      grad.addColorStop(0.35, p.locked ? "#d2fce2" : "#d7edf0");
      grad.addColorStop(0.55, p.locked ? "#8edfc7" : "#8ebdce");
      grad.addColorStop(1, p.locked ? "#386e6c" : "#527e96");
      c.fillStyle = grad;
      c.fill();
      c.shadowBlur = 0;
      c.strokeStyle = p.locked ? "#8ff4d1" : "#d1edff";
      c.lineWidth = 0.28;
      c.stroke();
      c.beginPath();
      c.moveTo(-t.length / 2 + 3, 0);
      c.bezierCurveTo(
        -t.length / 5,
        -0.8,
        t.length / 5,
        0.8,
        t.length / 2 - 3,
        0,
      );
      c.strokeStyle = "#20405773";
      c.lineWidth = t.width * 0.21;
      c.stroke();
      for (let i = 0; i < 5; i++) {
        const x = -t.length / 2 + 2 + (i * (t.length - 4)) / 4;
        c.beginPath();
        c.moveTo(x, -t.width * 0.22);
        c.lineTo(x + 0.8, t.width * 0.25);
        c.strokeStyle = "#ffffff19";
        c.lineWidth = 0.14;
        c.stroke();
      }
      if (selected) {
        bonePath(c, t);
        c.strokeStyle = "#6affdb";
        c.lineWidth = 0.65;
        c.stroke();
      }
      if (!intact) {
        c.rotate((-p.angle * Math.PI) / 180);
        c.fillStyle = "#072331";
        c.beginPath();
        c.arc(0, 0, 1.8, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#d8fff4";
        c.font = "bold 2.6px ui-monospace,monospace";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(String(p.id + 1), 0, 0.1);
      }
    }
    c.restore();
  }

  function drawFrame(now) {
    const c = drawCtx;
    if (!c || !canvas) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, width, height);
    c.fillStyle = "#07121e";
    c.fillRect(0, 0, width, height);
    const glow = c.createRadialGradient(
      width * 0.6,
      height * 0.45,
      5,
      width * 0.6,
      height * 0.45,
      width * 0.6,
    );
    glow.addColorStop(0, "#163f573f");
    glow.addColorStop(1, "#07121e00");
    c.fillStyle = glow;
    c.fillRect(0, 0, width, height);
    const k = scale();
    c.save();
    c.translate(width / 2 + s.view.x * k, height / 2 + s.view.y * k);
    c.scale(k, k);
    c.strokeStyle = "#89ceea0a";
    c.lineWidth = 0.15;
    for (let x = -80; x <= 80; x += 5) {
      c.beginPath();
      c.moveTo(x, -70);
      c.lineTo(x, 70);
      c.stroke();
    }
    for (let y = -70; y <= 70; y += 5) {
      c.beginPath();
      c.moveTo(-80, y);
      c.lineTo(80, y);
      c.stroke();
    }
    const ts = targets();
    if (s.stage === "inspect") {
      // The radiograph has a visible offset at the central joint, rather than
      // asking the player to click an invisible answer.
      const split = Math.floor(ts.length / 2);
      ts.forEach((t, i) =>
        drawBone(
          {
            ...t,
            x: t.x + (i >= split ? 2 : 0),
            y: t.y + (i >= split ? 1.5 : 0),
            locked: false,
          },
          t,
          { intact: true },
        ),
      );
      const injury = injuryPoint();
      c.save();
      c.translate(injury.x, injury.y);
      c.rotate(0.2);
      c.fillStyle = "#07121e";
      c.fillRect(-3, -1, 8, 1.6);
      c.strokeStyle = "#e7a58a";
      c.lineWidth = 0.3;
      c.beginPath();
      c.moveTo(-2, -1.8);
      c.lineTo(1, -0.3);
      c.lineTo(0, 0.5);
      c.lineTo(4, 1.6);
      c.stroke();
      c.restore();
      if (ctx.difficulty === "easy") {
        c.setLineDash([0.8, 1.4]);
        c.strokeStyle = `rgba(123,224,209,${0.35 + Math.sin(now * 0.003) * 0.15})`;
        c.lineWidth = 0.25;
        c.beginPath();
        c.arc(injury.x, injury.y, 8, 0, Math.PI * 2);
        c.stroke();
        c.setLineDash([]);
      }
      if (document.activeElement === canvas) {
        const cursor = s.inspectCursor;
        c.strokeStyle = "#9af7df";
        c.lineWidth = 0.2;
        c.beginPath();
        c.moveTo(cursor.x - 3, cursor.y);
        c.lineTo(cursor.x + 3, cursor.y);
        c.moveTo(cursor.x, cursor.y - 3);
        c.lineTo(cursor.x, cursor.y + 3);
        c.stroke();
        c.beginPath();
        c.arc(cursor.x, cursor.y, 1.6, 0, Math.PI * 2);
        c.stroke();
      }
      c.fillStyle = "#7298af";
      c.font = "2px ui-monospace,monospace";
      c.textAlign = "left";
      c.fillText("L", -43, -21);
      c.fillText("RADIOGRAPH / FICTIONAL", -43, 30);
    } else {
      c.fillStyle = "#41758e13";
      c.strokeStyle = "#76adc12b";
      c.lineWidth = 0.2;
      c.setLineDash([1, 1.5]);
      c.beginPath();
      c.roundRect(-48, -33, 30, 64, 3);
      c.fill();
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = "#58829b";
      c.font = "1.5px ui-monospace,monospace";
      c.textAlign = "center";
      c.fillText("ФРАГМЕНТЫ", -33, -29);
      ts.forEach((t) => drawBone(t, t, { ghost: true }));
      s.pieces
        .filter((p) => p.id !== s.selected)
        .forEach((p) => drawBone(p, ts[p.id]));
      const p = selectedPiece();
      if (p) drawBone(p, ts[p.id], { selected: !p.locked });
      if (p && !p.locked && s.stage === "repair") {
        const h = rotationHandle(p);
        c.beginPath();
        c.moveTo(p.x, p.y);
        c.lineTo(h.x, h.y);
        c.strokeStyle = "#58dbb966";
        c.lineWidth = 0.22;
        c.setLineDash([0.5, 0.8]);
        c.stroke();
        c.setLineDash([]);
        c.beginPath();
        c.arc(h.x, h.y, 2.2, 0, Math.PI * 2);
        c.fillStyle = "#123f3a";
        c.fill();
        c.strokeStyle = "#6be3bf";
        c.lineWidth = 0.35;
        c.stroke();
        c.fillStyle = "#abf8df";
        c.font = "2.8px system-ui";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("↻", h.x, h.y);
        if (ctx.difficulty === "easy") {
          const t = ts[p.id];
          c.beginPath();
          c.moveTo(p.x, p.y);
          c.lineTo(t.x, t.y);
          c.strokeStyle = "#78b7c433";
          c.lineWidth = 0.2;
          c.setLineDash([0.7, 1.3]);
          c.stroke();
          c.setLineDash([]);
        }
      }
      if (s.stage === "fixation") drawFixation(ts);
    }
    if (flash) {
      const dt = (now - flash.start) / 700;
      if (dt > 1) flash = null;
      else {
        c.beginPath();
        c.arc(flash.x, flash.y, 2 + dt * 8, 0, Math.PI * 2);
        c.strokeStyle = flash.bad
          ? `rgba(245,143,132,${1 - dt})`
          : `rgba(99,255,206,${1 - dt})`;
        c.lineWidth = 0.5;
        c.stroke();
      }
    }
    c.restore();
    // HUD corner marks remain readable when zooming.
    c.strokeStyle = "#78c9e333";
    c.lineWidth = 1;
    [
      [14, 54, 1, 1],
      [width - 14, 54, -1, 1],
      [14, height - 14, 1, -1],
      [width - 14, height - 14, -1, -1],
    ].forEach(([x, y, sx, sy]) => {
      c.beginPath();
      c.moveTo(x + sx * 15, y);
      c.lineTo(x, y);
      c.lineTo(x, y + sy * 15);
      c.stroke();
    });
    c.fillStyle = "#51859b";
    c.font = "9px ui-monospace,monospace";
    c.textAlign = "right";
    c.fillText(
      `${Math.round(s.view.zoom * 100)}% · ${definition().code}`,
      width - 21,
      height - 20,
    );
    const zoomLabel = g.scene.querySelector(".trauma-zoom-label");
    if (zoomLabel) zoomLabel.textContent = `${Math.round(s.view.zoom * 100)}%`;
  }
  function drawFixation(ts) {
    const c = drawCtx;
    c.save();
    c.strokeStyle = "#55c5b1";
    c.lineWidth = 0.7;
    c.setLineDash([1.5, 1]);
    c.beginPath();
    ts.forEach((t, i) => {
      if (!i) c.moveTo(t.x, t.y);
      else c.lineTo(t.x, t.y);
    });
    c.stroke();
    c.setLineDash([]);
    ts.forEach((t) => {
      c.fillStyle = "#122e31";
      c.strokeStyle = "#83e6cc";
      c.lineWidth = 0.3;
      c.beginPath();
      c.arc(t.x, t.y, 1.2, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    });
    c.restore();
  }
  function animate(now = performance.now()) {
    if (stopped || s.done) return;
    drawFrame(now);
    raf = requestAnimationFrame(animate);
  }
  g.onTimeout = () => finish(true);
  g.every(4000, () => {
    if (!s.done) save();
  });
  render();
  return {
    destroy() {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      if (resizeObserver) resizeObserver.disconnect();
      pointers.clear();
      g.destroy();
    },
  };
}
