import { RACE_SECONDS, REPS, LANES, clampLane, overlapsCar, timingPosition, isGoodRep, raceScore } from './model.mjs';

export function mountRace(root, { sound, color, onFinish }) {
  root.innerHTML = `
    <h2 class="stage-title" id="experience-title">Твоя полоса. Твой разгон.</h2>
    <p class="stage-intro">Твоя Carina ED. 30 секунд чистого драйва. Лови <strong>подарки</strong>, обходи конусы.<br>Конус забирает один подарок, но остановить тебя не сможет.</p>
    <div class="game-toolbar"><span>ВРЕМЯ <strong id="race-time">30</strong></span><span>ПОДАРКИ <strong id="race-score">0</strong></span><button class="icon-button" id="race-pause" disabled>Пауза Ⅱ</button></div>
    <div class="race-wrap"><canvas class="race-canvas" id="race" width="760" height="380" role="img" aria-label="Игровая трасса с тремя полосами. Подарки зелёные, конусы оранжевые. Управление стрелками или кнопками под трассой."></canvas><div class="game-overlay" id="race-overlay"><strong>ГОТОВА ЗАЖЕЧЬ?</strong><p>Меняй полосу кнопками ← → или касанием нужной стороны трассы.</p><button class="button primary" id="race-start">ПОЕХАЛИ ↗</button></div></div>
    <div class="race-controls"><p><span class="keyboard-key">←</span> <span class="keyboard-key">→</span> или A / D<br>На телефоне — кнопки и свайпы</p><div class="steer-group"><button class="steer-button" id="steer-left" aria-label="Полоса левее">←</button><button class="steer-button" id="steer-right" aria-label="Полоса правее">→</button></div></div>
    <div class="legend"><span class="gift">✦ Подарок: +1</span><span class="cone">▲ Конус: −1</span><span>Финиш — при любом результате</span></div>
    <div class="game-feedback" id="race-feedback" role="status">Сегодня дорога подстраивается под тебя.</div>
    <div class="stage-actions"><button class="text-button" data-next="gym">Сразу в зал →</button><button class="text-button" data-next="final">К поздравлению ↗</button></div>`;
  const canvas = root.querySelector('#race');
  const ctx = canvas.getContext('2d');
  const timeEl = root.querySelector('#race-time');
  const scoreEl = root.querySelector('#race-score');
  const overlay = root.querySelector('#race-overlay');
  const pauseButton = root.querySelector('#race-pause');
  const feedback = root.querySelector('#race-feedback');
  const events = new AbortController();
  const signal = events.signal;
  let lane = 1, carX = LANES[lane], elapsed = 0, score = 0, items = [], spawn = 0;
  let status = 'ready', raf = 0, last = 0, roadOffset = 0, countdown = 3, flash = 0;
  let countdownTime = 0, disposed = false;
  function steer(direction) {
    if (status !== 'running') return;
    lane = clampLane(lane + direction);
    sound.rev(.6 + lane * .1);
  }
  root.querySelector('#steer-left').addEventListener('click', () => steer(-1), { signal });
  root.querySelector('#steer-right').addEventListener('click', () => steer(1), { signal });
  let touchStart = null;
  canvas.addEventListener('pointerdown', e => { touchStart = { x: e.clientX, y: e.clientY }; }, { signal });
  canvas.addEventListener('pointerup', e => {
    if (!touchStart) return;
    const delta = e.clientX - touchStart.x;
    const rect = canvas.getBoundingClientRect();
    if (Math.abs(delta) > 18) steer(Math.sign(delta));
    else if (Math.abs(e.clientY - touchStart.y) < 25) steer(e.clientX < rect.left + rect.width / 2 ? -1 : 1);
    touchStart = null;
  }, { signal });
  canvas.addEventListener('pointercancel', () => { touchStart = null; }, { signal });
  document.addEventListener('keydown', e => {
    if (['ArrowLeft', 'a', 'A', 'ф', 'Ф'].includes(e.key)) { e.preventDefault(); steer(-1); }
    if (['ArrowRight', 'd', 'D', 'в', 'В'].includes(e.key)) { e.preventDefault(); steer(1); }
    if (e.code === 'Space' && e.target === canvas) { e.preventDefault(); togglePause(); }
  }, { signal });
  root.querySelector('#race-start').addEventListener('click', () => {
    status = 'countdown';
    overlay.innerHTML = '<strong class="countdown">3</strong><p>Двигатель характера запущен.</p>';
    sound.play('count');
  }, { signal });
  function togglePause() {
    if (!['running', 'paused'].includes(status)) return;
    if (status === 'running') {
      status = 'paused'; sound.stopEngine();
      overlay.hidden = false;
      overlay.innerHTML = '<strong>ПИТ-СТОП</strong><p>Даже у чемпионки есть время на паузу.</p><button class="button primary" id="race-resume">ПРОДОЛЖИТЬ →</button>';
      overlay.querySelector('button').addEventListener('click', togglePause, { signal });
      pauseButton.textContent = 'Продолжить ▶';
    } else {
      status = 'running'; overlay.hidden = true;
      sound.startEngine(); pauseButton.textContent = 'Пауза Ⅱ';
    }
  }
  pauseButton.addEventListener('click', togglePause, { signal });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && status === 'running') togglePause();
  }, { signal });
  function draw() {
    ctx.fillStyle = '#10180f'; ctx.fillRect(0, 0, 760, 380);
    // Trackside grid and lighting are deliberately restrained for contrast.
    ctx.strokeStyle = '#25341d'; ctx.lineWidth = 1;
    for (let x = 20; x < 760; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 380); ctx.stroke(); }
    for (let y = roadOffset % 40; y < 380; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(760, y); ctx.stroke(); }
    ctx.fillStyle = '#1e2820'; ctx.fillRect(200, 0, 360, 380);
    ctx.fillStyle = '#394a31'; ctx.fillRect(195, 0, 5, 380); ctx.fillRect(560, 0, 5, 380);
    ctx.strokeStyle = '#6c7c5455'; ctx.lineWidth = 2; ctx.setLineDash([24, 28]); ctx.lineDashOffset = -roadOffset;
    [320, 440].forEach(x => { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 380); ctx.stroke(); }); ctx.setLineDash([]);
    ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#7e9566'; ctx.textAlign = 'center';
    ctx.save(); ctx.translate(125, 260); ctx.rotate(-Math.PI / 2); ctx.fillText('NO LIMITS / JUST MASHA', 0, 0); ctx.restore();
    ctx.save(); ctx.translate(638, 190); ctx.rotate(Math.PI / 2); ctx.fillText('BIRTHDAY GRAND PRIX', 0, 0); ctx.restore();
    items.forEach(item => {
      const x = LANES[item.lane], y = item.y;
      if (item.type === 'gift') {
        ctx.fillStyle = '#d4ff43'; ctx.fillRect(x - 14, y - 12, 28, 25);
        ctx.fillStyle = '#10180f'; ctx.fillRect(x - 2, y - 12, 4, 25); ctx.fillRect(x - 14, y - 5, 28, 4);
        ctx.strokeStyle = '#d4ff43'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(x - 5, y - 17, 6, 4, .6, 0, Math.PI * 2); ctx.ellipse(x + 5, y - 17, 6, 4, -.6, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.fillStyle = '#f79b62'; ctx.beginPath(); ctx.moveTo(x, y - 21); ctx.lineTo(x + 15, y + 13); ctx.lineTo(x - 15, y + 13); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffe4bf'; ctx.fillRect(x - 7, y - 3, 14, 5);
        ctx.fillStyle = '#b56637'; ctx.fillRect(x - 19, y + 13, 38, 5);
      }
    });
    ctx.save(); ctx.translate(carX, 305);
    ctx.shadowColor = color(); ctx.shadowBlur = 17;
    ctx.fillStyle = '#e4e6df'; ctx.beginPath(); ctx.roundRect(-21, -40, 42, 80, 6); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#111e16'; ctx.beginPath(); ctx.roundRect(-16, -19, 32, 38, 4); ctx.fill();
    ctx.fillStyle = '#65766a'; ctx.fillRect(-14, -16, 28, 9);
    ctx.strokeStyle = '#879087'; ctx.lineWidth = 1; ctx.strokeRect(-15, -33, 30, 11);
    ctx.fillStyle = '#dbeacb'; ctx.fillRect(-16, -32, 10, 4); ctx.fillRect(6, -32, 10, 4);
    ctx.fillStyle = '#ea684e'; ctx.fillRect(-15, 29, 8, 3); ctx.fillRect(7, 29, 8, 3);
    ctx.fillStyle = '#121a12'; ctx.fillRect(-25, -23, 6, 15); ctx.fillRect(19, -23, 6, 15); ctx.fillRect(-25, 16, 6, 15); ctx.fillRect(19, 16, 6, 15);
    ctx.fillStyle = '#384139'; ctx.fillRect(-24, 30, 48, 4);
    ctx.fillStyle = color(); ctx.fillRect(-17, 37, 34, 2); ctx.restore();
    if (flash > 0) { ctx.fillStyle = `rgba(255,130,70,${flash * .2})`; ctx.fillRect(0, 0, 760, 380); }
  }
  function frame(now) {
    if (disposed) return;
    const dt = Math.min((now - (last || now)) / 1000, .05); last = now;
    if (!document.hidden && status === 'countdown') {
      countdownTime += dt;
      if (countdownTime >= 1) {
        countdownTime = 0; countdown--;
        if (countdown > 0) { overlay.querySelector('strong').textContent = countdown; sound.play('count'); }
        else { status = 'running'; overlay.hidden = true; pauseButton.disabled = false; sound.play('go'); sound.startEngine(); }
      }
    }
    if (status === 'running') {
      elapsed += dt; roadOffset += dt * 210; spawn += dt; flash = Math.max(0, flash - dt * 3);
      carX += (LANES[lane] - carX) * Math.min(1, dt * 18);
      if (spawn > .65) {
        spawn = 0; items.push({ lane: Math.floor(Math.random() * 3), y: -30, type: Math.random() < .7 ? 'gift' : 'cone' });
      }
      items.forEach(item => {
        item.y += dt * (175 + elapsed * 2);
        if (!item.hit && overlapsCar(item, lane)) {
          item.hit = true; score = raceScore(score, item.type); scoreEl.textContent = score;
          sound.play(item.type);
          if (item.type === 'cone') { flash = 1; feedback.textContent = 'Конус? Просто лежачее недоразумение. Дальше!'; }
          else feedback.textContent = ['+1 повод улыбнуться!', 'Подарок в багажнике. Жми дальше!', 'Вот это траектория!'][score % 3];
        }
      });
      items = items.filter(item => !item.hit && item.y < 430);
      timeEl.textContent = Math.max(0, Math.ceil(RACE_SECONDS - elapsed));
      if (elapsed >= RACE_SECONDS) { status = 'finished'; sound.stopEngine(); onFinish(score); return; }
    }
    draw(); raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return () => { disposed = true; cancelAnimationFrame(raf); events.abort(); sound.stopEngine(); };
}

