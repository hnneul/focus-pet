// 서비스 워커: 방해받은 시간 측정 (PRD #4-2, #9)
importScripts('config.js', 'sites.js');

const CHECKPOINT = 'checkpoint';
const MAX_CHUNK = 5 * 60000; // ponytail: 알람이 밀려도 한 번에 5분까지만 더한다. 절전 후 몇 시간이 한꺼번에 쌓이는 걸 막기 위함

const dayKey = (time) => new Date(time).toLocaleDateString('sv-SE'); // "2026-10-11"

async function getSites() {
  const { sites } = await chrome.storage.local.get('sites');
  return Array.isArray(sites) ? sites : FP_CONFIG.defaultSites;
}

// 2-2, 2-5. 지금 보고 있는 방해 사이트. 아니면 null
async function currentSite() {
  const idle = await chrome.idle.queryState(60);
  if (idle === 'locked') return null; // 화면 잠김
  const win = await chrome.windows.getLastFocused({ populate: true }).catch(() => null);
  if (!win?.focused) return null; // 크롬이 앞에 없음
  const tab = win.tabs.find((t) => t.active);
  if (!tab?.url) return null;
  if (idle === 'idle' && !tab.audible) return null; // 1분 동안 입력이 없음. 단, 소리가 나는 영상은 보는 중으로 친다
  return matchSite(tab.url, await getSites());
}

// 2-3. 재고 있던 시간을 시작 시각과의 차이로 더하고, 지금 상태로 다시 시작한다
async function checkpoint() {
  const now = Date.now();
  const { tracking, usage = {} } = await chrome.storage.local.get(['tracking', 'usage']);
  if (tracking) {
    // 2-4. 날짜별·사이트별로 쌓는다: { "2026-10-11": { "youtube.com": 밀리초 } }
    const day = dayKey(tracking.start);
    usage[day] ??= {};
    usage[day][tracking.site] = (usage[day][tracking.site] || 0) + Math.min(now - tracking.start, MAX_CHUNK);
  }
  const site = await currentSite();
  await chrome.storage.local.set({ usage, tracking: site ? { site, start: now } : null });
}

// 이벤트가 동시에 와도 한 번씩 차례로 처리해서 시간이 두 번 더해지지 않게 한다
let queue = Promise.resolve();
const update = () => (queue = queue.then(checkpoint).catch(console.error));

chrome.runtime.onInstalled.addListener(async () => {
  const { sites } = await chrome.storage.local.get('sites');
  if (!Array.isArray(sites)) await chrome.storage.local.set({ sites: FP_CONFIG.defaultSites });
});

// 1분마다 중간 저장. 서비스 워커가 깰 때마다 새로 만들면 타이머가 계속 초기화되므로 없을 때만 만든다
chrome.alarms.get(CHECKPOINT).then((alarm) => {
  if (!alarm) chrome.alarms.create(CHECKPOINT, { periodInMinutes: 1 });
});
chrome.alarms.onAlarm.addListener((alarm) => alarm.name === CHECKPOINT && update());

// 2-2. 탭을 바꾸거나, 주소가 바뀌거나, 소리가 켜지고 꺼지거나, 창을 바꾸면 다시 판정
chrome.tabs.onActivated.addListener(update);
chrome.tabs.onUpdated.addListener((tabId, change) => (change.url || 'audible' in change) && update());
chrome.windows.onFocusChanged.addListener(update);

// 2-5. 입력이 없거나 화면이 잠기면 멈춤
chrome.idle.setDetectionInterval(60);
chrome.idle.onStateChanged.addListener(update);

// 방해 사이트 목록이 바뀌면 바로 다시 판정
chrome.storage.onChanged.addListener((change) => change.sites && update());
