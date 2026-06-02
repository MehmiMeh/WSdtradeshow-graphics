/* ============================================================
   Graphics HQ — app.js
   Data persists in localStorage. No backend required.
   ============================================================ */

'use strict';

// ── State ─────────────────────────────────────────────────────────────────

let events  = [];
let tasks   = [];
let evSeq   = 1;
let tSeq    = 1;
let expandedEv    = {};
let taskFilter    = 'all';
let editingTaskId = null;
let currentPriority = 'med';

const PRIORITY_ORDER = { high: 0, med: 1, low: 2 };

// ── Persistence ───────────────────────────────────────────────────────────

function save() {
  try {
    localStorage.setItem('tshq_events', JSON.stringify(events));
    localStorage.setItem('tshq_tasks',  JSON.stringify(tasks));
    localStorage.setItem('tshq_seq',    JSON.stringify({ evSeq, tSeq }));
  } catch (e) {
    console.warn('Could not save to localStorage:', e);
  }
}

function load() {
  try {
    const e = localStorage.getItem('tshq_events');
    const t = localStorage.getItem('tshq_tasks');
    const s = localStorage.getItem('tshq_seq');
    if (e) events = JSON.parse(e);
    if (t) tasks  = JSON.parse(t);
    if (s) {
      const seq = JSON.parse(s);
      evSeq = seq.evSeq || 1;
      tSeq  = seq.tSeq  || 1;
    }
  } catch (_) {
    // First run or corrupted storage — start fresh
    events = []; tasks = []; evSeq = 1; tSeq = 1;
  }
}

// ── Security ──────────────────────────────────────────────────────────────

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

// ── Date helpers ──────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function daysLeft(d) {
  if (!d) return null;
  return Math.ceil((new Date(d + 'T12:00:00') - new Date()) / 86_400_000);
}

function dueCssClass(d) {
  const n = daysLeft(d);
  if (n === null) return '';
  return n < 0 ? 'overdue' : n <= 7 ? 'soon' : '';
}

function dueLabel(d) {
  const n = daysLeft(d);
  if (n === null) return '—';
  if (n < 0)  return `${Math.abs(n)}d overdue`;
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  return `${n}d left`;
}

function cardBorderClass(deadline) {
  const n = daysLeft(deadline);
  if (n === null) return 'good';
  return n < 0 ? 'urgent' : n <= 14 ? 'soon' : 'good';
}

function alertClass(n) {
  if (n === null) return 'da-green';
  return n < 0 ? 'da-red' : n <= 14 ? 'da-amber' : 'da-green';
}

function alertIcon(n) {
  if (n === null) return 'ti-circle-check';
  return n < 0 ? 'ti-alert-octagon' : n <= 14 ? 'ti-alert-triangle' : 'ti-circle-check';
}

function progressFillClass(pct) {
  return pct >= 70 ? 'fill-ok' : pct >= 40 ? 'fill-warn' : 'fill-danger';
}

// ── Tab navigation ────────────────────────────────────────────────────────

function go(tab) {
  const tabNames = ['dash', 'tasks', 'brief'];
  document.querySelectorAll('.nav-btn').forEach((btn, i) => {
    btn.classList.toggle('active', tabNames[i] === tab);
  });
  document.querySelectorAll('.pane').forEach(p => p.classList.add('hidden'));
  document.getElementById('pane-' + tab).classList.remove('hidden');

  if (tab === 'dash')  renderDash();
  if (tab === 'tasks') renderTasks();
  if (tab === 'brief') renderBrief();
}

// ── Form helpers ──────────────────────────────────────────────────────────

