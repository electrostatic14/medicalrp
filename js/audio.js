export class Sound {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.musicTimer = null;
    this.musicNodes = [];
    this.ambientNodes = [];
    this.ambientGain = null;
  }
  unlock() {
    try {
      if (!this.ctx)
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === "suspended") this.ctx.resume();
    } catch {}
  }
  tone(freq, duration = 0.12, type = "sine", volume = 0.12, delay = 0) {
    if (!this.ctx || !this.settings.effects) return;
    const o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    const t = this.ctx.currentTime + delay;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume * this.settings.effects, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t);
    o.stop(t + duration + 0.01);
  }
  play(name) {
    this.unlock();
    if (name === "error" || name === "lose") {
      this.tone(160, 0.2, "triangle");
      this.tone(120, 0.2, "triangle", 0.1, 0.12);
    } else if (name === "win") {
      [523, 659, 784, 1046].forEach((f, i) =>
        this.tone(f, 0.5, "sine", 0.13, i * 0.12),
      );
    } else if (name === "success") {
      this.tone(660, 0.12);
      this.tone(880, 0.16, "sine", 0.08, 0.08);
    } else if (name === "monitor") {
      this.tone(920, 0.055, "sine", 0.045);
    } else this.tone(480, 0.065, "sine", 0.06);
  }
  setSettings(settings) {
    const changed = this.settings.music !== settings.music;
    this.settings = settings;
    if (this.ambientGain)
      this.ambientGain.gain.value = 0.008 * settings.effects;
    if (changed) this.menu(this.inMenu);
  }
  ambience(enabled) {
    this.ambientNodes.forEach((o) => {
      try {
        o.stop();
      } catch {}
    });
    this.ambientNodes = [];
    this.ambientGain = null;
    if (!enabled || !this.ctx) return;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.008 * this.settings.effects;
    gain.connect(this.ctx.destination);
    this.ambientGain = gain;
    [60, 120, 180].forEach((f) => {
      const o = this.ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      o.connect(gain);
      o.start();
      this.ambientNodes.push(o);
    });
  }
  menu(enabled) {
    if (enabled === this.inMenu && this.musicTimer && this.settings.music)
      return;
    this.inMenu = enabled;
    clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.musicNodes.forEach((n) => {
      try {
        n.stop();
      } catch {}
    });
    this.musicNodes = [];
    if (!enabled || !this.settings.music || !this.ctx) return;
    let step = 0;
    const notes = [130.81, 164.81, 196, 246.94, 196, 164.81, 146.83, 196];
    const play = () => {
      if (this.ctx.state !== "running") return;
      const o = this.ctx.createOscillator(),
        g = this.ctx.createGain(),
        t = this.ctx.currentTime;
      o.type = "sine";
      o.frequency.value = notes[step++ % notes.length];
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.018, t + 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start();
      o.stop(t + 3);
    };
    play();
    this.musicTimer = setInterval(play, 1700);
  }
}
