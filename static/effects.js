// One continuous rain of confetti for the whole page, including native dialogs.
// The controller owns animation, resizing, visibility, and motion preferences.
export function createConfetti(canvas) {
  const ctx = canvas.getContext('2d');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const colors = ['#d4ff43', '#c4a2ff', '#f4f3ed', '#9edfff'];
  let width = 0, height = 0, rain = [], sparks = [], raf = 0, last = 0, stopped = false;
  function particle() {
    return {
      x: Math.random() * width, y: Math.random() * height,
      vy: 38 + Math.random() * 45, phase: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI, spin: (Math.random() - .5) * 2,
      color: colors[Math.floor(Math.random() * colors.length)], size: 3 + Math.random() * 4,
    };
  }
  function resize() {
    width = window.innerWidth; height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rain = Array.from({ length: width < 760 ? 24 : 42 }, particle);
  }
  function draw(p, opacity) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation);
    ctx.globalAlpha = opacity; ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * .55);
    ctx.restore();
  }
  function frame(now) {
    raf = 0;
    if (stopped || document.hidden || motion.matches) return;
    const dt = Math.min((now - (last || now)) / 1000, .05); last = now;
    ctx.clearRect(0, 0, width, height);
    rain.forEach(p => {
      p.y += p.vy * dt; p.phase += dt;
      p.x += Math.sin(p.phase) * 12 * dt; p.rotation += p.spin * dt;
      if (p.y > height + 12) { p.y = -12; p.x = Math.random() * width; }
      draw(p, .52);
    });
    sparks = sparks.filter(p => p.life > 0);
    sparks.forEach(p => {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 280 * dt; p.rotation += p.spin * dt;
      draw(p, Math.min(.95, Math.max(0, p.life)));
    });
    raf = requestAnimationFrame(frame);
  }
  function sync() {
    cancelAnimationFrame(raf); raf = 0; last = 0;
    if (!stopped && !document.hidden && !motion.matches) raf = requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, width, height);
  }
  window.addEventListener('resize', resize, { signal: events.signal });
  document.addEventListener('visibilitychange', sync, { signal: events.signal });
  motion.addEventListener('change', sync, { signal: events.signal });
  resize(); sync();
  return {
    burst() {
      if (stopped || motion.matches || document.hidden) return;
      // Repeated taps cannot create an unbounded particle collection.
      sparks = sparks.slice(-60);
      for (let index = 0; index < 65; index++) {
        sparks.push({ ...particle(), x: width / 2, y: height * .25,
          vx: (Math.random() - .5) * 570, vy: -Math.random() * 300 - 50,
          spin: (Math.random() - .5) * 8, life: 4.5 });
      }
    },
    stop() {
      stopped = true; cancelAnimationFrame(raf); events.abort();
      ctx.clearRect(0, 0, width, height);
    },
  };
}