function toggleForm(id) {
  const f = document.getElementById(id);
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

function populateEventSelect(selectId, selectedId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = events.length
    ? events.map(e =>
        `<option value="${e.id}" ${e.id === selectedId ? 'selected' : ''}>${esc(e.name)}</option>`
      ).join('')
    : '<option value="">— add an event first —</option>';
}

// ── Priority selector ─────────────────────────────────────────────────────

function setPriority(p) {
  currentPriority = p;
  ['high', 'med', 'low'].forEach(x => {
    const btn = document.getElementById('p-' + x);
    if (btn) btn.className = (p === x) ? 'sel-' + x : '';
  });
}

// ── Event CRUD ────────────────────────────────────────────────────────────

function saveEvent() {
  const name = document.getElementById('evName').value.trim();
  if (!name) { alert('Please enter an event name.'); return; }

  events.push({
    id:       evSeq++,
    name,
    dates:    document.getElementById('evDates').value.trim(),
    venue:    document.getElementById('evVenue').value.trim(),
    deadline: document.getElementById('evDeadline').value,
    notes:    document.getElementById('evNotes').value.trim()
  });

  ['evName', 'evDates', 'evVenue', 'evNotes'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('evDeadline').value = '';
  document.getElementById('evForm').style.display = 'none';

  save();
  renderDash();
}

function deleteEvent(id) {
  if (!confirm('Delete this event and all its tasks?')) return;
  events = events.filter(x => x.id !== id);
  tasks  = tasks.filter(x => x.eventId !== id);
  delete expandedEv[id];
  save();
  renderDash();
}

// ── Task modal ────────────────────────────────────────────────────────────

function openAddTask(presetEvId) {
  editingTaskId = null;
  currentPriority = 'med';

  document.getElementById('modalTitle').textContent = 'Add task';
  appendModalCloseBtn();
  document.getElementById('mTaskName').value  = '';
  document.getElementById('mTaskDue').value   = '';
  document.getElementById('mTaskNotes').value = '';
  document.getElementById('mTaskType').value  = 'Booth graphics';

  populateEventSelect('mTaskEvent', presetEvId);
  setPriority('med');
  document.getElementById('taskModal').classList.remove('hidden');
  document.getElementById('mTaskName').focus();
}

function openEditTask(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;

  editingTaskId   = id;
  currentPriority = t.priority;

  document.getElementById('modalTitle').textContent = 'Edit task';
  appendModalCloseBtn();
  document.getElementById('mTaskName').value  = t.name;
  document.getElementById('mTaskDue').value   = t.due   || '';
  document.getElementById('mTaskNotes').value = t.notes || '';
  document.getElementById('mTaskType').value  = t.type;

  populateEventSelect('mTaskEvent', t.eventId);
  setPriority(t.priority);
  document.getElementById('taskModal').classList.remove('hidden');
  document.getElementById('mTaskName').focus();
}

function appendModalCloseBtn() {
  // Re-append the close button since textContent clears it
  const title = document.getElementById('modalTitle');
  const btn = document.createElement('button');
  btn.className   = 'icon-btn';
  btn.setAttribute('aria-label', 'Close');
  btn.onclick     = closeTaskModal;
  btn.innerHTML   = '<i class="ti ti-x" aria-hidden="true"></i>';
  title.appendChild(btn);
}

function closeTaskModal() {
  document.getElementById('taskModal').classList.add('hidden');
  editingTaskId = null;
}

function closeModal(e) {
  if (e.target === document.getElementById('taskModal')) closeTaskModal();
}

// Close on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeTaskModal();
});

function saveModalTask() {
  const name = document.getElementById('mTaskName').value.trim();
  if (!name) { alert('Please enter a task name.'); return; }

  const evId = parseInt(document.getElementById('mTaskEvent').value) || 0;
  const type = document.getElementById('mTaskType').value;
  const due  = document.getElementById('mTaskDue').value;
  const notes = document.getElementById('mTaskNotes').value.trim();

  if (editingTaskId !== null) {
    const t = tasks.find(x => x.id === editingTaskId);
    if (t) {
      t.name     = name;
      t.eventId  = evId;
      t.type     = type;
      t.priority = currentPriority;
      t.due      = due;
      t.notes    = notes;
    }
  } else {
    tasks.push({
      id:       tSeq++,
      name,
      eventId:  evId,
      type,
      priority: currentPriority,
      due,
      notes,
      done:     false
    });
  }

  closeTaskModal();
  save();
  renderDash();
  if (!document.getElementById('pane-tasks').classList.contains('hidden')) renderTasks();
}

// ── Task CRUD ─────────────────────────────────────────────────────────────

function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  tasks = tasks.filter(x => x.id !== id);
  save();
  renderDash();
  if (!document.getElementById('pane-tasks').classList.contains('hidden')) renderTasks();
}

