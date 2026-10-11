// focus-pet 설정: 숫자와 대사는 이 파일에서만 고친다 (PRD #7)
const FP_CONFIG = {
  // 처음 설치했을 때 들어 있는 방해 사이트 (PRD #4-2)
  defaultSites: ['youtube.com', 'netflix.com', 'tving.com', 'instagram.com', 'comic.naver.com'],

  defaultPetName: '삐약이',

  // 스트레스(0~100) 계산 규칙 (PRD #9)
  stress: {
    max: 100,
    perDistractedMinute: 5, // 방해 사이트를 보는 1분마다
    perCalmMinute: -2, // 방해 사이트 밖에서 1분마다
    snooze: 10, // "5분만"(미루기)을 누를 때
    taskDone: -30, // 할 일을 완료할 때
    // 가장 급한 할 일의 마감이 가까우면 방해 사이트를 볼 때 더 빨리 쌓인다
    deadlineBoost: [
      { withinHours: 3, times: 2 },
      { withinHours: 24, times: 1.5 },
    ],
  },

  // 스트레스가 min 이상이면 그 단계 (PRD #9)
  stages: [
    { key: 'calm', name: '평온', min: 0 },
    { key: 'watch', name: '눈치', min: 25 },
    { key: 'nag', name: '잔소리', min: 50 },
    { key: 'explode', name: '폭발', min: 80 },
  ],

  // 펫이 페이지에 나왔다 닫힌 뒤 다시 나오기까지 (PRD #9)
  popupCooldownMinutes: 3,

  // 데모 모드: 1분을 10초로 계산 (PRD #7)
  demoSecondsPerMinute: 10,
  demoPopupCooldownSeconds: 20,

  // 잔소리 대사: {pet} 펫 이름, {task} 가장 급한 할 일, {left} 남은 시간 (PRD #4-3)
  lines: {
    nag: [
      '{task} 마감까지 {left} 남았는데… 지금 이거 보는 거 맞아?',
      '잠깐, {task} 다 했어? 아직 {left} 남긴 했는데…',
      '{pet} 좀 서운해. {task}는 언제 할 거야?',
      '이 영상 끝나면 {task} 하는 거다?',
    ],
    explode: [
      '{task} 마감까지 {left}!!! 당장 꺼!!!',
      '{pet} 진짜 화났어. {task} 지금 안 하면 큰일 나!',
      '또 미뤘어? {task} {left} 남았다고!!',
      '삐약!!! 이제 그만 봐!!! {task}!!!',
    ],
    // 등록된 할 일이 없을 때
    nagNoTask: ['여기 온 지 꽤 됐어… 이제 슬슬 돌아가자?', '{pet} 계속 보고 있다?'],
    explodeNoTask: ['삐약!!! 너무 오래 봤어!!!', '{pet} 폭발 직전이야. 이제 그만!!'],
  },
};
