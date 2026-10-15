import { ACHIEVEMENTS, DEFAULT_ITEMS, GAMES, SHOP_ITEMS } from "./catalog.js";

export const STORAGE_KEY = "medical-rp:profile:v1";
const listeners = new Set();
let memory = null;
let memoryOnly = false;
let listening = false;
const clone = (value) => JSON.parse(JSON.stringify(value));
const finite = (value, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const integer = (value, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  Math.min(max, Math.max(min, Math.floor(finite(value))));
const object = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};
const gameIds = new Set(GAMES.map((game) => game.id));
const achievementIds = new Set(ACHIEVEMENTS.map((item) => item.id));
const shopIds = new Set(SHOP_ITEMS.map((item) => item.id));

export function createProfile() {
  return {
    version: 1,
    name: "Доктор",
    xp: 0,
    coins: 0,
    missions: 0,
    successful: 0,
    totalScore: 0,
    history: [],
    bests: {},
    achievements: [],
    inventory: [],
    equipped: {
      frame: "default",
      theme: "teal",
      title: "Дежурный врач",
      instrument: "default",
      background: "default",
      victory: "default",
    },
    settings: { quality: "medium", effects: 0.5, music: false },
    selectedRole: "intern",
    daily: { day: "", used: 0 },
    active: null,
    diagnosticMissions: 0,
    completedGames: [],
    lastReceipt: null,
  };
}

/** Normalize persisted data without trusting it as markup, money, or object keys. */
export function normalizeProfile(input) {
  const source = object(input);
  const result = createProfile();
  for (const key of [
    "xp",
    "coins",
    "missions",
    "successful",
    "totalScore",
    "diagnosticMissions",
  ])
    result[key] = integer(source[key]);
  result.successful = Math.min(result.successful, result.missions);
  result.name =
    typeof source.name === "string" && source.name.trim()
      ? source.name.trim().slice(0, 40)
      : result.name;
  result.inventory = [
    ...new Set(
      (Array.isArray(source.inventory) ? source.inventory : []).filter((id) =>
        shopIds.has(id),
      ),
    ),
  ];
  result.achievements = [
    ...new Set(
      (Array.isArray(source.achievements) ? source.achievements : []).filter(
        (id) => achievementIds.has(id),
      ),
    ),
  ];
  result.completedGames = [
    ...new Set(
      (Array.isArray(source.completedGames)
        ? source.completedGames
        : []
      ).filter((id) => gameIds.has(id)),
    ),
  ];
  if (gameIds.has(source.selectedRole))
    result.selectedRole = source.selectedRole;
  const settings = object(source.settings);
  if (["low", "medium", "high"].includes(settings.quality))
    result.settings.quality = settings.quality;
  if (typeof settings.effects === "number" && Number.isFinite(settings.effects))
    result.settings.effects = Math.min(1, Math.max(0, settings.effects));
  if (typeof settings.music === "boolean")
    result.settings.music = settings.music;
  const available = [
    ...DEFAULT_ITEMS,
    ...SHOP_ITEMS.filter((item) => result.inventory.includes(item.id)),
  ];
  const equipped = object(source.equipped);
  for (const type of Object.keys(result.equipped)) {
    if (
      available.some(
        (item) => item.type === type && item.value === equipped[type],
      )
    )
      result.equipped[type] = equipped[type];
  }
  const daily = object(source.daily);
  if (typeof daily.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(daily.day))
    result.daily.day = daily.day;
  result.daily.used = integer(daily.used, 0, 2);
  const validReceipt = (item) =>
    item &&
    typeof item === "object" &&
    typeof item.sessionId === "string" &&
    gameIds.has(item.gameId) &&
    Number.isFinite(item.score);
  result.history = (Array.isArray(source.history) ? source.history : [])
    .filter(validReceipt)
    .slice(0, 100)
    .map((item) => clone(item));
  for (const game of GAMES) {
    const best = object(source.bests)[game.id];
    if (validReceipt(best) && best.gameId === game.id)
      result.bests[game.id] = clone(best);
  }
  if (validReceipt(source.lastReceipt))
    result.lastReceipt = clone(source.lastReceipt);
  else result.lastReceipt = result.history[0] || null;
  const active = object(source.active);
  if (
    typeof active.id === "string" &&
    active.id.length <= 150 &&
    gameIds.has(active.gameId) &&
    ["easy", "medium", "hard"].includes(active.difficulty) &&
    Number.isFinite(active.startedAt)
  ) {
    result.active = {
      id: active.id,
      gameId: active.gameId,
      difficulty: active.difficulty,
      startedAt: active.startedAt,
      state: active.state == null ? null : clone(active.state),
    };
  }
  return result;
}

function readStored() {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return raw ? normalizeProfile(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function notify(profile) {
  for (const callback of listeners) {
    try {
      callback(clone(profile));
    } catch (error) {
      console.error("MEDICAL RP: ошибка обновления профиля", error);
    }
  }
}

function ensureListener() {
  if (listening || typeof globalThis.addEventListener !== "function") return;
  listening = true;
  globalThis.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    memoryOnly = false;
    memory = readStored() || createProfile();
    notify(memory);
  });
}

export function loadProfile() {
  ensureListener();
  const stored = memoryOnly ? null : readStored();
  if (stored) memory = stored;
  if (!memory) memory = createProfile();
  return clone(memory);
}

/** Return false if browser storage is unavailable; the current tab remains playable. */
export function saveProfile(profile) {
  const normalized = normalizeProfile(profile);
  let persisted = false;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(normalized));
    persisted = Boolean(globalThis.localStorage);
  } catch {
    /* Private browsing/quota failures retain an in-memory fallback. */
  }
  memory = normalized;
  memoryOnly = !persisted;
  notify(memory);
  return persisted;
}

export function updateProfile(mutator) {
  const profile = loadProfile();
  mutator(profile);
  saveProfile(profile);
  return loadProfile();
}

export function resetProfile() {
  const profile = createProfile();
  saveProfile(profile);
  return profile;
}

export function subscribeProfile(callback) {
  if (typeof callback !== "function")
    throw new TypeError("Ожидалась функция обновления профиля.");
  ensureListener();
  listeners.add(callback);
  return () => listeners.delete(callback);
}