function toggleDone(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  save();
  renderDash();
  if (!document.getElementById('pane-tasks').classList.contains('hidden')) renderTasks();
  if (!document.getElementById('pane-brief').classList.contains('hidden')) renderBrief();
}

// ── Task sort ─────────────────────────────────────────────────────────────

function sortByPriorityThenDue(list) {
  return [...list].sort((a, b) => {
    if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority])
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    return (a.due || '9999').localeCompare(b.due || '9999');
  });
}

// ── Task row HTML ─────────────────────────────────────────────────────────

function taskRowHtml(t, showEvent) {
  const ev  = events.find(e => e.id === t.eventId);
  const dc  = dueCssClass(t.due);
  const evBadge = (showEvent && ev)
    ? `<span class="badge b-sand" style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(ev.name)}</span>`
    : '';

  return `
    <div class="task-row">
      <div
        class="chk ${t.done ? 'done' : ''}"
        onclick="toggleDone(${t.id})"
        role="checkbox"
        aria-checked="${t.done}"
        tabindex="0"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleDone(${t.id})}"
        title="${t.done ? 'Mark incomplete' : 'Mark complete'}"
      >${t.done ? '<i class="ti ti-check" aria-hidden="true"></i>' : ''}</div>

      <div class="pdot p-${t.priority}" title="${esc(t.priority)} priority"></div>

      <span class="t-name ${t.done ? 'done' : ''}" title="${esc(t.name)}">${esc(t.name)}</span>

      <span class="t-type">${esc(t.type)}</span>

      ${evBadge}

      <span class="t-due ${dc}">${dueLabel(t.due)}</span>

      <div class="task-actions">
        <button class="icon-btn" onclick="openEditTask(${t.id})" title="Edit task" aria-label="Edit task">
          <i class="ti ti-edit" aria-hidden="true"></i>
        </button>
        <button class="icon-btn danger" onclick="deleteTask(${t.id})" title="Delete task" aria-label="Delete task">
          <i class="ti ti-trash" aria-hidden="true"></i>
        </button>
      </div>
    </div>`;
}

// ── Render: Dashboard ─────────────────────────────────────────────────────

