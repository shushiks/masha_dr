import test from 'node:test';
import assert from 'node:assert/strict';
import { clampLane, overlapsCar, timingPosition, isGoodRep, raceScore } from '../static/model.mjs';
test('steering stays on the road at either edge', () => {
  assert.equal(clampLane(-1), 0); assert.equal(clampLane(3), 2); assert.equal(clampLane(1), 1);
});
test('collision requires both lane and distance; adjacent gifts are not collected', () => {
  assert.equal(overlapsCar({ lane: 1, y: 305 }, 1), true);
  assert.equal(overlapsCar({ lane: 0, y: 305 }, 1), false);
  assert.equal(overlapsCar({ lane: 1, y: 200 }, 1), false);
});
test('a cone cannot make the score negative; gifts increase the score', () => {
  assert.equal(raceScore(0, 'cone'), 0); assert.equal(raceScore(5, 'cone'), 4); assert.equal(raceScore(5, 'gift'), 6);
});
test('rhythm crosses the target zone and rejects either end', () => {
  assert.equal(isGoodRep(timingPosition(0)), false);
  assert.equal(isGoodRep(timingPosition(Math.PI / 2 / 2.3)), true);
  assert.equal(isGoodRep(timingPosition(Math.PI / 2.3)), false);
  assert.equal(isGoodRep(.34), true); assert.equal(isGoodRep(.66), true);
});
