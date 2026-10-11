// 서비스 워커: 방해받은 시간 측정과 스트레스 (PRD #4-2, #4-3, #9)
importScripts('config.js', 'sites.js', 'stress.js');

const CHECKPOINT = 'checkpoint';
const CHECKPOINT_MINUTES = 0.5; // 크롬이 허용하는 가장 짧은 간격. 데모 모드에서 표정이 단계를 건너뛰지 않게
const MAX_CHUNK = 5 * 60000; // ponytail: 알람이 밀려도 한 번에 5분까지만 더한다. 절전 후 몇 시간이 한꺼번에 쌓이는 걸 막기 위함

const dayKey = (time) => new Date(time).toLocaleDateString('sv-SE'); // "2026-10-11"

async function getSites() {
  const { sites } = await chrome.storage.local.get('sites');
  return Array.isArray(sites) ? sites : FP_CONFIG.defaultSites;
}

// 2-2, 2-5. 지금 보고 있는 방해 사이트와 그 탭. 아니면 null
async function currentSite() {
  const idle = await chrome.idle.queryState(60);
  if (idle === 'locked') return null; // 화면 잠김
  const win = await chrome.windows.getLastFocused({ populate: true }).catch(() => null);
  if (!win?.focused) return null; // 크롬이 앞에 없음
  const tab = win.tabs.find((t) => t.active);
  if (!tab?.url) return null;
  if (idle === 'idle' && !tab.audible) return null; // 1분 동안 입력이 없음. 단, 소리가 나는 영상은 보는 중으로 친다
  const site = matchSite(tab.url, await getSites());
  return site && { site, tabId: tab.id };
}

