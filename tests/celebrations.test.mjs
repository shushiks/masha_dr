import test from 'node:test';
import assert from 'node:assert/strict';
import { REWARDS, finaleFor } from '../static/celebrations.mjs';

test('each quest has a different reward and personal message', () => {
  assert.notEqual(REWARDS.race.badge, REWARDS.gym.badge);
  assert.notEqual(REWARDS.race.title, REWARDS.gym.title);
  assert.notEqual(REWARDS.race.message, REWARDS.gym.message);
});

test('all four completion paths produce distinct final congratulations', () => {
  const paths = [{ race: false, gym: false }, { race: true, gym: false }, { race: false, gym: true }, { race: true, gym: true }];
  const finales = paths.map(finaleFor);
  assert.equal(new Set(finales.map(finale => finale.message)).size, 4);
  assert.equal(finaleFor({ race: true, gym: false }).next, 'gym');
  assert.equal(finaleFor({ race: false, gym: true }).next, 'race');
});
