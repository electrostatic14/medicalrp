import { ACHIEVEMENTS, DEFAULT_ITEMS, GAMES, SHOP_ITEMS } from "./catalog.js";

const DAILY_LIMIT = 2;
const HISTORY_LIMIT = 100;
const diagnosticGames = new Set(["narcologist", "therapist"]);
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Almaty",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const midnightCache = new Map();
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const integer = (n, fallback = 0) =>
  Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;

function timeValue(now) {
  const value = now instanceof Date ? now.getTime() : now;
  if (!Number.isFinite(value)) throw new TypeError("Неверное время.");
  return Math.floor(value);
}

export function almatyDay(now = Date.now()) {
  const parts = dateFormatter.formatToParts(timeValue(now));
  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type).value)
    .join("-");
}

function nextMidnight(now, day) {
  if (midnightCache.has(day)) return midnightCache.get(day);
  // Search the timezone boundary instead of hardcoding UTC+5. This also handles
  // the historical Almaty offset change and does not depend on the device zone.
  let before = now;
  let after = now + 36 * 60 * 60 * 1000;
  while (after - before > 1) {
    const middle = Math.floor((before + after) / 2);
    if (almatyDay(middle) === day) before = middle;
    else after = middle;
  }
  if (midnightCache.size > 8) midnightCache.clear();
  midnightCache.set(day, after);
  return after;
}

export function dailyStatus(profile, now = Date.now()) {
  const current = timeValue(now);
  const day = almatyDay(current);
  const used =
    profile.daily?.day === day
      ? clamp(integer(profile.daily.used), 0, DAILY_LIMIT)
      : 0;
  const resetAt = nextMidnight(current, day);
  return {
    day,
    used,
    remaining: DAILY_LIMIT - used,
    resetAt,
    secondsUntilReset: Math.max(0, Math.ceil((resetAt - current) / 1000)),
  };
}

