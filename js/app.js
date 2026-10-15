import { GAMES, ACHIEVEMENTS, SHOP_ITEMS, DEFAULT_ITEMS } from "./catalog.js";
import {
  loadProfile,
  saveProfile,
  updateProfile,
  resetProfile,
  subscribeProfile,
} from "./storage.js";
import {
  dailyStatus,
  startMission,
  completeMission,
  levelInfo,
  buyItem,
  equipItem,
} from "./progress.js";
import { escapeHTML as esc, formatTime } from "./game-kit.js";
import { Sound } from "./audio.js";
import { icon } from "./icons.js";
import { artwork } from "./art.js";

const app = document.querySelector("#app"),
  modal = document.querySelector("#modal"),
  toastEl = document.querySelector("#toast");
let profile = loadProfile(),
  view = "hub",
  filter = "all",
  gameInstance = null,
  sessionId = null,
  mountToken = 0,
  toastTimeout,
  modalOpener = null,
  currentReceipt = null,
  ending = false,
  currentSaver = null,
  unloading = false,
  saveSequence = 0;
const sound = new Sound(profile.settings);
const pages = {
  hub: [
    "Игровой центр",
    "Выберите свою роль. Каждая смена — новая история.",
    "grid",
  ],
  profile: ["Мой профиль", "Ваш путь от первой смены до мастерства.", "user"],
  achievements: [
    "Достижения",
    "Значимые моменты вашей медицинской карьеры.",
    "trophy",
  ],
  shop: [
    "Магазин",
    "Ваш стиль. Ваша история. Только косметика за MED COINS.",
    "bag",
  ],
  records: [
    "Личные рекорды",
    "Лучшие результаты по каждой специальности.",
    "chart",
  ],
  settings: ["Настройки", "Сделайте свою смену комфортнее.", "settings"],
};
const gameById = (id) => GAMES.find((g) => g.id === id);
const initials = () =>
  profile.name
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "ДР";
const integer = (n) => Number(n || 0).toLocaleString("ru-RU");
const activeGame = () => profile.active && gameById(profile.active.gameId);
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toastEl.classList.remove("visible"), 3600);
}
function applyAppearance() {
  Object.entries(profile.equipped).forEach(([key, value]) => {
    if (key !== "title") document.body.dataset[key] = value;
  });
  sound.setSettings(profile.settings);
}
async function transact(fn) {
  const apply = () => {
    let result;
    profile = updateProfile((p) => {
      result = fn(p);
    });
    return result;
  };
  return navigator.locks
    ? navigator.locks.request("medical-rp-profile", apply)
    : apply();
}
function navButton(id, mobile = false) {
  const p = pages[id];
  return `<button data-nav="${id}" data-testid="nav-${id}" class="${view === id ? "active" : ""}" ${view === id ? 'aria-current="page"' : ""}>${icon(p[2])}<span>${p[0]}</span>${id === "achievements" && !mobile ? `<span class="nav-count">${profile.achievements.length}/${ACHIEVEMENTS.length}</span>` : ""}</button>`;
}
function shell() {
  app.innerHTML = `<div class="app-layout"><aside class="sidebar" id="sidebar"><button class="brand" data-nav="hub" aria-label="MEDICAL RP — игровой центр"><span class="brand-symbol">${icon("cross")}</span><span class="brand-text">MEDICAL <b>RP</b><small>YOUR NEXT CHAPTER</small></span></button><div class="nav-label">ВАШЕ ПРОСТРАНСТВО</div><nav class="nav" aria-label="Основная навигация">${["hub", "profile", "achievements", "shop", "records"].map((id) => navButton(id)).join("")}</nav><div class="nav-label" style="margin-top:27px">ПЛАТФОРМА</div><nav class="nav" aria-label="Параметры">${navButton("settings")}</nav><div class="sidebar-bottom"><div class="hospital-card"><span><i class="online-dot"></i> ВАША ВИРТУАЛЬНАЯ БОЛЬНИЦА</span><strong>Большие истории начинаются<br>с маленькой помощи.</strong><p>8 специальностей. Один путь.<br>И целый мир ваших решений.</p></div><div class="version"><span>MEDICAL RP</span><span>v1.0 · LOCAL</span></div></div></aside><div class="workspace"><header class="topbar"><button class="mobile-menu" aria-label="Открыть меню" aria-expanded="false">${icon("menu")}</button><div class="mobile-brand"><span class="brand-symbol">${icon("cross")}</span><span>MEDICAL <b>RP</b></span></div><div class="breadcrumb">Госпиталь ${icon("chevron")} <span id="breadcrumb-title">Игровой центр</span></div><div class="topbar-right"><div class="balance" title="MED COINS"><span class="coin-icon">M</span><span data-balance>${integer(profile.coins)}</span><small>MC</small></div><div class="topbar-divider"></div><button class="profile-trigger" data-nav="profile" aria-label="Открыть профиль"><div class="avatar" data-initials>${esc(initials())}</div><div><strong data-profile-name>${esc(profile.name)}</strong><small data-profile-level>Уровень ${levelInfo(profile.xp).level} · ${esc(profile.equipped.title)}</small></div>${icon("chevron")}</button></div></header><main class="main" id="main" tabindex="-1"></main></div><nav class="mobile-nav" aria-label="Мобильная навигация">${["hub", "profile", "achievements", "shop", "settings"].map((id) => navButton(id, true)).join("")}</nav></div>`;
  app.addEventListener("click", (event) => {
    const nav = event.target.closest("[data-nav]");
    if (nav) {
      navigate(nav.dataset.nav);
      return;
    }
    if (event.target.closest(".mobile-menu")) {
      const sidebar = document.querySelector("#sidebar");
      sidebar.classList.toggle("open");
      event.target
        .closest("button")
        .setAttribute("aria-expanded", sidebar.classList.contains("open"));
    }
  });
}
function updateLive() {
  document
    .querySelectorAll("[data-balance]")
    .forEach((el) => (el.textContent = integer(profile.coins)));
  document
    .querySelectorAll("[data-initials]")
    .forEach((el) => (el.textContent = initials()));
  document
    .querySelectorAll("[data-profile-name]")
    .forEach((el) => (el.textContent = profile.name));
  document
    .querySelectorAll("[data-profile-level]")
    .forEach(
      (el) =>
        (el.textContent = `Уровень ${levelInfo(profile.xp).level} · ${profile.equipped.title}`),
    );
  document
    .querySelectorAll("[data-nav=achievements] .nav-count")
    .forEach(
      (el) =>
        (el.textContent = `${profile.achievements.length}/${ACHIEVEMENTS.length}`),
    );
  const d = dailyStatus(profile);
  document
    .querySelectorAll("[data-attempts]")
    .forEach((el) => (el.textContent = d.remaining));
  document
    .querySelectorAll("[data-used]")
    .forEach((el) => (el.textContent = d.used));
  document.querySelectorAll("[data-reset]").forEach((el) => {
    const s = d.secondsUntilReset;
    el.textContent = `${String(Math.floor(s / 3600)).padStart(2, "0")}:${formatTime(s % 3600)}`;
  });
  document
    .querySelectorAll("[data-attempt-bar]")
    .forEach((el, i) => el.classList.toggle("used", i >= d.remaining));
}
function heading(id) {
  const p = pages[id];
  return `<div class="page-heading"><div><h1>${p[0]}</h1><p>${p[1]}</p></div><span class="date-chip">${icon("moon")} <span>${new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "Asia/Almaty" }).format(new Date())} · НОВАЯ СМЕНА</span></span></div>`;
}
function xpBar() {
  const l = levelInfo(profile.xp);
  return `<div class="xp-track"><i style="width:${l.progress * 100}%"></i></div><div class="xp-caption"><span>Уровень ${l.level}</span><span>${l.current} / ${l.required} XP</span></div>`;
}
function resumeBanner() {
  const g = activeGame();
  return g
    ? `<div class="resume-banner"><div><strong>Ваша смена ещё идёт: ${g.role}</strong><p>Прогресс сохранён. Продолжение не расходует попытку.</p></div><button class="btn primary" data-testid="resume-mission" data-resume>${icon("play")} Продолжить</button></div>`
    : "";
}
function card(g, index) {
  const three = ["feldsher", "surgeon"].includes(g.id);
  return `<button class="game-card" data-game="${g.id}" data-testid="game-card-${g.id}" style="--game-color:${g.color}" aria-label="${g.role}: ${g.title}"><div class="card-art">${artwork(g.id)}<span class="card-number">${String(index + 1).padStart(2, "0")} / 08</span><span class="dim-badge ${three ? "three" : ""}">${three ? "3D · IMMERSIVE" : "2.5D"}</span></div><div class="card-body"><div class="card-category"><i></i>${g.id === "intern" ? "Первое дежурство" : g.id === "paramedic" ? "Экстренная помощь" : g.id === "feldsher" ? "Стабилизация" : g.id === "narcologist" ? "Лабораторный анализ" : g.id === "pediatrician" ? "Маленькие пациенты" : g.id === "therapist" ? "Клинический детектив" : g.id === "traumatologist" ? "Реконструкция" : "Операционная"}</div><h3>${g.role}</h3><p>${g.kind}</p><div class="card-footer"><span>${icon("clock")} ${g.duration}</span><span class="reward">до ${g.reward} MC</span><span class="card-arrow">${icon("arrow")}</span></div></div></button>`;
}
function hub() {
  const d = dailyStatus(profile);
  return `${heading("hub")}${resumeBanner()}<div class="hero-row"><section class="hero"><div class="hero-badge">${icon("spark")} БОЛЬШЕ, ЧЕМ ПРОСТО ИГРА</div><div class="hero-content"><div class="eyebrow"><i class="online-dot"></i> ВАША СМЕНА НАЧИНАЕТСЯ ЗДЕСЬ</div><h2>Точность.<br>Спокойствие.<br><span>Ваше призвание.</span></h2><p>Восемь медицинских специальностей.<br>Восемь способов изменить чью-то историю.</p><button class="btn primary" data-explore>Выбрать специальность ${icon("arrow")}</button></div><div class="hero-visual">${artwork("surgeon", true)}</div><span class="hero-corner">MEDICAL SIMULATION / EST. 2026</span></section><section class="shift-card" aria-label="Ежедневные попытки"><div class="shift-header"><strong>Ваша смена сегодня</strong>${icon("bolt")}</div><div class="attempt-big"><b data-attempts data-testid="attempts-remaining">${d.remaining}</b><span>/ 2</span></div><p class="attempt-desc">попытки на все роли · использовано <span data-used>${d.used}</span></p><div class="attempt-bars"><i data-attempt-bar></i><i data-attempt-bar></i></div><div class="shift-reset"><span>До новой смены</span><strong data-reset>00:00:00</strong></div><p class="shift-timezone">00:00 · Asia/Almaty</p></section></div><section id="specialties"><div class="section-heading"><div><h2>Найдите своё призвание <span>08</span></h2><p>Выберите специальность и начните свою историю.</p></div><div class="filters" aria-label="Тип игры"><button data-filter="all" class="${filter === "all" ? "active" : ""}">Все</button><button data-filter="2d" class="${filter === "2d" ? "active" : ""}">2.5D</button><button data-filter="3d" class="${filter === "3d" ? "active" : ""}">3D</button></div></div><div class="game-grid">${GAMES.map(
    (g, i) => ({ g, i }),
  )
    .filter(
      ({ g }) =>
        filter === "all" ||
        (filter === "3d"
          ? ["feldsher", "surgeon"].includes(g.id)
          : !["feldsher", "surgeon"].includes(g.id)),
    )
    .map(({ g, i }) => card(g, i))
    .join(
      "",
    )}</div></section><footer class="hub-footer"><span>${icon("info")} Самостоятельная игра. Вымышленные ситуации и условные медицинские действия.</span><span>${icon("lock")} Без регистрации · Прогресс хранится на этом устройстве</span></footer>`;
}
function profilePage() {
  return `${heading("profile")}<section class="panel profile-panel"><div class="avatar large">${esc(initials())}</div><div class="profile-info"><div class="eyebrow">ЛИЧНОЕ ДЕЛО / MEDICAL RP</div><h2>${esc(profile.name)}</h2><div class="title">${esc(profile.equipped.title)}</div>${xpBar()}</div></section><div class="stats-grid">${[
    ["bolt", profile.missions, "Сыграно миссий"],
    ["heart", profile.successful, "Успешных смен"],
    [
      "chart",
      profile.missions
        ? Math.round(profile.totalScore / profile.missions) + "%"
        : "—",
      "Средний результат",
    ],
    ["coin", integer(profile.coins), "MED COINS"],
  ]
    .map(
      ([ic, value, label]) =>
        `<div class="stat">${icon(ic)}<strong>${value}</strong><span>${label}</span></div>`,
    )
    .join(
      "",
    )}</div><div class="two-col"><section class="panel"><h3>Как к вам обращаться?</h3><form id="name-form"><div class="field"><label for="doctor-name">Имя профиля</label><input id="doctor-name" name="doctorName" type="text" maxlength="40" autocomplete="nickname" value="${esc(profile.name)}" required></div><button class="btn" type="submit">Сохранить имя ${icon("check")}</button></form></section><section class="panel"><h3>Ваша карьера</h3><p class="subtle" style="margin-top:15px">Открыто достижений: ${profile.achievements.length} / ${ACHIEVEMENTS.length}<br>Специальностей пройдено: ${profile.completedGames.length} / 8<br>Куплено предметов: ${profile.inventory.length}</p><button class="btn ghost" style="margin-top:22px" data-nav="records">История результатов ${icon("arrow")}</button></section></div>`;
}
function achievementsPage() {
  return `${heading("achievements")}<div class="achievements-grid">${ACHIEVEMENTS.map(
    (a) => {
      const got = profile.achievements.includes(a.id);
      return `<article class="achievement ${got ? "unlocked" : ""}"><div class="achievement-icon">${a.icon}</div><h3>${a.title}</h3><p>${a.description}</p><span>${got ? "✓ Достижение получено" : "○ Впереди новая история"}</span></article>`;
    },
  ).join("")}</div>`;
}
function shopPreview(i) {
  if (i.type === "frame") return `<div class="avatar">${esc(initials())}</div>`;
  if (i.type === "theme")
    return '<span class="theme-preview"><i></i><i></i></span>';
  if (i.type === "title")
    return `<span style="font-size:12px;letter-spacing:.12em;color:var(--accent)">${i.preview}</span>`;
  if (i.type === "instrument")
    return `<span style="color:${i.preview}">${icon("cross")}</span>`;
  if (i.type === "background")
    return '<span style="font-size:60px;color:#408f9d">▦</span>';
  return '<span style="color:#f2d18c">✦</span>';
}
function shopPage() {
  return `${heading("shop")}<div class="shop-grid">${SHOP_ITEMS.map((i) => {
    const own = profile.inventory.includes(i.id),
      equipped = profile.equipped[i.type] === i.value;
    return `<article class="shop-card" style="--item-color:${i.preview.startsWith("#") ? i.preview : "#74e2c7"}"><div class="shop-preview">${shopPreview(i)}</div><h3>${i.name}</h3><p>${i.description}</p><button class="btn ${equipped ? "ghost" : own ? "" : "primary"}" data-buy="${i.id}" ${equipped ? "disabled" : ""}>${equipped ? "✓ Используется" : own ? "Применить" : `${i.price} MC · Купить`}</button></article>`;
  }).join(
    "",
  )}</div><section class="panel" style="margin-top:22px"><h3>Базовое оформление</h3><p class="subtle" style="margin-top:6px">Можно вернуть любой элемент к исходному виду.</p><div class="inventory">${DEFAULT_ITEMS.map((i) => `<button class="btn ghost" data-equip="${i.id}" ${profile.equipped[i.type] === i.value ? "disabled" : ""}>${i.name}</button>`).join("")}</div></section><p class="subtle" style="margin:19px 0">Покупки меняют только оформление. Дневной лимит остаётся общим: две попытки.</p>`;
}
function recordsPage() {
  return `${heading("records")}<div class="section-heading"><h2>Лучшие смены</h2><span class="subtle">Только ваши результаты</span></div><div class="record-list">${GAMES.map(
    (g) => {
      const r = profile.bests[g.id];
      return `<div class="record-row" style="--game-color:${g.color}"><span class="record-game-icon">${g.icon}</span><div class="record-info"><h3>${g.role}</h3><p>${g.title}</p></div>${r ? `<span class="record-score">${r.score}% · ${formatTime(r.elapsed)}</span><strong>${r.grade}</strong>` : '<span class="subtle">Ещё впереди</span>'}</div>`;
    },
  ).join(
    "",
  )}</div><div class="section-heading" style="margin-top:32px"><h2>История результатов</h2><span class="subtle">Последние 100 миссий</span></div>${profile.history.length ? `<div class="record-list">${profile.history.map((r) => `<div class="record-row"><div class="record-info"><h3>${esc(r.role)} · ${esc(r.title)}</h3><p>${new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Almaty" }).format(new Date(r.finishedAt))} · ${r.difficulty === "easy" ? "Лёгкий" : r.difficulty === "hard" ? "Сложный" : "Средний"} · ${formatTime(r.elapsed)}</p></div><span class="record-score">${r.score}%</span><span class="subtle">+${r.coins} MC</span><strong>${r.grade}</strong></div>`).join("")}</div>` : `<div class="panel empty-state">${icon("chart")}<h3>Ваша история ещё не написана</h3><p>Завершите первую миссию — и она появится здесь.</p><button class="btn primary" data-nav="hub">Начать свою смену ${icon("arrow")}</button></div>`}`;
}
function settingsPage() {
  return `${heading("settings")}<section class="panel"><div class="setting-row"><div><strong>Музыка главного меню</strong><p>Спокойная синтезированная мелодия. Звук включается после вашего касания.</p></div><input class="toggle" type="checkbox" data-setting="music" aria-label="Музыка" ${profile.settings.music ? "checked" : ""}></div><div class="setting-row"><div><strong>Громкость эффектов</strong><p>Инструменты, мониторы и обратная связь.</p></div><input type="range" min="0" max="1" step="0.05" value="${profile.settings.effects}" data-setting="effects" aria-label="Громкость эффектов"></div><div class="setting-row"><div><strong>Качество графики</strong><p>Меняет разрешение рендеринга, тени и детализацию 3D. Применится при следующем запуске сцены.</p></div><select data-setting="quality" aria-label="Качество графики">${[
    ["low", "Низкое"],
    ["medium", "Среднее"],
    ["high", "Высокое"],
  ]
    .map(
      ([v, t]) =>
        `<option value="${v}" ${profile.settings.quality === v ? "selected" : ""}>${t}</option>`,
    )
    .join(
      "",
    )}</select></div><div class="setting-row"><div><strong>Полноэкранный режим</strong><p>${document.fullscreenEnabled ? "Больше пространства для вашей смены." : "Этот браузер не поддерживает полноэкранный режим страницы."}</p></div><button class="btn ghost" data-fullscreen ${!document.fullscreenEnabled ? "disabled" : ""}>${icon("expand")} На весь экран</button></div></section><section class="panel" style="margin-top:22px"><h3>Управление</h3><p class="subtle" style="margin-top:15px">Касание или щелчок — выбор. Перетаскивание — работа с предметами. Удержание — точные действия. Два пальца или колёсико — масштаб 3D и рентгена. В 3D проведите по свободному месту, чтобы повернуть камеру. При работе с инструментом камера фиксируется.</p></section><section class="panel" style="margin-top:22px"><h3>Локальные данные</h3><p class="subtle" style="margin:13px 0 20px">Прогресс и две попытки в сутки хранятся в этом браузере. Сброс в 00:00 по Asia/Almaty. Смена устройства, очистка данных или изменение часов могут изменить локальные ограничения. Серверной защиты и синхронизации нет.</p><button class="btn danger" data-reset-progress>Сбросить локальный прогресс</button></section>`;
}
function renderPage() {
  const main = document.querySelector("#main");
  if (!main) return;
  main.classList.remove("page-transition");
  const renderers = {
    hub,
    profile: profilePage,
    achievements: achievementsPage,
    shop: shopPage,
    records: recordsPage,
    settings: settingsPage,
  };
  main.innerHTML = renderers[view]?.() || hub();
  void main.offsetWidth;
  main.classList.add("page-transition");
  document.querySelector("#breadcrumb-title").textContent =
    pages[view]?.[0] || "Игровой центр";
  document.querySelectorAll("[data-nav]").forEach((b) => {
    b.classList.toggle("active", b.dataset.nav === view);
    if (b.dataset.nav === view) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  updateLive();
  bindPage();
}
function navigate(next = "hub") {
  if (!pages[next]) next = "hub";
  if (gameInstance || sessionId) unmountGame();
  document.body.classList.remove("playing");
  view = next;
  document.querySelector("#sidebar")?.classList.remove("open");
  document
    .querySelector(".mobile-menu")
    ?.setAttribute("aria-expanded", "false");
  renderPage();
  window.scrollTo(0, 0);
  sound.menu(true);
}
function bindPage() {
  const main = document.querySelector("#main");
  main.onclick = async (event) => {
    const game = event.target.closest("[data-game]");
    if (game) {
      openMission(game.dataset.game);
      return;
    }
    const resume = event.target.closest("[data-resume]");
    if (resume) {
      await launchActive();
      return;
    }
    const filterButton = event.target.closest("[data-filter]");
    if (filterButton) {
      filter = filterButton.dataset.filter;
      renderPage();
      return;
    }
    if (event.target.closest("[data-explore]")) {
      document.querySelector("#specialties")?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
          ? "auto"
          : "smooth",
      });
      document.querySelector(".game-card")?.focus({ preventScroll: true });
      return;
    }
    const buy = event.target.closest("[data-buy]");
    if (buy) {
      try {
        await transact((p) => buyItem(p, buy.dataset.buy));
        sound.play("success");
        renderPage();
        toast("Предмет применён. Новое оформление уже с вами.");
      } catch (e) {
        toast(e.message);
      }
      return;
    }
    const equip = event.target.closest("[data-equip]");
    if (equip) {
      try {
        await transact((p) => equipItem(p, equip.dataset.equip));
        renderPage();
        toast("Оформление изменено");
      } catch (e) {
        toast(e.message);
      }
      return;
    }
    if (event.target.closest("[data-fullscreen]")) {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch {
        toast("Браузер не разрешил полноэкранный режим.");
      }
      return;
    }
    if (event.target.closest("[data-reset-progress]")) confirmReset();
  };
  const form = main.querySelector("#name-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = new FormData(form).get("doctorName").trim();
    if (!name) return;
    await transact((p) => {
      p.name = name.slice(0, 40);
    });
    renderPage();
    toast("Имя профиля сохранено");
  });
  main.querySelectorAll("[data-setting]").forEach((el) =>
    el.addEventListener("change", async () => {
      sound.unlock();
      const k = el.dataset.setting,
        v =
          el.type === "checkbox"
            ? el.checked
            : el.type === "range"
              ? Number(el.value)
              : el.value;
      await transact((p) => {
        p.settings[k] = v;
      });
      sound.setSettings(profile.settings);
      if (k === "effects") sound.play("tap");
    }),
  );
}
function showModal(html) {
  modalOpener = document.activeElement;
  modal.innerHTML = `<button class="modal-close" aria-label="Закрыть">${icon("close")}</button>${html}`;
  modal.querySelector(".modal-close").onclick = () => modal.close();
  if (!modal.open) modal.showModal();
}
modal.addEventListener("close", () => {
  modalOpener?.focus?.();
});
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    const r = modal.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      modal.close();
  }
});
function openMission(id) {
  const g = gameById(id);
  if (!g) return;
  sound.play("tap");
  const d = dailyStatus(profile),
    active = profile.active,
    same = active?.gameId === id;
  showModal(
    `<div style="--game-color:${g.color}"><div class="mission-modal-art">${artwork(g.id)}</div><div class="mission-modal-body"><div class="eyebrow">${g.role.toUpperCase()} / ${g.kind}</div><h2>${g.title}</h2><p>${g.description}</p><div class="mission-meta"><span>${icon("clock")} ${g.duration}</span><span class="reward">${icon("coin")} до ${g.reward} MC</span><span>${icon("expand")} ${g.orientation === "landscape" ? "Горизонтально" : "Вертикально"}</span></div><ol class="tutorial">${g.tutorial.map((t, i) => `<li><span>${i + 1}</span>${t}</li>`).join("")}</ol>${
      active
        ? `<div class="game-pause-note">${same ? "Эта смена уже начата. Продолжите с сохранённого этапа." : `Вы уже на смене: ${activeGame().role}. Сначала продолжите её или завершите с результатом.`}</div>`
        : `<div class="g-label">СЛОЖНОСТЬ</div><div class="difficulty" data-testid="difficulty">${[
            ["easy", "Лёгкий"],
            ["medium", "Средний"],
            ["hard", "Сложный"],
          ]
            .map(
              ([v, t]) =>
                `<label><input type="radio" name="difficulty" value="${v}" ${v === "medium" ? "checked" : ""}><span>${t}</span></label>`,
            )
            .join(
              "",
            )}</div><p class="difficulty-note">Выше сложность — больше задач, меньше подсказок и строже точность.</p>`
    }<button class="btn primary mission-start" data-testid="launch-mission" ${!active && !d.remaining ? "disabled" : ""}>${icon(active ? "play" : "bolt")} ${active ? "Продолжить смену" : d.remaining ? "Начать смену · 1 попытка" : "Смена завершена до 00:00"}</button><p class="difficulty-note" style="text-align:center;margin:12px 0 0">${active ? "Сохранение происходит автоматически." : `Осталось ${d.remaining} из 2 попыток. Попытка списывается при запуске.`}</p></div></div>`,
  );
  modal.querySelector('[data-testid="launch-mission"]').onclick = async (e) => {
    const b = e.currentTarget;
    b.disabled = true;
    const difficulty =
      modal.querySelector("[name=difficulty]:checked")?.value || "medium";
    try {
      sound.unlock();
      if (!profile.active)
        await transact((p) => startMission(p, id, difficulty));
      modal.close();
      await launchActive();
    } catch (error) {
      toast(error.message);
      b.disabled = false;
    }
  };
}
function confirmReset() {
  showModal(
    `<div class="modal-standard"><h2>Начать историю заново?</h2><p>Будут удалены баланс, опыт, покупки, рекорды и активная миссия в этом браузере. Это действие нельзя отменить.</p><div class="field"><label for="reset-confirm">Введите СБРОС для подтверждения</label><input id="reset-confirm" type="text" autocomplete="off" placeholder="СБРОС"></div><div class="modal-actions"><button class="btn ghost" data-cancel>Отмена</button><button class="btn danger" data-confirm disabled>Удалить прогресс</button></div></div>`,
  );
  modal.querySelector("[data-cancel]").onclick = () => modal.close();
  const input = modal.querySelector("input"),
    button = modal.querySelector("[data-confirm]");
  input.oninput = () => (button.disabled = input.value !== "СБРОС");
  button.onclick = async () => {
    await transact((p) => {
      Object.keys(p).forEach((k) => delete p[k]);
      Object.assign(p, resetProfile());
    });
    modal.close();
    navigate("settings");
    toast("Локальный прогресс сброшен");
  };
}
function unmountGame() {
  mountToken++;
  const old = gameInstance;
  gameInstance = null;
  try {
    old?.destroy();
  } catch (e) {
    console.error(e);
  }
  sessionId = null;
  currentSaver = null;
  sound.ambience(false);
  sound.menu(true);
}
async function launchActive() {
  profile = loadProfile();
  if (!profile.active) {
    navigate("hub");
    return;
  }
  if (gameInstance) unmountGame();
  const active = profile.active,
    g = gameById(active.gameId),
    token = ++mountToken;
  sessionId = active.id;
  ending = false;
  document.body.classList.add("playing");
  sound.menu(false);
  sound.ambience(true);
  const main = document.querySelector("#main");
  main.classList.remove("page-transition");
  main.innerHTML = `<div class="game-page ${g.orientation}"><header class="mission-top"><button class="mission-back" data-testid="return-hub" aria-label="Сохранить и вернуться в центр">${icon("back")}</button><div class="mission-top-title"><strong>${g.role} / ${g.title}</strong><span>${active.difficulty === "easy" ? "Лёгкий" : active.difficulty === "hard" ? "Сложный" : "Средний"} · АВТОСОХРАНЕНИЕ</span></div><span class="mission-top-brand">MEDICAL RP</span><button class="btn ghost" data-end-shift>Завершить смену</button></header><div class="rotation-hint">${icon("rotate")} Для более удобного управления поверните телефон горизонтально.</div><div class="game-root" data-testid="game-root"><div class="game-loading">${icon("cross")}<p>Готовим ${g.id === "surgeon" ? "операционную" : g.id === "feldsher" ? "палату" : "вашу смену"}…</p></div></div></div>`;
  main.querySelector("[data-testid=return-hub]").onclick = () =>
    navigate("hub");
  main.querySelector("[data-end-shift]").onclick = () => {
    showModal(
      `<div class="modal-standard"><h2>Завершить смену досрочно?</h2><p>Незавершённые задачи дадут результат D. Использованная попытка не вернётся. Чтобы продолжить позже, выберите «Вернуться в центр» — прогресс сохранится.</p><div class="modal-actions"><button class="btn ghost" data-continue>Продолжить</button><button class="btn danger" data-abandon>Завершить с результатом D</button></div></div>`,
    );
    modal.querySelector("[data-continue]").onclick = () => modal.close();
    modal.querySelector("[data-abandon]").onclick = () => {
      modal.close();
      finish(
        {
          score: 0,
          correct: 0,
          mistakes: 1,
          elapsed: Math.round(profile.active?.state?._kit?.elapsed || 0),
          details: ["Смена завершена досрочно."],
        },
        active.id,
      );
    };
  };
  try {
    const module = await import(`../games/${g.id}.js`);
    if (token !== mountToken) return;
    const root = main.querySelector("[data-testid=game-root]");
    root.replaceChildren();
    const instance = await module.mount({
      root,
      difficulty: active.difficulty,
      state: active.state,
      gameId: g.id,
      settings: { ...profile.settings },
      audio: sound,
      registerSave(fn) {
        currentSaver = fn;
      },
      save(state) {
        if (sessionId !== active.id || ending) return;
        const data = JSON.parse(JSON.stringify(state)),
          seq = ++saveSequence;
        const save = (p) => {
          if (p.active?.id === active.id && seq === saveSequence)
            p.active.state = data;
        };
        if (unloading) {
          profile = updateProfile(save);
        } else
          transact(save).catch(() => toast("Не удалось сохранить прогресс."));
      },
      finish(result) {
        finish(result, active.id);
      },
    });
    if (token !== mountToken) {
      instance?.destroy?.();
      return;
    }
    gameInstance = instance;
  } catch (error) {
    console.error(error);
    if (token !== mountToken) return;
    main.querySelector("[data-testid=game-root]").innerHTML =
      `<div class="panel empty-state">${icon("info")}<h3>Не удалось открыть сцену</h3><p>${esc(error.message)}</p><button class="btn primary" data-retry>Повторить без новой попытки</button></div>`;
    main.querySelector("[data-retry]").onclick = launchActive;
  }
}
async function finish(result, id) {
  if (ending || sessionId !== id) return;
  ending = true;
  try {
    let receipt = await transact((p) =>
      completeMission(p, { ...result, sessionId: id }),
    );
    currentReceipt = receipt;
    unmountGame();
    document.body.classList.remove("playing");
    view = "hub";
    renderResult(receipt);
    sound.play(receipt.score >= 50 ? "win" : "lose");
  } catch (error) {
    ending = false;
    console.error(error);
    toast(error.message);
  }
}
function renderResult(r) {
  document.body.classList.remove("playing");
  view = "results";
  document.querySelector("#breadcrumb-title").textContent = "Результаты смены";
  const d = dailyStatus(profile);
  const particles =
    r.grade === "S" || profile.equipped.victory === "confetti"
      ? `<div class="result-particles">${Array.from({ length: 24 }, (_, i) => `<i style="left:${(i * 41) % 100}%;animation-delay:${i * 0.13}s;background:${["#74e2c7", "#e6c588", "#9bbdff"][i % 3]}"></i>`).join("")}</div>`
      : "";
  document.querySelector("#main").innerHTML =
    `<div class="result-wrap page-transition" data-testid="mission-result"><section class="result-card">${particles}<div class="eyebrow" style="justify-content:center">СМЕНА ЗАВЕРШЕНА / ${esc(r.role)}</div><div class="result-grade"><span>${r.grade}</span></div><h1>${r.grade === "S" ? "Безупречная работа" : r.score >= 70 ? "Отличная смена" : r.score >= 50 ? "Хорошее начало" : "Опыт приходит с практикой"}</h1><p class="subtle">${esc(r.title)} · ${r.score} из 100 баллов</p><div class="result-rewards"><div><strong class="gold">+${r.coins}</strong><span>MED COINS</span></div><div><strong>+${r.xp}</strong><span>ОПЫТА / XP</span></div></div><div class="result-stats"><div><strong>${formatTime(r.elapsed)}</strong><span>Время</span></div><div><strong>${r.correct}</strong><span>Верных действий</span></div><div><strong>${r.mistakes}</strong><span>Ошибок</span></div><div><strong data-attempts>${d.remaining}</strong><span>Попыток осталось</span></div></div><ul class="result-details">${r.details.map((t) => `<li>• ${esc(t)}</li>`).join("")}</ul>${xpBar()}${r.level.level > r.previousLevel.level ? `<div class="result-unlock" style="margin-top:15px">Новый уровень — ${r.level.level}!</div>` : ""}<div class="result-unlocks">${r.achievements
      .map((id) => {
        const a = ACHIEVEMENTS.find((x) => x.id === id);
        return a
          ? `<div class="result-unlock">${a.icon} Достижение: ${a.title}</div>`
          : "";
      })
      .join(
        "",
      )}</div><div class="result-actions"><button class="btn primary" data-testid="return-hub" data-result-hub>В игровой центр ${icon("arrow")}</button><button class="btn ghost" data-result-records>Мои рекорды</button></div></section></div>`;
  document.querySelector("[data-result-hub]").onclick = () => navigate("hub");
  document.querySelector("[data-result-records]").onclick = () =>
    navigate("records");
  window.scrollTo(0, 0);
  updateLive();
  sound.menu(true);
}

shell();
applyAppearance();
renderPage();
subscribeProfile((p) => {
  const oldActiveId = profile.active?.id;
  profile = p;
  applyAppearance();
  updateLive();
  if (sessionId && p.active?.id !== sessionId && !ending) {
    unmountGame();
    navigate("hub");
    toast("Эта смена завершена в другой вкладке.");
  } else if (!sessionId && view === "hub" && oldActiveId !== p.active?.id) {
    renderPage();
  }
});
setInterval(updateLive, 1000);
document.addEventListener(
  "pointerdown",
  () => {
    sound.unlock();
    if (!sessionId) sound.menu(true);
  },
  { once: true },
);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.open) {
    document.querySelector("#sidebar")?.classList.remove("open");
  }
});
window.addEventListener("pagehide", () => {
  unloading = true;
  try {
    currentSaver?.();
  } catch {}
});
window.addEventListener("pageshow", () => {
  unloading = false;
});
if (!saveProfile(profile))
  toast(
    "Браузер запретил сохранение. Прогресс доступен только до закрытия этой вкладки.",
  );
