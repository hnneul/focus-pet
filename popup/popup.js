// 팝업: 할 일 등록·목록 (PRD #4-1)
const $ = (id) => document.getElementById(id);
let todos = [];

// 1-10. 크롬 저장소에 저장하고, 저장값 중 형식이 맞지 않는 것은 버린다
const isTodo = (t) =>
  t && typeof t.id === 'string' && typeof t.title === 'string' && Number.isFinite(t.due) && typeof t.done === 'boolean';

async function load() {
  const { todos: saved } = await chrome.storage.local.get('todos');
  todos = Array.isArray(saved) ? saved.filter(isTodo) : [];
  render();
}

function save() {
  chrome.storage.local.set({ todos });
}

// 1-6. 남은 시간: 1시간 미만은 분, 하루 미만은 시간, 그 이상은 D-day
function leftText(due, now) {
  const minutes = Math.floor((due - now) / 60000);
  if (minutes < 60) return `${minutes}분 남음`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}시간 남음`;
  const dayStart = (t) => new Date(t).setHours(0, 0, 0, 0);
  return `D-${Math.round((dayStart(due) - dayStart(now)) / 86400000)}`;
}

function render() {
  const now = Date.now();
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

function showError(message) {
  $('todo-error').textContent = message;
  $('todo-error').hidden = !message;
}

// 1-5. 제목과 마감이 모두 있어야 추가
$('todo-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const title = $('todo-title').value.trim();
  const due = new Date($('todo-due').value).getTime();
  if (!title) return showError('할 일을 입력해 주세요.');
  if (!Number.isFinite(due)) return showError('마감 날짜와 시간을 정해 주세요.');
  showError('');
  todos.push({ id: crypto.randomUUID(), title, due, done: false });
  save();
  $('todo-title').value = '';
  $('todo-due').value = '';
  render();
});
$('todo-title').addEventListener('input', () => showError(''));
$('todo-due').addEventListener('input', () => showError(''));

load();
setInterval(render, 30000); // 팝업을 열어둔 동안 남은 시간 갱신