function renderDash() {
  const total   = tasks.length;
  const done    = tasks.filter(t => t.done).length;
  const overdue = tasks.filter(t => !t.done && daysLeft(t.due) !== null && daysLeft(t.due) < 0).length;
  const soon    = tasks.filter(t => !t.done && daysLeft(t.due) !== null && daysLeft(t.due) >= 0 && daysLeft(t.due) <= 7).length;

  document.getElementById('statsRow').innerHTML = `
    <div class="stat">
      <div class="stat-label">Total tasks</div>
      <div class="stat-val">${total}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Completed</div>
      <div class="stat-val ok">${done}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Due this week</div>
      <div class="stat-val warn">${soon}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Overdue</div>
      <div class="stat-val danger">${overdue}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Events</div>
      <div class="stat-val">${events.length}</div>
    </div>`;

  const sortedEvents = [...events].sort((a, b) =>
    (a.deadline || '9999').localeCompare(b.deadline || '9999')
  );

  if (!sortedEvents.length) {
    document.getElementById('evCards').innerHTML =
      '<div class="empty"><i class="ti ti-calendar-plus" aria-hidden="true"></i><p>No events yet — click "Add event" to get started.</p></div>';
    return;
  }

  document.getElementById('evCards').innerHTML = sortedEvents.map(ev => {
    const evTasks   = tasks.filter(t => t.eventId === ev.id);
    const doneCount = evTasks.filter(t => t.done).length;
    const pct       = evTasks.length ? Math.round(doneCount / evTasks.length * 100) : 0;
    const n         = daysLeft(ev.deadline);
    const exp       = expandedEv[ev.id];

    const dlText = ev.deadline
      ? (n < 0
          ? `Deadline passed ${Math.abs(n)} day${Math.abs(n) === 1 ? '' : 's'} ago`
          : n === 0
            ? 'Exhibit deadline is TODAY'
            : `${n} day${n === 1 ? '' : 's'} until exhibit deadline — ${fmtDate(ev.deadline)}`)
      : null;

    const taskRows = sortByPriorityThenDue(evTasks).map(t => taskRowHtml(t, false)).join('');

    const expandedHtml = exp
      ? `<div class="task-list">${
          taskRows ||
          '<div style="font-size:13px;color:var(--text3);padding:8px 0">No tasks yet — click "+ Task" to add one.</div>'
        }</div>`
      : '';

    return `
      <div class="card ${cardBorderClass(ev.deadline)}">
        <div class="ev-hdr-row">
          <div>
            <div class="ev-name">${esc(ev.name)}</div>
            <div class="ev-meta">${[ev.dates, ev.venue].filter(Boolean).map(esc).join(' · ')}</div>
            ${ev.notes ? `<div class="ev-meta" style="font-style:italic;margin-top:1px">${esc(ev.notes)}</div>` : ''}
          </div>
          <div class="ev-quick-add">
            <button class="add-btn ghost sm" onclick="openAddTask(${ev.id})">
              <i class="ti ti-plus" aria-hidden="true"></i> Task
            </button>
            <button class="icon-btn danger" onclick="deleteEvent(${ev.id})" title="Delete event" aria-label="Delete event">
              <i class="ti ti-trash" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        ${dlText ? `
          <div class="dl-alert ${alertClass(n)}">
            <i class="ti ${alertIcon(n)}" aria-hidden="true" style="font-size:14px;flex-shrink:0"></i>
            <span>${dlText}</span>
          </div>` : ''}

        <div class="prog-bar">
          <div class="prog-labels">
            <span>${doneCount}/${evTasks.length} tasks complete</span>
            <span>${pct}%</span>
          </div>
          <div class="prog-track">
            <div class="prog-fill ${progressFillClass(pct)}" style="width:${pct}%"></div>
          </div>
        </div>

        <button class="expand-btn" onclick="expandedEv[${ev.id}]=!expandedEv[${ev.id}];renderDash()">
          <i class="ti ti-${exp ? 'chevron-up' : 'chevron-down'}" aria-hidden="true"></i>
          ${exp ? 'Hide tasks' : 'Show tasks'} (${evTasks.length})
        </button>

        ${expandedHtml}
      </div>`;
  }).join('');
}

// ── Render: All Tasks ─────────────────────────────────────────────────────

function renderTasks() {
  const types = ['all', ...new Set(tasks.map(t => t.type))];

  document.getElementById('taskChips').innerHTML = types.map(tp =>
    `<button class="chip ${taskFilter === tp ? 'active' : ''}" onclick="taskFilter='${esc(tp)}';renderTasks()">
      ${tp === 'all' ? 'All tasks' : esc(tp)}
    </button>`
  ).join('');

  let filtered = taskFilter === 'all'
    ? tasks
    : tasks.filter(t => t.type === taskFilter);

  // Sort: incomplete first, then by priority, then by due date
  filtered = [...filtered].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority])
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    return (a.due || '9999').localeCompare(b.due || '9999');
  });

  document.getElementById('taskRows').innerHTML = filtered.length
    ? `<div class="task-table">${filtered.map(t => taskRowHtml(t, true)).join('')}</div>`
    : '<div class="empty"><i class="ti ti-checklist" aria-hidden="true"></i><p>No tasks yet. Add one above.</p></div>';
}

// ── Render: Designer Brief ────────────────────────────────────────────────

