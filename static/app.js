import { mountRace, mountGym } from './games.js';
import { Sound } from './sound.js';
import { giftCount } from './model.mjs';
import { createConfetti } from './effects.js';
import { REWARDS, finaleFor } from './celebrations.mjs';

const sound = new Sound();
const dialog = document.querySelector('#experience');
const content = document.querySelector('#experience-content');
const stageLabel = document.querySelector('#stage-label');
const confetti = document.querySelector('#confetti');
const party = createConfetti(confetti);
const COLORS = { lime: '#d4ff43', purple: '#c4a2ff', ice: '#9edfff' };
const STORAGE = 'masha-grand-prix-v1';
let cleanup = () => {}, toastTimer, lastOpener;
let state = { race: false, gym: false, final: false, best: 0, color: 'lime' };
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE));
  if (saved && typeof saved === 'object') {
    state = {
      race: saved.race === true, gym: saved.gym === true, final: saved.final === true,
      best: Number.isFinite(saved.best) ? Math.max(0, Math.min(100, Math.floor(saved.best))) : 0,
      color: Object.hasOwn(COLORS, saved.color) ? saved.color : 'lime',
    };
  }
} catch { /* Games also work when browser storage is unavailable. */ }
function persist() {
  try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch { /* Private mode fallback. */ }
  document.querySelectorAll('[data-status]').forEach(element => {
    const completed = state[element.dataset.status];
    element.textContent = completed ? '✓' : '↗';
    element.classList.toggle('done', completed);
    element.setAttribute('aria-label', completed ? 'Этап пройден' : 'Открыть этап');
  });
}
function setColor(name) {
  state.color = name;
  document.documentElement.style.setProperty('--car-color', COLORS[name]);
  // Remap the neutral paint into the chosen color. Preserve black details and
  // white specular highlights, which a hue rotation cannot recolor.
  ['red', 'green', 'blue'].forEach((channel, index) => {
    const tint = parseInt(COLORS[name].slice(1 + index * 2, 3 + index * 2), 16) / 255;
    const values = Array.from({ length: 17 }, (_, step) => {
      const light = step / 16;
      const strength = Math.sqrt(Math.sin(Math.PI * light));
      return (light * (1 - strength * (1 - tint))).toFixed(4);
    });
    document.querySelector(`#paint-${channel}`).setAttribute('tableValues', values.join(' '));
  });
  const label = { lime: 'Лайм', purple: 'Фиолетовый', ice: 'Ледяной' }[name];
  document.querySelector('.hero-car').alt = `Toyota Carina ED Маши — цвет кузова: ${label}`;
  document.querySelectorAll('[data-color]').forEach(button => {
    const selected = button.dataset.color === name;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  persist();
}
setColor(state.color);
function toast(message) {
  const element = document.querySelector('#toast');
  clearTimeout(toastTimer); element.textContent = message;
  element.classList.add('visible');
  toastTimer = setTimeout(() => element.classList.remove('visible'), 3200);
}
document.querySelector('#sound').addEventListener('click', async () => {
  const enabled = await sound.toggle();
  document.querySelector('#sound').setAttribute('aria-pressed', String(enabled));
  document.querySelector('#sound-label').textContent = enabled ? 'Звук вкл.' : 'Звук выкл.';
  if (!enabled && !sound.context) toast('Браузер не поддерживает звук. Поздравление работает и без него.');
});
document.querySelectorAll('[data-color]').forEach(button => button.addEventListener('click', () => {
  setColor(button.dataset.color); sound.play('flip');
}));
document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => {
  lastOpener = button;
  openStage(button.dataset.open);
}));
function focusTitle() {
  const title = content.querySelector('#experience-title');
  title?.setAttribute('tabindex', '-1');
  title?.focus({ preventScroll: true });
  dialog.scrollTop = 0;
}
function openStage(stage) {
  cleanup(); cleanup = () => {};
  if (!dialog.open) { dialog.showModal(); document.body.classList.add('modal-open'); }
  // Keep the same animation in the native dialog top layer.
  dialog.append(confetti);
  if (stage === 'race') {
    stageLabel.textContent = '01 / НАБРАТЬ СКОРОСТЬ';
    cleanup = mountRace(content, { sound, color: () => COLORS[state.color], onFinish: raceFinished });
  } else if (stage === 'gym') {
    stageLabel.textContent = '02 / ПОКАЗАТЬ ХАРАКТЕР';
    cleanup = mountGym(content, { sound, onFinish: gymFinished });
  } else {
    stageLabel.textContent = '03 / ТВОЙ ЗВЁЗДНЫЙ ЧАС';
    renderFinal();
  }
  focusTitle();
}
function raceFinished(score) {
  cleanup(); cleanup = () => {};
  state.race = true; state.best = Math.max(state.best, score); persist(); sound.play('win');
  const reward = REWARDS.race;
  stageLabel.textContent = '01 / ТВОЯ НАГРАДА ЗА ЗАЕЗД';
  content.innerHTML = `<div class="completion reward-race"><div class="completion-emblem" aria-hidden="true">${reward.icon}</div><div class="reward-badge">${reward.badge}</div><div class="result-stat">${giftCount(score)} В БАГАЖНИКЕ / РЕКОРД ${state.best}</div><h2 class="stage-title" id="experience-title">${reward.title}</h2><p class="stage-intro">${reward.message}</p><p class="reward-note">${reward.note}</p><div class="stage-actions"><button class="button primary" data-next="gym">ЗА СЛЕДУЮЩЕЙ НАГРАДОЙ →</button><button class="button ghost" data-next="final">К ОБЩЕМУ ФИНАЛУ ↗</button><button class="text-button" data-next="race">Ещё один заезд</button></div></div>`;
  party.burst(); focusTitle();
}
function gymFinished() {
  cleanup(); cleanup = () => {};
  state.gym = true; persist(); sound.play('win');
  const reward = REWARDS.gym;
  stageLabel.textContent = '02 / ТВОЯ НАГРАДА ЗА ПОДХОД';
  content.innerHTML = `<div class="completion reward-gym"><div class="completion-emblem" aria-hidden="true">${reward.icon}</div><div class="reward-badge">${reward.badge}</div><div class="result-stat">8 / 8 — ПРАЗДНИЧНЫЙ ПОДХОД ЗАКРЫТ</div><h2 class="stage-title" id="experience-title">${reward.title}</h2><p class="stage-intro">${reward.message}</p><p class="reward-note">${reward.note}</p><div class="stage-actions"><button class="button primary" data-next="${state.race ? 'final' : 'race'}">${state.race ? 'СОБРАТЬ ВСЁ ВМЕСТЕ ↗' : 'ТЕПЕРЬ ЗА ДРАЙВОМ →'}</button>${!state.race ? '<button class="button ghost" data-next="final">К ОБЩЕМУ ФИНАЛУ ↗</button>' : ''}<button class="text-button" data-next="gym">Ещё подход? Конечно.</button></div></div>`;
  party.burst(); focusTitle();
}
const wishes = [
  ['↗', 'БОЛЬШЕ ДРАЙВА', 'Пусть впереди будут дороги, от которых захватывает дух. И пусть за рулём своей жизни всегда будешь ты.'],
  ['↑', 'БОЛЬШЕ СИЛЫ', 'Новых рекордов — в зале и в жизни. Уверенности — с запасом. И сил сказать «сегодня отдыхаю», когда это нужно.'],
  ['✳', 'БОЛЬШЕ ТЕБЯ', 'Пусть будет время на свои мечты, людей по сердцу и радость без повода. Оставайся собой — это твоя суперсила.'],
];
function renderFinal() {
  state.final = true; persist();
  const finale = finaleFor(state);
  content.innerHTML = `<div class="final-stage"><div class="final-eyebrow">${finale.eyebrow}</div><h2 class="final-title" id="experience-title">С ДНЁМ РОЖДЕНИЯ,<br><span>МАШУЛИК!</span></h2><p class="final-message">${finale.message}</p><div class="reward-collection" aria-label="Твои награды"><span class="collection-item ${state.race ? 'earned' : ''}">${state.race ? '✓' : '○'} КОРОЛЕВА СВОЕЙ ПОЛОСЫ</span><span class="collection-item ${state.gym ? 'earned' : ''}">${state.gym ? '✓' : '○'} ХАРАКТЕР С ГАРАНТИЕЙ</span></div><div class="wishes">${wishes.map(([icon, title, text], index) => `<button class="wish-card" data-wish="${index}" aria-pressed="false" aria-label="Открыть пожелание: ${title}"><span class="wish-front"><span aria-hidden="true">${icon}</span><strong>${title}</strong><small>Нажми — это тебе</small></span><span class="wish-back" hidden>${text}</span></button>`).join('')}</div><p class="final-note">${finale.note}</p><div class="score-note">${state.race ? `ЛУЧШИЙ ЗАЕЗД: ${giftCount(state.best)}` : 'ТРАССА ЕЩЁ ЖДЁТ ТЕБЯ'} · ${state.gym ? 'ПОДХОД: 8 ИЗ 8' : 'ЗАЛ ЕЩЁ ЖДЁТ ТЕБЯ'}</div><div class="stage-actions"><button class="button primary" id="celebrate">ПРАЗДНИК НА МАКСИМУМ ✳</button><button class="button ghost" data-next="${finale.next}">${finale.action}</button></div></div>`;
  party.burst(); sound.play('win');
}
content.addEventListener('click', event => {
  const next = event.target.closest('[data-next]');
  if (next) { openStage(next.dataset.next); return; }
  const wish = event.target.closest('[data-wish]');
  if (wish) {
    const opened = wish.getAttribute('aria-pressed') !== 'true';
    wish.setAttribute('aria-pressed', String(opened));
    wish.setAttribute('aria-label', `${opened ? 'Скрыть' : 'Открыть'} пожелание: ${wishes[Number(wish.dataset.wish)][1]}`);
    wish.querySelector('.wish-front').hidden = opened;
    wish.querySelector('.wish-back').hidden = !opened;
    sound.play('flip'); return;
  }
  if (event.target.closest('#celebrate')) { party.burst(); sound.play('win'); }
});
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
dialog.addEventListener('close', () => {
  cleanup(); cleanup = () => {}; sound.stopEngine();
  document.body.append(confetti);
  document.body.classList.remove('modal-open');
  lastOpener?.focus({ preventScroll: true });
});
