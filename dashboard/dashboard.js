// 대시보드 (팝업에서 열기): 펫, 남은 할 일, 최근 7일 사이트별 도둑맞은 시간 (PRD #4-4)
const $ = (id) => document.getElementById(id);
const DAY = 86400000;

const timeText = (ms) => {
  const minutes = Math.floor(ms / 60000);
  return minutes < 60 ? `${minutes}분` : `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`;
};

function item(className, text) {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

async function render() {
  const now = Date.now();
  const saved = await chrome.storage.local.get(['todos', 'usage', 'stress', 'petName']);

  // 5-1, 5-5. 지금 단계의 펫과 이름
  const stress = Number.isFinite(saved.stress) ? saved.stress : 0;
  const stage = stageOf(stress);
  $('pet').src = `../icons/${stage.key}.png`;
  $('pet').alt = `${stage.name} 단계 펫`;
  $('pet').className = stage.key;
  $('pet-name').textContent = saved.petName || FP_CONFIG.defaultPetName;
  $('stress').textContent = Math.round(stress);
  $('stage').textContent = stage.name;

  // 5-2. 완료하지 않은 할 일, 마감 가까운 순
  const todos = (Array.isArray(saved.todos) ? saved.todos : [])
    .filter((t) => t && typeof t.title === 'string' && Number.isFinite(t.due) && !t.done)
    .sort((a, b) => a.due - b.due);
  $('todo-list').replaceChildren(
    ...todos.map((todo) => {
      const li = document.createElement('li');
      const overdue = todo.due <= now;
      li.classList.toggle('overdue', overdue);
      li.append(item('title', todo.title), item('left', overdue ? '마감 지남' : leftText(todo.due, now)));
      return li;
    }),
  );
  $('todo-empty').hidden = todos.length > 0;

  // 5-3. 오늘 포함 최근 7일을 사이트별로 더해서, 많은 순으로 막대그래프
  const usage = saved.usage && typeof saved.usage === 'object' ? saved.usage : {};
  const totals = {};
  for (let i = 0; i < 7; i++) {
    const day = new Date(now - i * DAY).toLocaleDateString('sv-SE');
    for (const [site, ms] of Object.entries(usage[day] ?? {})) {
      if (Number.isFinite(ms)) totals[site] = (totals[site] ?? 0) + ms;
    }
  }
  const rows = Object.entries(totals)
    .filter(([, ms]) => ms >= 60000)
    .sort((a, b) => b[1] - a[1]);
  $('week-list').replaceChildren(
    ...rows.map(([site, ms]) => {
      const li = document.createElement('li');
      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.append(document.createElement('span'));
      bar.firstChild.style.width = `${(ms / rows[0][1]) * 100}%`;
      li.append(item('site', site), bar, item('time', timeText(ms)));
      return li;
    }),
  );
  $('week-empty').hidden = rows.length > 0;
}

render();
chrome.storage.onChanged.addListener(render); // 5-5. 이름·할 일·스트레스가 바뀌면 바로 다시 그린다
setInterval(render, 30000); // 남은 시간 갱신
