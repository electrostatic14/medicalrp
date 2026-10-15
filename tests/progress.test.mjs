import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  ACHIEVEMENTS,
  DEFAULT_ITEMS,
  GAMES,
  SHOP_ITEMS,
} from "../js/catalog.js";
import {
  createProfile,
  loadProfile,
  normalizeProfile,
  resetProfile,
  saveProfile,
  STORAGE_KEY,
  subscribeProfile,
  updateProfile,
} from "../js/storage.js";
import {
  almatyDay,
  buyItem,
  completeMission,
  dailyStatus,
  equipItem,
  gradeForScore,
  levelInfo,
  startMission,
} from "../js/progress.js";

const eventTarget = new EventTarget();
globalThis.addEventListener = eventTarget.addEventListener.bind(eventTarget);
let values;
beforeEach(() => {
  values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  resetProfile();
});

const midnight = Date.parse("2026-10-14T19:00:00.000Z");
function finish(
  profile,
  gameId = "intern",
  score = 100,
  now = midnight,
  difficulty = "medium",
) {
  const active = startMission(profile, gameId, difficulty, now);
  return completeMission(
    profile,
    {
      sessionId: active.id,
      score,
      correct: 8,
      mistakes: 1,
      elapsed: 80,
      details: ["Тестовый игровой результат"],
    },
    now + 80000,
  );
}

test("all eight catalog entries have unique IDs, real rewards, and complete onboarding metadata", () => {
  assert.equal(GAMES.length, 8);
  assert.equal(new Set(GAMES.map((game) => game.id)).size, 8);
  assert.deepEqual(
    GAMES.map((game) => game.reward),
    [100, 130, 170, 180, 150, 190, 220, 300],
  );
  assert.ok(
    GAMES.every(
      (game) => game.tutorial.length >= 3 && game.role && game.orientation,
    ),
  );
  assert.equal(ACHIEVEMENTS.length, 5);
});

test("global daily limit spends on launch and blocks a third launch across different games", () => {
  const profile = createProfile();
  finish(profile, "intern");
  finish(profile, "surgeon");
  assert.equal(dailyStatus(profile, midnight).used, 2);
  assert.equal(dailyStatus(profile, midnight).remaining, 0);
  assert.throws(
    () => startMission(profile, "feldsher", "easy", midnight),
    /Обе попытки/,
  );
  assert.equal(profile.missions, 2);
});

test("a resumed saved session never consumes another attempt or changes its difficulty", () => {
  const profile = createProfile();
  const active = startMission(profile, "feldsher", "hard", midnight);
  active.state = { phase: 3, stability: 72, elapsed: 123 };
  saveProfile(profile);
  const restored = loadProfile();
  const resumed = startMission(restored, "feldsher", "easy", midnight + 50000);
  assert.equal(resumed.id, active.id);
  assert.equal(resumed.difficulty, "hard");
  assert.deepEqual(resumed.state, active.state);
  assert.equal(restored.daily.used, 1);
  assert.throws(
    () => startMission(restored, "surgeon", "medium", midnight),
    /активную миссию/,
  );
});

test("the reset boundary is exactly 00:00 Asia/Almaty, independent of the machine timezone", () => {
  const profile = createProfile();
  profile.daily = { day: "2026-10-14", used: 2 };
  const before = dailyStatus(profile, midnight - 1);
  assert.equal(before.day, "2026-10-14");
  assert.equal(before.remaining, 0);
  assert.equal(before.resetAt, midnight);
  assert.equal(before.secondsUntilReset, 1);
  const after = dailyStatus(profile, midnight);
  assert.equal(after.day, "2026-10-15");
  assert.equal(after.remaining, 2);
  assert.equal(after.resetAt, midnight + 86400000);
  assert.equal(after.secondsUntilReset, 86400);
  assert.equal(almatyDay(new Date(midnight)), "2026-10-15");
});

