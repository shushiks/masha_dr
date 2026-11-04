// Sound is synthesized locally. No audio files, trackers, or network requests.
export class Sound {
  enabled = false;
  context = null;
  engine = null;
  async toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      try {
        this.context ??= new (window.AudioContext || window.webkitAudioContext)();
        await this.context.resume();
        this.play('on');
      } catch { this.enabled = false; }
    } else this.stopEngine();
    return this.enabled;
  }
  play(kind) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const notes = {
      on: [440, 660], count: [440], go: [660, 880], gift: [784, 1047],
      cone: [130, 100], rep: [392, 523, 784], miss: [220, 196],
      win: [523, 659, 784, 1047], flip: [660, 880],
    }[kind] || [440];
    const now = this.context.currentTime;
    notes.forEach((frequency, index) => {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = kind === 'cone' ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, now + index * .09);
      gain.gain.linearRampToValueAtTime(.065, now + index * .09 + .012);
      gain.gain.exponentialRampToValueAtTime(.001, now + index * .09 + .22);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start(now + index * .09);
      oscillator.stop(now + index * .09 + .24);
    });
  }
  startEngine() {
    this.stopEngine();
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = 47;
    filter.type = 'lowpass';
    filter.frequency.value = 150;
    gain.gain.value = .025;
    oscillator.connect(filter).connect(gain).connect(this.context.destination);
    oscillator.start();
    this.engine = { oscillator, gain, filter };
  }
  rev(speed) {
    if (this.engine) this.engine.oscillator.frequency.setTargetAtTime(44 + speed * 28, this.context.currentTime, .15);
  }
  stopEngine() {
    if (this.engine) {
      this.engine.oscillator.stop();
      this.engine.oscillator.disconnect();
      this.engine.filter.disconnect();
      this.engine.gain.disconnect();
      this.engine = null;
    }
  }
}