function renderBrief() {
  const sortedEvents = [...events].sort((a, b) =>
    (a.deadline || '9999').localeCompare(b.deadline || '9999')
  );

  if (!sortedEvents.length) {
    document.getElementById('briefContent').innerHTML =
      '<div class="empty"><i class="ti ti-file-description" aria-hidden="true"></i><p>Add events and tasks to generate a brief.</p></div>';
    return;
  }

  const byDue = (a, b) => (a.due || '9999').localeCompare(b.due || '9999');

  const section = (list, label, labelCls, badgeCls) => {
    if (!list.length) return '';
    return `
      <div class="ps-group">
        <div class="ps-label ${labelCls}">${label}</div>
        ${list.map(t => `
          <div class="ps-row">
            <div class="pdot p-${t.priority}"></div>
            <span class="badge ${badgeCls}">${esc(t.type)}</span>
            <span style="flex:1">${esc(t.name)}</span>
            <span style="font-size:12px;color:var(--text3)">${t.due ? fmtDate(t.due) : ''}</span>
          </div>`).join('')}
      </div>`;
  };

  document.getElementById('briefContent').innerHTML = sortedEvents.map(ev => {
    const pending = tasks.filter(t => t.eventId === ev.id && !t.done);
    const n       = daysLeft(ev.deadline);

    const dlParts = [ev.dates, ev.venue].filter(Boolean).map(esc);
    if (n !== null) {
      const dlStr = n < 0
        ? `⚠ Deadline passed ${Math.abs(n)}d ago`
        : n === 0 ? '🚨 Deadline TODAY'
        : `📅 ${n}d to deadline`;
      dlParts.push(dlStr);
    }

    const high = pending.filter(t => t.priority === 'high').sort(byDue);
    const med  = pending.filter(t => t.priority === 'med').sort(byDue);
    const low  = pending.filter(t => t.priority === 'low').sort(byDue);

    return `
      <div class="brief-ev">
        <div class="brief-ev-hdr">
          <div>
            <div class="brief-ev-name">${esc(ev.name)}</div>
            <div class="brief-ev-meta">${dlParts.join(' · ')}</div>
          </div>
          <span class="badge b-blue">${pending.length} pending</span>
        </div>
        ${!pending.length
          ? '<div style="font-size:13px;color:var(--text3)">All tasks complete.</div>'
          : section(high, '🔴 High priority — do first', 'high', 'b-red') +
            section(med,  '🟡 Medium priority',           'med',  'b-amber') +
            section(low,  '🟢 Lower priority',            'low',  'b-green')}
      </div>`;
  }).join('');
}

// ── Copy brief as plain text ───────────────────────────────────────────────

function copyBrief() {
  const sortedEvents = [...events].sort((a, b) =>
    (a.deadline || '9999').localeCompare(b.deadline || '9999')
  );

  let text = 'TRADE SHOW GRAPHICS — DESIGNER BRIEF\n' + '='.repeat(38) + '\n\n';

  sortedEvents.forEach(ev => {
    const pending = tasks.filter(t => t.eventId === ev.id && !t.done);
    const n       = daysLeft(ev.deadline);
    const dlStr   = n === null ? '' : n < 0
      ? `DEADLINE PASSED ${Math.abs(n)} DAYS AGO`
      : `${n} days to exhibit deadline (${fmtDate(ev.deadline)})`;

    text += `EVENT: ${ev.name}\n`;
    if (ev.dates) text += `Dates:  ${ev.dates}\n`;
    if (ev.venue) text += `Venue:  ${ev.venue}\n`;
    if (dlStr)    text += `${dlStr}\n`;
    text += '\n';

    const byDue = (a, b) => (a.due || '9999').localeCompare(b.due || '9999');
    const groups = [
      ['HIGH PRIORITY',   pending.filter(t => t.priority === 'high').sort(byDue)],
      ['MEDIUM PRIORITY', pending.filter(t => t.priority === 'med').sort(byDue)],
      ['LOW PRIORITY',    pending.filter(t => t.priority === 'low').sort(byDue)]
    ];

    groups.forEach(([label, list]) => {
      if (!list.length) return;
      text += `${label}:\n`;
      list.forEach(t => {
        text += `  • [${t.type}] ${t.name}`;
        if (t.due)   text += ` — Due ${fmtDate(t.due)}`;
        if (t.notes) text += ` | ${t.notes}`;
        text += '\n';
      });
      text += '\n';
    });

    if (!pending.length) text += 'All tasks complete.\n\n';
    text += '-'.repeat(38) + '\n\n';
  });

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.copy-btn');
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i> Copied!';
    btn.style.cssText += ';background:var(--ok-bg);color:var(--ok);border-color:var(--ok)';
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.style.background = '';
      btn.style.color = '';
      btn.style.borderColor = '';
    }, 2200);
  }).catch(() => {
    alert('Clipboard unavailable. Please copy the brief text manually.');
  });
}

// ── Boot ───────────────────────────────────────────────────────────────────

load();
renderDash();
