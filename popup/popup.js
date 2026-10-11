// 팝업: 할 일 등록·목록 (PRD #4-1), 방해 사이트와 오늘 방해받은 시간 (PRD #4-2)
const $ = (id) => document.getElementById(id);
let todos = [];
let sites = [];
let todayMs = 0; // 오늘 저장된 방해받은 시간
let tracking = null; // 지금 재고 있는 방해 사이트 { site, start }
let stress = 0;
let cheering = false; // 할 일을 완료해서 기뻐하는 중

// 1-10. 크롬 저장소에 저장하고, 저장값 중 형식이 맞지 않는 것은 버린다
const isTodo = (t) =>
  t && typeof t.id === 'string' && typeof t.title === 'string' && Number.isFinite(t.due) && typeof t.done === 'boolean';

async function load() {
  const saved = await chrome.storage.local.get(['todos', 'sites', 'usage', 'tracking', 'stress', 'demo', 'petName']);
  todos = Array.isArray(saved.todos) ? saved.todos.filter(isTodo) : [];
  sites = Array.isArray(saved.sites) ? saved.sites.filter((s) => typeof s === 'string') : [...FP_CONFIG.defaultSites];
  const today = Object.values(saved.usage?.[new Date().toLocaleDateString('sv-SE')] ?? {});
  todayMs = today.filter(Number.isFinite).reduce((sum, ms) => sum + ms, 0);
  tracking = saved.tracking ?? null;
  stress = Number.isFinite(saved.stress) ? saved.stress : 0;
  $('demo').checked = saved.demo === true;
  $('pet-name').value = typeof saved.petName === 'string' ? saved.petName : '';
  render();
  renderSites();
  renderStress();
}

function save() {
  chrome.storage.local.set({ todos });
}

// 2-8. 저장된 시간 + 지금 재고 있는 시간
function renderToday(now) {
  const live = tracking && Number.isFinite(tracking.start) ? now - tracking.start : 0;
  $('today-time').textContent = `${Math.floor((todayMs + live) / 60000)}분`;
}

// 3-6. 지금 스트레스와 단계, 위쪽 병아리 그림
function renderStress() {
  const stage = stageOf(stress);
  $('stress').textContent = Math.round(stress);
  $('stage').textContent = stage.name;
  if (cheering) return;
  $('pet').src = `../icons/${stage.key}.png`;
  $('pet').alt = `${stage.name} 단계 병아리`;
}

// 6-6. 할 일을 완료하면 2초 동안 평온한 얼굴로 폴짝 뛰며 기뻐한다
function cheer() {
  const lines = FP_CONFIG.lines.happy;
  cheering = true;
  $('pet').src = '../icons/calm.png';
  $('pet').classList.add('happy');
  $('cheer').textContent = lines[Math.floor(Math.random() * lines.length)];
  $('cheer').hidden = false;
  setTimeout(() => {
    cheering = false;
    $('pet').classList.remove('happy');
    $('cheer').hidden = true;
    renderStress();
  }, 2000);
}

function render() {
  const now = Date.now();
  renderToday(now);
  // 완료한 일은 아래로, 그 안에서는 마감 가까운 순
  const sorted = [...todos].sort((a, b) => a.done - b.done || a.due - b.due);
  $('todo-list').replaceChildren(...sorted.map((todo) => renderItem(todo, now)));
  $('todo-empty').hidden = todos.length > 0;
}

function renderItem(todo, now) {
  const li = document.createElement('li');
  li.classList.toggle('done', todo.done);
  const overdue = !todo.done && todo.due <= now; // 1-9. 완료 안 했는데 마감이 지남
  li.classList.toggle('overdue', overdue);

  // 1-7. 완료 체크
  const check = document.createElement('input');
  check.type = 'checkbox';
  check.checked = todo.done;
  check.setAttribute('aria-label', `${todo.title} 완료`);
  check.addEventListener('change', () => {
    todo.done = check.checked;
    if (todo.done) cheer();
    save();
    render();
  });

  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = todo.title;
  const left = document.createElement('span');
  left.className = 'left';
  left.textContent = overdue ? '마감 지남' : todo.done ? '완료' : leftText(todo.due, now);
  // 1-8. 삭제
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'delete';
  remove.textContent = '✕';
  remove.setAttribute('aria-label', `${todo.title} 삭제`);
  remove.addEventListener('click', () => {
    todos = todos.filter((t) => t.id !== todo.id);
    save();
    render();
  });

  li.append(check, title, left, remove);
  return li;
}

function showError(id, message) {
  $(id).textContent = message;
  $(id).hidden = !message;
}

// 1-5. 제목과 마감이 모두 있어야 추가
$('todo-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const title = $('todo-title').value.trim();
  const due = new Date($('todo-due').value).getTime();
  if (!title) return showError('todo-error', '할 일을 입력해 주세요.');
  if (!Number.isFinite(due)) return showError('todo-error', '마감 날짜와 시간을 정해 주세요.');
  showError('todo-error', '');
  todos.push({ id: crypto.randomUUID(), title, due, done: false });
  save();
  $('todo-title').value = '';
  $('todo-due').value = '';
  render();
});
$('todo-title').addEventListener('input', () => showError('todo-error', ''));
$('todo-due').addEventListener('input', () => showError('todo-error', ''));

// 2-7. 방해 사이트 추가·삭제
function renderSites() {
  $('site-list').replaceChildren(
    ...sites.map((site) => {
      const li = document.createElement('li');
      li.textContent = site;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'delete';
      remove.textContent = '✕';
      remove.setAttribute('aria-label', `${site} 삭제`);
      remove.addEventListener('click', () => {
        sites = sites.filter((s) => s !== site);
        chrome.storage.local.set({ sites });
        renderSites();
      });
      li.append(remove);
      return li;
    }),
  );
}

$('site-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const site = normalizeSite($('site-input').value);
  if (!site) return showError('site-error', '주소를 확인해 주세요. 예: youtube.com');
  if (sites.includes(site)) return showError('site-error', '이미 있는 사이트예요.');
  showError('site-error', '');
  sites.push(site);
  chrome.storage.local.set({ sites });
  $('site-input').value = '';
  renderSites();
});
$('site-input').addEventListener('input', () => showError('site-error', ''));

// 5-4. 펫 이름. 비우면 기본 이름(삐약이)
$('pet-name').addEventListener('change', () => chrome.storage.local.set({ petName: $('pet-name').value.trim() }));

// 3-5. 데모 모드
$('demo').addEventListener('change', () => chrome.storage.local.set({ demo: $('demo').checked }));

// 백그라운드가 스트레스를 바꾸면 (할 일 완료 −30 등) 바로 반영
chrome.storage.onChanged.addListener((change) => {
  if (!change.stress) return;
  stress = Number.isFinite(change.stress.newValue) ? change.stress.newValue : 0;
  renderStress();
});

load();
setInterval(render, 30000); // 팝업을 열어둔 동안 남은 시간 갱신
