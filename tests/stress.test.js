// 스트레스 계산 테스트: node tests/stress.test.js
const assert = require('node:assert');
global.FP_CONFIG = require('../config.js');
const { deadlineTimes, nextStress, stageOf } = require('../stress.js');

const MIN = 60000;
const now = Date.now();
const dueIn = (hours) => [{ due: now + hours * 3600000, done: false }];

// 방해 사이트 10분 → 50
assert.strictEqual(nextStress(0, { distractedMs: 10 * MIN }), 50);
// 마감 3시간 전 방해 사이트 5분 → 50
assert.strictEqual(nextStress(0, { distractedMs: 5 * MIN, times: deadlineTimes(dueIn(2), now) }), 50);
// 마감 하루 전 ×1.5, 마감 지남 ×2, 완료한 할 일·마감 여유는 ×1
assert.strictEqual(deadlineTimes(dueIn(10), now), 1.5);
assert.strictEqual(deadlineTimes(dueIn(-1), now), 2);
assert.strictEqual(deadlineTimes([{ due: now, done: true }, ...dueIn(48)], now), 1);
// 0 아래·100 위로 안 넘어감
assert.strictEqual(nextStress(10, { calmMs: 60 * MIN }), 0);
assert.strictEqual(nextStress(90, { distractedMs: 60 * MIN }), 100);
// 할 일 완료 −30, 데모 모드는 10초가 1분
assert.strictEqual(nextStress(50, { bonus: -30 }), 20);
assert.strictEqual(nextStress(0, { distractedMs: 10000, minuteMs: 10000 }), 5);
// 단계 경계
assert.deepStrictEqual([0, 24, 25, 49, 50, 79, 80, 100].map((v) => stageOf(v).key),
  ['calm', 'calm', 'watch', 'watch', 'nag', 'nag', 'explode', 'explode']);

console.log('스트레스 계산 테스트 통과');
