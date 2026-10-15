export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const choose = (a) => a[Math.floor(Math.random() * a.length)];
export const shuffle = (a) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};
export const escapeHTML = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const difficultyValue = (d, e, m, h) =>
  ({ easy: e, medium: m, hard: h })[d] ?? m;
export const formatTime = (s) => {
  s = Math.max(0, Math.ceil(s));
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
};

export class GameSession {
  constructor(ctx, { title, subtitle = "", duration = 360, state = {} }) {
    this.ctx = ctx;
    ctx.registerSave?.(() => this.save());
    this.state = ctx.state ?? state;
    this.duration = duration;
    this._elapsed = Number(this.state._kit?.elapsed) || 0;
    this.correct = Number(this.state._kit?.correct) || 0;
    this.mistakes = Number(this.state._kit?.mistakes) || 0;
    this.paused = false;
    this.ended = false;
    this.intervals = [];
    this.listeners = [];
    this.ctx.root.innerHTML = `<div class="game-shell"><div class="game-hud"><div><span class="g-label">${escapeHTML(subtitle)}</span><h2>${escapeHTML(title)}</h2></div><div class="game-clock" aria-label="Оставшееся время">${formatTime(this.remaining)}</div><div class="game-metric"><span>Точность</span><strong>100%</strong></div></div><div class="game-objective" aria-live="polite"></div><div class="game-progress"><i></i></div><div class="game-scene"></div><div class="game-hint"></div><div class="game-controls"></div><div class="game-feedback" role="status"></div></div>`;
    this.scene = ctx.root.querySelector(".game-scene");
    this.controls = ctx.root.querySelector(".game-controls");
    this.hint = ctx.root.querySelector(".game-hint");
    this._last = performance.now();
    this._lastSave = 0;
    this.every(250, () => {
      const now = performance.now();
      const dt = (now - this._last) / 1000;
      this._last = now;
      if (this.paused || this.ended) return;
      this._elapsed += dt;
      ctx.root.querySelector(".game-clock").textContent = formatTime(
        this.remaining,
      );
      ctx.root
        .querySelector(".game-clock")
        .classList.toggle("urgent", this.remaining < 30);
      if (this._elapsed - this._lastSave > 4) {
        this._lastSave = this._elapsed;
        this.save();
      }
      if (this.remaining <= 0) {
        if (this.onTimeout) this.onTimeout();
        else
          this.finish(Math.min(45, this.correct * 5), ["Время смены истекло."]);
      }
    });
    this.listen(document, "visibilitychange", () => {
      if (document.hidden) this.save();
    });
  }
  get elapsed() {
    return this._elapsed;
  }
  get remaining() {
    return Math.max(0, this.duration - this.elapsed);
  }
  setObjective(text) {
    this.ctx.root.querySelector(".game-objective").textContent = text;
  }
  setMetric(label, value) {
    const el = this.ctx.root.querySelector(".game-metric");
    el.querySelector("span").textContent = label;
    el.querySelector("strong").textContent = value;
  }
  setProgress(value) {
    this.ctx.root.querySelector(".game-progress i").style.width =
      `${clamp(value, 0, 1) * 100}%`;
  }
  feedback(text, good = true) {
    if (this.ended) return;
    const el = this.ctx.root.querySelector(".game-feedback");
    el.textContent = text;
    el.className = `game-feedback visible ${good ? "good" : "bad"}`;
    this.ctx.audio?.play(good ? "success" : "error");
    clearTimeout(this.feedbackTimeout);
    this.feedbackTimeout = setTimeout(
      () => el.classList.remove("visible"),
      3200,
    );
  }
  hit(points = 1) {
    this.correct += points;
    this.save();
  }
  miss(text = "Попробуйте ещё раз") {
    this.mistakes++;
    this.feedback(text, false);
    this.save();
  }
  save() {
    if (this.ended) return;
    this.state._kit = {
      elapsed: this.elapsed,
      correct: this.correct,
      mistakes: this.mistakes,
    };
    this.ctx.save(this.state);
  }
  finish(score, details = []) {
    if (this.ended) return;
    this.save();
    this.ended = true;
    this.ctx.finish({
      score: Math.round(clamp(score, 0, 100)),
      correct: this.correct,
      mistakes: this.mistakes,
      elapsed: Math.round(this.elapsed),
      details,
    });
  }
  every(ms, fn) {
    const id = setInterval(fn, ms);
    this.intervals.push(id);
    return id;
  }
  listen(el, type, fn, options) {
    el.addEventListener(type, fn, options);
    this.listeners.push(() => el.removeEventListener(type, fn, options));
    return fn;
  }
  button(label, callback, className = "") {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `g-btn ${className}`;
    b.textContent = label;
    b.addEventListener("click", callback);
    return b;
  }
  destroy() {
    this.save();
    this.intervals.forEach(clearInterval);
    this.listeners.forEach((fn) => fn());
    clearTimeout(this.feedbackTimeout);
    this.ctx.root.replaceChildren();
  }
}
