// 스트레스 계산, 단계 판정, 할 일 남은 시간 (PRD #9). 백그라운드·팝업·새 탭·테스트에서 같이 쓴다. config.js를 먼저 불러야 한다

// 1-6. 할 일 남은 시간 (팝업·새 탭): 1시간 미만은 분, 하루 미만은 시간, 그 이상은 D-day
function leftText(due, now) {
  const minutes = Math.floor((due - now) / 60000);
  if (minutes < 60) return `${minutes}분 남음`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}시간 남음`;
  const dayStart = (t) => new Date(t).setHours(0, 0, 0, 0);
  return `D-${Math.round((dayStart(due) - dayStart(now)) / 86400000)}`;
}

// 3-1. 완료하지 않은 할 일 중 마감이 가장 가까운 것에 따른 배수 (마감이 지났으면 가장 큰 배수)
function deadlineTimes(todos, now) {
  const dues = todos.filter((t) => !t.done).map((t) => t.due);
  if (!dues.length) return 1;
  const hoursLeft = (Math.min(...dues) - now) / 3600000;
  const boost = FP_CONFIG.stress.deadlineBoost.find((b) => hoursLeft <= b.withinHours);
  return boost ? boost.times : 1;
}

// 3-1. 방해 사이트를 본 시간은 올리고, 안 본 시간은 내린다. bonus는 할 일 완료 같은 한 번에 바뀌는 값
function nextStress(value, { distractedMs = 0, calmMs = 0, minuteMs = 60000, times = 1, bonus = 0 }) {
  const { max, perDistractedMinute, perCalmMinute } = FP_CONFIG.stress;
  const next =
    value + (distractedMs / minuteMs) * perDistractedMinute * times + (calmMs / minuteMs) * perCalmMinute + bonus;
  return Math.min(max, Math.max(0, next));
}

// 3-3. 스트레스가 속한 단계 (평온·눈치·잔소리·폭발)
function stageOf(value) {
  return FP_CONFIG.stages.findLast((stage) => value >= stage.min);
}

if (typeof module !== 'undefined') module.exports = { leftText, deadlineTimes, nextStress, stageOf };