test("a session spanning midnight resumes freely, then two fresh attempts are available", () => {
  const profile = createProfile();
  const session = startMission(profile, "intern", "medium", midnight - 10000);
  assert.equal(
    startMission(profile, "intern", "hard", midnight + 10000).id,
    session.id,
  );
  assert.equal(dailyStatus(profile, midnight).remaining, 2);
  completeMission(
    profile,
    { sessionId: session.id, score: 75 },
    midnight + 20000,
  );
  finish(profile, "therapist", 80, midnight + 30000);
  finish(profile, "narcologist", 80, midnight + 60000);
  assert.equal(dailyStatus(profile, midnight + 90000).remaining, 0);
});

test("invalid launches do not consume attempts", () => {
  const profile = createProfile();
  assert.throws(() => startMission(profile, "unknown", "easy", midnight));
  assert.throws(() => startMission(profile, "intern", "impossible", midnight));
  assert.throws(() => startMission(profile, "intern", "easy", NaN));
  assert.equal(profile.active, null);
  assert.equal(dailyStatus(profile, midnight).remaining, 2);
});

test("grades use specified thresholds and every reward stays within the specialty cap", () => {
  const cases = [
    [100, "S", 1],
    [95, "S", 1],
    [94, "A", 0.85],
    [85, "A", 0.85],
    [84, "B", 0.65],
    [70, "B", 0.65],
    [69, "C", 0.4],
    [50, "C", 0.4],
    [49, "D", 0.2],
    [0, "D", 0.2],
  ];
  for (const game of GAMES)
    for (const [score, grade, factor] of cases) {
      const profile = createProfile();
      const receipt = finish(profile, game.id, score);
      assert.equal(gradeForScore(score), grade);
      assert.equal(receipt.grade, grade);
      assert.equal(receipt.coins, Math.floor(game.reward * factor));
      assert.equal(profile.coins, receipt.coins);
      assert.ok(receipt.coins <= game.reward);
      assert.equal(profile.successful, score >= 50 ? 1 : 0);
    }
});

test("completion is idempotent before and after persistence, including while a new mission is active", () => {
  const profile = createProfile();
  const receipt = finish(profile);
  const balance = profile.coins;
  assert.equal(
    completeMission(profile, { sessionId: receipt.sessionId, score: 0 }),
    receipt,
  );
  assert.equal(completeMission(profile, { score: 0 }), receipt);
  saveProfile(profile);
  const restored = loadProfile();
  startMission(restored, "surgeon", "hard", midnight);
  const newId = restored.active.id;
  assert.equal(
    completeMission(restored, { sessionId: receipt.sessionId, score: 0 })
      .sessionId,
    receipt.sessionId,
  );
  assert.equal(restored.active.id, newId);
  assert.equal(restored.coins, balance);
  assert.equal(restored.missions, 1);
  assert.throws(
    () => completeMission(restored, { sessionId: "wrong-id", score: 100 }),
    /другой миссии/,
  );
});

test("invalid results never grant rewards or destroy the active session", () => {
  const profile = createProfile();
  const active = startMission(profile, "intern", "easy", midnight);
  assert.throws(() => completeMission(profile, { score: NaN }));
  assert.throws(() => completeMission(profile, null));
  assert.equal(profile.active.id, active.id);
  assert.equal(profile.coins, 0);
  assert.equal(profile.missions, 0);
  const receipt = completeMission(
    profile,
    { score: 10000, elapsed: -1, correct: -5, mistakes: Infinity },
    midnight,
  );
  assert.equal(receipt.score, 100);
  assert.equal(receipt.coins, 100);
  assert.equal(receipt.correct, 0);
  assert.equal(receipt.elapsed, 0);
});

test("XP crosses increasingly sized levels at exact boundaries", () => {
  assert.deepEqual(levelInfo(0), {
    level: 1,
    current: 0,
    required: 200,
    progress: 0,
  });
  assert.equal(levelInfo(199).level, 1);
  assert.deepEqual(levelInfo(200), {
    level: 2,
    current: 0,
    required: 250,
    progress: 0,
  });
  assert.equal(levelInfo(449).current, 249);
  assert.equal(levelInfo(450).level, 3);
  assert.equal(levelInfo(-100).level, 1);
  assert.equal(levelInfo(NaN).current, 0);
});

