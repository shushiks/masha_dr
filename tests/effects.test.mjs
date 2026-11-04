import test from 'node:test';
import assert from 'node:assert/strict';
import { createConfetti } from '../static/effects.js';

function browserFixture(t, reducedMotion = false) {
  const original = {};
  for (const key of ['window', 'document', 'requestAnimationFrame', 'cancelAnimationFrame']) original[key] = globalThis[key];
  const viewport = new EventTarget(), document = new EventTarget(), motion = new EventTarget();
  Object.assign(viewport, { innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1, matchMedia: () => motion });
  document.hidden = false; motion.matches = reducedMotion;
  let draws = 0, now = 0, id = 0;
  const pending = new Map();
  const context = { setTransform() {}, clearRect() {}, save() {}, translate() {}, rotate() {}, restore() {}, fillRect() { draws++; } };
  Object.assign(globalThis, { window: viewport, document,
    requestAnimationFrame: callback => { pending.set(++id, callback); return id; },
    cancelAnimationFrame: key => pending.delete(key) });
  const party = createConfetti({ getContext: () => context });
  t.after(() => { party.stop(); for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
  } });
  return { party, document, motion, pending, get draws() { return draws; },
    step() { now += 1000 / 60; const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => callback(now)); } };
}

test('confetti continues beyond the former five-second cutoff', t => {
  const browser = browserFixture(t);
  for (let frame = 0; frame < 600; frame++) browser.step();
  const before = browser.draws;
  browser.step();
  assert.ok(browser.draws > before, 'rain must still be drawn after ten seconds');
  assert.equal(browser.pending.size, 1, 'exactly one animation loop');
});

test('confetti pauses in a hidden tab and resumes with one loop', t => {
  const browser = browserFixture(t);
  browser.step();
  browser.document.hidden = true;
  browser.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(browser.pending.size, 0);
  const before = browser.draws;
  browser.step(); assert.equal(browser.draws, before);
  browser.document.hidden = false;
  browser.document.dispatchEvent(new Event('visibilitychange'));
  browser.step(); assert.ok(browser.draws > before);
  assert.equal(browser.pending.size, 1);
});

test('motion preference suppresses rain and bursts, including changes at runtime', t => {
  const browser = browserFixture(t, true);
  browser.party.burst(); browser.step();
  assert.equal(browser.draws, 0); assert.equal(browser.pending.size, 0);
  browser.motion.matches = false; browser.motion.dispatchEvent(new Event('change'));
  browser.step(); assert.ok(browser.draws > 0);
  browser.motion.matches = true; browser.motion.dispatchEvent(new Event('change'));
  assert.equal(browser.pending.size, 0);
});

test('repeated celebration clicks stay bounded and stop releases the loop', t => {
  const browser = browserFixture(t);
  for (let click = 0; click < 100; click++) browser.party.burst();
  browser.step();
  assert.ok(browser.draws < 300, 'rapid clicks must not accumulate thousands of particles');
  browser.party.stop(); assert.equal(browser.pending.size, 0);
  browser.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(browser.pending.size, 0, 'stopped controller cannot restart');
});
