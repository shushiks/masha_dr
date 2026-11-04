// Game rules shared by the animation and tests. All distances use a 760 × 380 world.
export const RACE_SECONDS = 30;
export const REPS = 8;
export const LANES = [260, 380, 500];
export function clampLane(lane) { return Math.max(0, Math.min(2, lane)); }
export function overlapsCar(item, lane) {
  return item.lane === lane && Math.abs(item.y - 305) < 37;
}
export function timingPosition(seconds) { return (Math.sin(seconds * 2.3 - Math.PI / 2) + 1) / 2; }
export function isGoodRep(position) { return position >= 0.34 && position <= 0.66; }
export function raceScore(score, type) { return type === 'gift' ? score + 1 : Math.max(0, score - 1); }
export function giftCount(count) {
  const last = count % 10, lastTwo = count % 100;
  const noun = lastTwo >= 11 && lastTwo <= 14 ? 'ПОДАРКОВ' : last === 1 ? 'ПОДАРОК' : last >= 2 && last <= 4 ? 'ПОДАРКА' : 'ПОДАРКОВ';
  return `${count} ${noun}`;
}