test("records retain the highest score and use fastest elapsed as the tie breaker", () => {
  const profile = createProfile();
  let day = midnight;
  function result(score, elapsed) {
    const session = startMission(profile, "intern", "easy", day);
    day += 86400000;
    return completeMission(
      profile,
      { sessionId: session.id, score, elapsed },
      day - 1,
    );
  }
  const first = result(90, 80);
  result(80, 40);
  assert.equal(profile.bests.intern.sessionId, first.sessionId);
  const faster = result(90, 60);
  assert.equal(profile.bests.intern.sessionId, faster.sessionId);
  assert.equal(profile.totalScore, 260);
  assert.equal(profile.missions, 3);
});

test("achievements unlock once and cumulative counters survive history truncation", () => {
  const profile = createProfile();
  let day = midnight;
  const first = finish(profile, "intern", 100, day);
  assert.deepEqual(first.achievements, ["first-shift", "perfect-shift"]);
  for (const game of GAMES.slice(1)) {
    day += 86400000;
    finish(profile, game.id, 100, day, "hard");
  }
  assert.ok(profile.achievements.includes("golden-hands"));
  assert.ok(profile.achievements.includes("universal-doctor"));
  for (let i = 0; i < 120; i++) {
    day += 86400000;
    finish(profile, "therapist", 80, day);
  }
  assert.ok(profile.achievements.includes("master-diagnosis"));
  assert.equal(new Set(profile.achievements).size, 5);
  assert.equal(profile.history.length, 100);
  assert.equal(profile.missions, 128);
  assert.equal(profile.diagnosticMissions, 122);
  assert.equal(profile.completedGames.length, 8);
  assert.equal(profile.bests.intern.sessionId, first.sessionId);
});

test("failed or abandoned shifts do not count as passed specialties for Universal Physician", () => {
  const profile = createProfile();
  let day = midnight;
  for (const game of GAMES) {
    finish(profile, game.id, 0, day);
    day += 86400000;
  }
  assert.equal(profile.missions, 8);
  assert.equal(profile.successful, 0);
  assert.deepEqual(profile.completedGames, []);
  assert.ok(!profile.achievements.includes("universal-doctor"));
  for (const game of GAMES) {
    finish(profile, game.id, 50, day);
    day += 86400000;
  }
  assert.equal(profile.completedGames.length, 8);
  assert.ok(profile.achievements.includes("universal-doctor"));
});

test("every cosmetic can be bought, visibly equipped, restored, and reset to its default", () => {
  const profile = createProfile();
  profile.coins = 10000;
  startMission(profile, "intern", "easy", midnight);
  const beforeDaily = { ...profile.daily };
  for (const item of SHOP_ITEMS) {
    const before = profile.coins;
    assert.equal(buyItem(profile, item.id).id, item.id);
    assert.equal(profile.coins, before - item.price);
    assert.equal(profile.equipped[item.type], item.value);
    assert.ok(profile.inventory.includes(item.id));
    buyItem(profile, item.id);
    assert.equal(
      profile.coins,
      before - item.price,
      "repeat purchase cannot charge twice",
    );
  }
  saveProfile(profile);
  assert.deepEqual(loadProfile().equipped, profile.equipped);
  assert.deepEqual(
    profile.daily,
    beforeDaily,
    "cosmetics cannot buy extra attempts",
  );
  for (const item of DEFAULT_ITEMS) {
    equipItem(profile, item.id);
    assert.equal(profile.equipped[item.type], item.value);
  }
});

test("insufficient funds and unowned cosmetics cannot mutate progress", () => {
  const profile = createProfile();
  assert.throws(() => buyItem(profile, SHOP_ITEMS[0].id), /Недостаточно/);
  assert.throws(() => equipItem(profile, SHOP_ITEMS[0].id), /приобретите/);
  assert.throws(() => buyItem(profile, "extra-attempt"));
  assert.throws(() => equipItem(profile, "unknown"));
  assert.equal(profile.coins, 0);
  assert.deepEqual(profile.inventory, []);
});