export function mountGym(root, { sound, onFinish }) {
  root.innerHTML = `
    <div class="gym-stage"><h2 class="stage-title" id="experience-title">Характер тяжелее штанги.</h2><p class="stage-intro">Поймай белую метку в зелёной зоне и нажми <strong>«ЖМИ!»</strong>.<br>8 повторений — и новый праздничный рекорд твой.</p>
    <div class="gym-display"><svg class="barbell" viewBox="0 0 400 130" role="img" aria-label="Праздничная штанга"><defs><linearGradient id="bar-chrome" x2="0" y2="1"><stop stop-color="#e2e8d8"/><stop offset=".5" stop-color="#65735b"/><stop offset="1" stop-color="#b7c6a7"/></linearGradient></defs><rect x="25" y="58" width="350" height="15" rx="5" fill="url(#bar-chrome)"/><g fill="#293520" stroke="#819a5c" stroke-width="2"><rect x="58" y="27" width="20" height="77" rx="5"/><rect x="322" y="27" width="20" height="77" rx="5"/><rect x="80" y="13" width="27" height="105" rx="5"/><rect x="293" y="13" width="27" height="105" rx="5"/></g><g fill="#d4ff43"><rect x="110" y="9" width="13" height="113" rx="3"/><rect x="277" y="9" width="13" height="113" rx="3"/></g><text x="200" y="48" text-anchor="middle" fill="#9dbb79" font-family="monospace" font-size="10">BIRTHDAY PR</text></svg>
    <div class="gym-counter"><span id="rep-count">0</span> / 8</div><div class="rep-dots" aria-label="Прогресс подхода">${'<i></i>'.repeat(REPS)}</div><div class="timing-track" aria-label="Индикатор ритма"><span class="timing-zone"></span><span class="timing-marker" id="gym-marker"></span></div><p class="gym-hint" id="gym-hint">Белая метка в зелёном = идеальный момент</p></div>
    <button class="button primary" id="gym-lift">ЖМИ! ↑</button><label class="gym-mode"><input type="checkbox" id="gym-easy"> Спокойный режим — без тайминга</label>
    <div class="game-feedback" id="gym-feedback" role="status">Готова? Здесь разминается только палец.</div><div class="stage-actions"><button class="text-button" data-next="race">← На трассу</button><button class="text-button" data-next="final">Сразу к поздравлению ↗</button></div></div>`;
  const events = new AbortController(), signal = events.signal;
  const marker = root.querySelector('#gym-marker');
  const count = root.querySelector('#rep-count');
  const feedback = root.querySelector('#gym-feedback');
  const easy = root.querySelector('#gym-easy');
  const barbell = root.querySelector('.barbell');
  const track = root.querySelector('.timing-track');
  const liftButton = root.querySelector('#gym-lift');
  let reps = 0, elapsed = 0, position = 0, last = 0, raf = 0, cooldown = 0, disposed = false, finishTimer = 0;
  easy.addEventListener('change', () => {
    track.hidden = easy.checked;
    root.querySelector('#gym-hint').textContent = easy.checked ? 'Твой темп. Каждое нажатие — одно повторение.' : 'Белая метка в зелёном = идеальный момент';
    feedback.textContent = easy.checked ? 'Без спешки. Сила любит свой темп.' : 'Ловим ритм. Поехали!';
  }, { signal });
  function lift() {
    if (reps >= REPS || performance.now() < cooldown) return;
    cooldown = performance.now() + 330;
    if (easy.checked || isGoodRep(position)) {
      reps++; count.textContent = reps;
      root.querySelectorAll('.rep-dots i')[reps - 1].classList.add('filled');
      barbell.classList.add('lift'); sound.play('rep');
      feedback.textContent = ['Есть контакт! Праздничный вес взят.', 'Сильная — это про тебя.', 'Гравитация сегодня на твоей стороне.', 'Половина! Характер никуда не делся.', 'Вот это жим мавирр!', 'Ещё два. Ты машина!', 'Последний. Добавь характера!', '8 из 8. Рекорд — быть собой.'][reps - 1];
      if (reps === REPS) {
        liftButton.disabled = true;
        finishTimer = window.setTimeout(() => { if (!disposed) onFinish(REPS); }, 850);
      }
    } else {
      feedback.textContent = 'Чуть мимо ритма — ничего! Попробуй ещё или включи спокойный режим.';
      sound.play('miss');
    }
  }
  liftButton.addEventListener('click', lift, { signal });
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') { e.preventDefault(); lift(); }
  }, { signal });
  function frame(now) {
    if (disposed) return;
    const dt = Math.min((now - (last || now)) / 1000, .05); last = now;
    if (!document.hidden) elapsed += dt;
    position = timingPosition(elapsed); marker.style.left = `${position * 100}%`;
    if (performance.now() > cooldown - 100) barbell.classList.remove('lift');
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return () => { disposed = true; cancelAnimationFrame(raf); clearTimeout(finishTimer); events.abort(); };
}