// 4-3. 완료하지 않은 할 일 중 마감이 가장 가까운 것의 남은 시간: "25분", "3시간", "2일"
function durationText(ms) {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  if (minutes < 60) return `${minutes}분`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}시간`;
  return `${Math.floor(minutes / (24 * 60))}일`;
}

// 4-3, 4-4. 단계별 대사 중 하나를 랜덤으로 골라 할 일·남은 시간·펫 이름을 채운다
function petLine(stageKey, todos, petName, now) {
  const next = todos.filter((t) => !t.done && t.due > now).sort((a, b) => a.due - b.due)[0];
  const lines = FP_CONFIG.lines[next ? stageKey : `${stageKey}NoTask`];
  return lines[Math.floor(Math.random() * lines.length)]
    .replaceAll('{pet}', petName)
    .replaceAll('{task}', next?.title ?? '')
    .replaceAll('{left}', next ? durationText(next.due - now) : '');
}

// 4-1. 보고 있는 탭에 펫 스크립트를 넣고 띄운다
async function showPet(tabId, stage, line) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ['content/pet.js'] });
  await chrome.scripting.executeScript({ target: { tabId }, func: (pet) => window.focusPet.show(pet), args: [{ stage, line }] });
}

const cooldownMs = (demo) => (demo ? FP_CONFIG.demoPopupCooldownSeconds * 1000 : FP_CONFIG.popupCooldownMinutes * 60000);

// 2-3. 재고 있던 시간을 시작 시각과의 차이로 더하고, 지금 상태로 다시 시작한다
async function checkpoint(bonus = 0) {
  const now = Date.now();
  const saved = await chrome.storage.local.get(['tracking', 'usage', 'stress', 'stressAt', 'todos', 'demo', 'petName', 'petMutedUntil']);
  const { tracking, usage = {} } = saved;
  const distractedMs = tracking ? Math.min(now - tracking.start, MAX_CHUNK) : 0;
  if (tracking) {
    // 2-4. 날짜별·사이트별로 쌓는다: { "2026-10-11": { "youtube.com": 밀리초 } }
    const day = dayKey(tracking.start);
    usage[day] ??= {};
    usage[day][tracking.site] = (usage[day][tracking.site] || 0) + distractedMs;
  }

  // 3-1. 지난 저장 이후 방해 사이트를 본 시간은 올리고, 나머지 시간은 내린다
  const last = Number.isFinite(saved.stressAt) ? saved.stressAt : now;
  const calmMs = Math.max(0, now - last - (tracking ? now - tracking.start : 0));
  const todos = Array.isArray(saved.todos) ? saved.todos.filter((t) => Number.isFinite(t?.due) && typeof t.title === 'string') : [];
  const before = stageOf(Number.isFinite(saved.stress) ? saved.stress : 0);
  const stress = nextStress(Number.isFinite(saved.stress) ? saved.stress : 0, {
    distractedMs,
    calmMs,
    minuteMs: saved.demo ? FP_CONFIG.demoSecondsPerMinute * 1000 : 60000, // 3-5. 데모 모드는 1분을 10초로
    times: deadlineTimes(todos, now),
    bonus,
  });

  const current = await currentSite();
  await chrome.storage.local.set({ usage, stress, stressAt: now, tracking: current ? { site: current.site, start: now } : null });

  // 3-3. 툴바 아이콘을 지금 단계 그림으로
  const after = stageOf(stress);
  await chrome.action.setIcon({ path: Object.fromEntries([16, 32, 48, 128].map((size) => [size, `icons/${after.key}-${size}.png`])) });

  // 4-1, 4-5. 잔소리·폭발 단계로 올라간 순간에만, 닫은 뒤 쉬는 시간이 지났으면 펫이 나온다
  const rose = after.min > before.min && (after.key === 'nag' || after.key === 'explode');
  if (current && rose && now >= (saved.petMutedUntil ?? 0)) {
    const line = petLine(after.key, todos, saved.petName || FP_CONFIG.defaultPetName, now);
    await showPet(current.tabId, after.key, line).catch((error) => console.warn('펫을 띄우지 못함', error));
  }
}

// 이벤트가 동시에 와도 한 번씩 차례로 처리해서 시간이 두 번 더해지지 않게 한다
let queue = Promise.resolve();
const update = (bonus = 0) => (queue = queue.then(() => checkpoint(bonus)).catch(console.error));

chrome.runtime.onInstalled.addListener(async () => {
  const { sites } = await chrome.storage.local.get('sites');
  if (!Array.isArray(sites)) await chrome.storage.local.set({ sites: FP_CONFIG.defaultSites });
});

// 30초마다 중간 저장. 서비스 워커가 깰 때마다 새로 만들면 타이머가 계속 초기화되므로 없거나 간격이 다를 때만 만든다
chrome.alarms.get(CHECKPOINT).then((alarm) => {
  if (alarm?.periodInMinutes !== CHECKPOINT_MINUTES) chrome.alarms.create(CHECKPOINT, { periodInMinutes: CHECKPOINT_MINUTES });
});
chrome.alarms.onAlarm.addListener((alarm) => alarm.name === CHECKPOINT && update());

// 2-2. 탭을 바꾸거나, 주소가 바뀌거나, 소리가 켜지고 꺼지거나, 창을 바꾸면 다시 판정
chrome.tabs.onActivated.addListener(() => update());
chrome.tabs.onUpdated.addListener((tabId, change) => (change.url || 'audible' in change) && update());
chrome.windows.onFocusChanged.addListener(() => update());

// 2-5. 입력이 없거나 화면이 잠기면 멈춤
chrome.idle.setDetectionInterval(60);
chrome.idle.onStateChanged.addListener(() => update());

// 4-5, 4-6. 페이지의 펫을 닫으면 한동안 안 나오고, "5분만"은 스트레스 +10
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'close' && message?.type !== 'snooze') return;
  chrome.storage.local.get('demo').then(({ demo }) => chrome.storage.local.set({ petMutedUntil: Date.now() + cooldownMs(demo) }));
  if (message.type === 'snooze') update(FP_CONFIG.stress.snooze);
});

chrome.storage.onChanged.addListener((change) => {
  // 방해 사이트 목록이 바뀌면 바로 다시 판정
  if (change.sites) update();
  // 3-2. 팝업에서 새로 완료한 할 일 하나마다 스트레스 −30
  if (change.todos) {
    const list = (value) => (Array.isArray(value) ? value : []);
    const wasDone = new Set(list(change.todos.oldValue).filter((t) => t?.done).map((t) => t.id));
    const newlyDone = list(change.todos.newValue).filter((t) => t?.done && !wasDone.has(t.id)).length;
    if (newlyDone) update(newlyDone * FP_CONFIG.stress.taskDone);
  }
});