test("profiles preserve all progress through serialization and isolate returned references", () => {
  const profile = createProfile();
  finish(profile, "surgeon", 100, midnight, "hard");
  profile.name = "Доктор Ольга";
  profile.settings = { quality: "high", effects: 0.7, music: true };
  saveProfile(profile);
  assert.deepEqual(loadProfile(), profile);
  const loaded = loadProfile();
  loaded.coins = 999999;
  loaded.history[0].score = 0;
  assert.equal(loadProfile().coins, 300);
  assert.equal(loadProfile().history[0].score, 100);
});

test("malformed storage and unsafe field types recover to a valid usable profile", () => {
  values.set(STORAGE_KEY, "{broken json");
  const recovered = loadProfile();
  assert.equal(recovered.version, 1);
  assert.equal(recovered.coins, 0);
  const invalid = normalizeProfile({
    coins: -2,
    xp: Infinity,
    missions: 3,
    successful: 10,
    settings: { quality: "ultra", effects: 20, music: "true" },
    selectedRole: "__proto__",
    daily: { day: "bad", used: 90 },
    equipped: { frame: "gold", title: "<script>" },
    inventory: ["unknown"],
    active: { id: "bad", gameId: "intern", difficulty: "god" },
    history: [null, {}, { gameId: "intern", score: 100 }],
  });
  assert.equal(invalid.coins, 0);
  assert.equal(invalid.xp, 0);
  assert.equal(invalid.successful, 3);
  assert.equal(invalid.daily.used, 2);
  assert.equal(invalid.settings.effects, 1);
  assert.equal(invalid.settings.music, false);
  assert.equal(invalid.equipped.frame, "default");
  assert.equal(invalid.active, null);
  assert.deepEqual(invalid.history, []);
});

test("a denied or full localStorage retains new progress in the current tab", () => {
  const profile = createProfile();
  profile.coins = 100;
  saveProfile(profile);
  globalThis.localStorage.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  profile.coins = 150;
  assert.equal(saveProfile(profile), false);
  assert.equal(loadProfile().coins, 150);
  globalThis.localStorage.getItem = () => {
    throw new Error("SecurityError");
  };
  profile.coins = 200;
  assert.equal(saveProfile(profile), false);
  assert.equal(loadProfile().coins, 200);
});

test("local mutations notify subscribers and unsubscribe releases them", () => {
  const updates = [];
  const unsubscribe = subscribeProfile((profile) =>
    updates.push(profile.coins),
  );
  const updated = updateProfile((profile) => {
    profile.coins = 50;
  });
  assert.equal(updated.coins, 50);
  assert.deepEqual(updates, [50]);
  unsubscribe();
  updateProfile((profile) => {
    profile.coins = 70;
  });
  assert.deepEqual(updates, [50]);
});

test("other tabs refresh their profile through the storage event", () => {
  const profile = createProfile();
  profile.coins = 325;
  values.set(STORAGE_KEY, JSON.stringify(profile));
  const event = new Event("storage");
  Object.defineProperty(event, "key", { value: STORAGE_KEY });
  eventTarget.dispatchEvent(event);
  assert.equal(loadProfile().coins, 325);
  values.clear();
  const clearEvent = new Event("storage");
  Object.defineProperty(clearEvent, "key", { value: null });
  eventTarget.dispatchEvent(clearEvent);
  assert.equal(loadProfile().coins, 0);
});

test("explicit reset returns a clean profile and removes purchased appearance and active sessions", () => {
  const profile = createProfile();
  profile.coins = 1000;
  buyItem(profile, "frame-gold");
  startMission(profile, "surgeon", "hard", midnight);
  saveProfile(profile);
  const fresh = resetProfile();
  assert.deepEqual(fresh, createProfile());
  assert.deepEqual(loadProfile(), fresh);
});