export function startMission(
  profile,
  gameId,
  difficulty = "medium",
  now = Date.now(),
) {
  if (!GAMES.some((game) => game.id === gameId))
    throw new Error("Неизвестная специальность.");
  if (!["easy", "medium", "hard"].includes(difficulty))
    throw new Error("Неизвестная сложность.");
  if (profile.active) {
    if (profile.active.gameId === gameId) return profile.active;
    throw new Error("Сначала продолжите или завершите активную миссию.");
  }
  const current = timeValue(now);
  const daily = dailyStatus(profile, current);
  if (daily.remaining === 0)
    throw new Error(
      "Обе попытки использованы. Новая смена начнётся в 00:00 по Алматы.",
    );
  const id =
    globalThis.crypto?.randomUUID?.() ||
    `mission-${current.toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  profile.daily = { day: daily.day, used: daily.used + 1 };
  profile.selectedRole = gameId;
  profile.active = { id, gameId, difficulty, startedAt: current, state: null };
  return profile.active;
}

export function levelInfo(xp = 0) {
  let remaining = integer(xp);
  let level = 1;
  // Each level takes 50 more XP than the previous, starting at 200 XP.
  // The quadratic inverse keeps imported large values inexpensive to handle.
  level = Math.max(
    1,
    Math.floor((-7 + Math.sqrt(49 + (4 * remaining) / 25)) / 2) + 1,
  );
  const consumed = 25 * (level - 1) * (level + 6);
  remaining = Math.max(0, remaining - consumed);
  const required = 200 + (level - 1) * 50;
  return {
    level,
    current: remaining,
    required,
    progress: clamp(remaining / required, 0, 1),
  };
}

export function gradeForScore(score) {
  return score >= 95
    ? "S"
    : score >= 85
      ? "A"
      : score >= 70
        ? "B"
        : score >= 50
          ? "C"
          : "D";
}

function achievementsFor(profile, receipt) {
  const conditions = {
    "first-shift": profile.missions >= 1,
    "perfect-shift": receipt.grade === "S",
    "master-diagnosis": profile.diagnosticMissions >= 20,
    "golden-hands":
      receipt.gameId === "surgeon" &&
      receipt.difficulty === "hard" &&
      receipt.score === 100,
    "universal-doctor": GAMES.every((game) =>
      profile.completedGames.includes(game.id),
    ),
  };
  const unlocked = ACHIEVEMENTS.filter(
    (item) => conditions[item.id] && !profile.achievements.includes(item.id),
  ).map((item) => item.id);
  profile.achievements.push(...unlocked);
  return unlocked;
}

export function completeMission(profile, result, now = Date.now()) {
  if (!result || typeof result !== "object")
    throw new TypeError("Результат миссии отсутствует.");
  const requestedId = result.sessionId || result.id;
  const previous = requestedId
    ? (profile.history || []).find(
        (receipt) => receipt.sessionId === requestedId,
      ) ||
      (profile.lastReceipt?.sessionId === requestedId
        ? profile.lastReceipt
        : null)
    : null;
  if (previous) return previous;
  if (!profile.active) {
    if (!requestedId && profile.lastReceipt) return profile.lastReceipt;
    throw new Error("Нет активной миссии для завершения.");
  }
  const active = profile.active;
  if (requestedId && requestedId !== active.id)
    throw new Error("Результат относится к другой миссии.");
  const game = GAMES.find((item) => item.id === active.gameId);
  if (!game || !Number.isFinite(result.score))
    throw new Error("Некорректный результат миссии.");
  const current = timeValue(now);
  const score = clamp(Math.round(result.score), 0, 100);
  const grade = gradeForScore(score);
  const factors = { S: 1, A: 0.85, B: 0.65, C: 0.4, D: 0.2 };
  const coins = Math.floor(game.reward * factors[grade]);
  const xp = Math.round(20 + score * 1.8);
  const previousLevel = levelInfo(profile.xp);
  const receipt = {
    sessionId: active.id,
    gameId: game.id,
    role: game.role,
    title: game.title,
    difficulty: active.difficulty,
    score,
    grade,
    coins,
    xp,
    correct: integer(result.correct),
    mistakes: integer(result.mistakes),
    elapsed: Number.isFinite(result.elapsed)
      ? integer(result.elapsed)
      : Math.max(0, Math.floor((current - active.startedAt) / 1000)),
    details: Array.isArray(result.details)
      ? result.details
          .filter((detail) => typeof detail === "string")
          .map((detail) => detail.slice(0, 500))
          .slice(0, 20)
      : [],
    startedAt: active.startedAt,
    finishedAt: current,
    previousLevel,
    level: null,
    achievements: [],
  };
  profile.xp = integer(profile.xp) + xp;
  profile.coins = integer(profile.coins) + coins;
  profile.missions = integer(profile.missions) + 1;
  profile.successful = integer(profile.successful) + (score >= 50 ? 1 : 0);
  profile.totalScore = integer(profile.totalScore) + score;
  profile.diagnosticMissions =
    integer(profile.diagnosticMissions) +
    (score >= 50 && diagnosticGames.has(game.id) ? 1 : 0);
  profile.completedGames = [
    ...new Set([
      ...(profile.completedGames || []),
      ...(score >= 50 ? [game.id] : []),
    ]),
  ];
  profile.achievements ||= [];
  receipt.level = levelInfo(profile.xp);
  receipt.achievements = achievementsFor(profile, receipt);
  profile.history = [receipt, ...(profile.history || [])].slice(
    0,
    HISTORY_LIMIT,
  );
  profile.bests ||= {};
  const best = profile.bests[game.id];
  if (
    !best ||
    score > best.score ||
    (score === best.score && receipt.elapsed < best.elapsed)
  )
    profile.bests[game.id] = receipt;
  profile.lastReceipt = receipt;
  profile.active = null;
  return receipt;
}

export function buyItem(profile, itemId) {
  const item = SHOP_ITEMS.find((entry) => entry.id === itemId);
  if (!item) throw new Error("Такого предмета нет в магазине.");
  profile.inventory ||= [];
  if (!profile.inventory.includes(itemId)) {
    if (integer(profile.coins) < item.price)
      throw new Error("Недостаточно MED COINS.");
    profile.coins -= item.price;
    profile.inventory.push(itemId);
  }
  // A purchase is immediately visible; owned items can be equipped again freely.
  equipItem(profile, itemId);
  return item;
}

export function equipItem(profile, itemId) {
  const item = [...DEFAULT_ITEMS, ...SHOP_ITEMS].find(
    (entry) => entry.id === itemId,
  );
  if (!item) throw new Error("Неизвестный предмет.");
  if (
    !DEFAULT_ITEMS.some((entry) => entry.id === itemId) &&
    !profile.inventory?.includes(itemId)
  )
    throw new Error("Сначала приобретите этот предмет.");
  profile.equipped ||= {};
  profile.equipped[item.type] = item.value;
  return item;
}
