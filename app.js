/* ============================================================
   Trade Show Graphics HQ — app.js
   All data is saved to localStorage so it persists on reload.
   ============================================================ */

// ---- State ----------------------------------------------------------------

let events = [];
let tasks  = [];
let evSeq  = 1;
let tSeq   = 1;
let expandedEv = {};
let taskFilter = 'all';

// ---- Persistence ----------------------------------------------------------

function save() {
  localStorage.setItem('ts_events',    JSON.stringify(events));
  localStorage.setItem('ts_tasks',     JSON.stringify(tasks));
  localStorage.setItem('ts_evSeq',     evSeq);
  localStorage.setItem('ts_tSeq',      tSeq);
}

function load() {
  try {
    const e = localStorage.getItem('ts_events');
    const t = localStorage.getItem('ts_tasks');
    if (e) events = JSON.parse(e);
    if (t) tasks  = JSON.parse(t);
    evSeq = parseInt(localStorage.getItem('ts_evSeq') || evSeq);
    tSeq  = parseInt(localStorage.getItem('ts_tSeq')  || tSeq);
  } catch (_) { /* first run — start fresh */ }
}

// ---- Date helpers ---------------------------------------------------------

function today() { return new Date(); }

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function daysLeft(d) {
  if (!d) return null;
  return Math.ceil((new Date(d + 'T12:00:00') - today()) / 86400000);
}

function dlClass(d) {
  const n = daysLeft(d);
  if (n === null) return '';
  return n < 0 ? 'overdue' : n <= 7 ? 'soon' : '';
}

function dlLabel(d) {
  const n = daysLeft(d);
  if (n === null) return '—';
  if (n < 0)  return Math.abs(n) + 'd overdue';
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  return n + 'd left';
}

// ---- Tab switching --------------------------------------------------------

function go(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.pane').forEach(p => p.classList.add('hidden'));
  document.getElementById('pane-' + tab).classList.remove('hidden');
  const names = ['dash', 'tasks', 'brief'];
  document.querySelectorAll('.tab').forEach((t, i) => {
    if (names[i] === tab) t.classList.add('active');
  });
  if (tab === 'dash')  renderDash();
  if (tab === 'tasks') renderTasks();
  if (tab === 'brief') renderBrief();
}

// ---- Form helpers ---------------------------------------------------------

function toggleForm(id) {
  const f = document.getElementById(id);
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
  if (id === 'taskForm' && f.style.display === 'block') {
    populateEventSelect('tEvent');
  }
}

function populateEventSelect(selectId) {
  const sel = document.getElementById(selectId);
  sel.innerHTML = events.length
    ? events.map(e => `<option value="${e.id}">${e.name}</option>`).join('')
    : '<option value="">— add an event first —</option>';
}

// ---- Save / delete events -------------------------------------------------

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
  ['evName','evDates','evVenue','evNotes'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('evDeadline').value = '';
  toggleForm('evForm');
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

// ---- Save / delete tasks --------------------------------------------------

function saveTask() {
  const name = document.getElementById('tName').value.trim();
  if (!name) { alert('Please enter a task name.'); return; }
  const evId = parseInt(document.getElementById('tEvent').value) || 0;
  tasks.push({
    id:       tSeq++,
    name,
    eventId:  evId,
    type:     document.getElementById('tType').value,
    priority: document.getElementById('tPriority').value,
    due:      document.getElementById('tDue').value,
    notes:    document.getElementById('tNotes').value.trim(),
    done:     false
  });
  ['tName','tNotes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('tDue').value = '';
  toggleForm('taskForm');
  save();
  renderTasks();
  renderDash();
}

function deleteTask(id) {
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

// ---- Open "add task" pre-selected for an event ----------------------------

function openAddTaskForEvent(evId) {
  go('tasks');
  setTimeout(() => {
    const f = document.getElementById('taskForm');
    f.style.display = 'block';
    populateEventSelect('tEvent');
    document.getElementById('tEvent').value = evId;
  }, 30);
}

// ---- Priority sort order --------------------------------------------------
const PRIORITY_ORDER = { high: 0, med: 1, low: 2 };

function sortTasks(list) {
  return [...list].sort((a, b) => {
    if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority])
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    return (a.due || '9999').localeCompare(b.due || '9999');
  });
}

// ---- Card border class based on deadline proximity -----------------------

function borderClass(deadline) {
  const n = daysLeft(deadline);
  if (n === null) return 'ok-border';
  return n < 0 ? 'urgent-border' : n <= 14 ? 'warn-border' : 'ok-border';
}

function alertMeta(n) {
  const cls   = n === null ? 'da-green' : n < 0 ? 'da-red' : n <= 14 ? 'da-amber' : 'da-green';
  const icon  = n === null ? 'ti-circle-check' : n < 0 ? 'ti-alert-octagon' : n <= 14 ? 'ti-alert-triangle' : 'ti-circle-check';
  return { cls, icon };
}

function fillClass(pct) {
  return pct >= 70 ? 'fill-ok' : pct >= 40 ? 'fill-warn' : 'fill-danger';
}

// ---- Render: Dashboard ----------------------------------------------------

function renderDash() {
  const total   = tasks.length;
  const done    = tasks.filter(t => t.done).length;
  const overdue = tasks.filter(t => !t.done && daysLeft(t.due) !== null && daysLeft(t.due) < 0).length;
  const soon    = tasks.filter(t => !t.done && daysLeft(t.due) !== null && daysLeft(t.due) >= 0 && daysLeft(t.due) <= 7).length;

  document.getElementById('statsRow').innerHTML = `
    <div class="stat"><div class="stat-label">Total tasks</div><div class="stat-val">${total}</div></div>
    <div class="stat"><div class="stat-label">Completed</div><div class="stat-val ok">${done}</div></div>
    <div class="stat"><div class="stat-label">Due this week</div><div class="stat-val warn">${soon}</div></div>
    <div class="stat"><div class="stat-label">Overdue</div><div class="stat-val danger">${overdue}</div></div>
    <div class="stat"><div class="stat-label">Events</div><div class="stat-val">${events.length}</div></div>`;

  const sorted = [...events].sort((a, b) =>
    (a.deadline || '9999').localeCompare(b.deadline || '9999')
  );

  if (!sorted.length) {
    document.getElementById('evCards').innerHTML =
      `<div class="empty"><i class="ti ti-calendar-plus" aria-hidden="true"></i>No events yet — click "Add event" to get started.</div>`;
    return;
  }

  document.getElementById('evCards').innerHTML = sorted.map(ev => {
    const evTasks   = tasks.filter(t => t.eventId === ev.id);
    const doneCount = evTasks.filter(t => t.done).length;
    const pct       = evTasks.length ? Math.round(doneCount / evTasks.length * 100) : 0;
    const n         = daysLeft(ev.deadline);
    const exp       = expandedEv[ev.id];
    const { cls, icon } = alertMeta(n);

    const dlText = ev.deadline
      ? (n < 0
          ? `Exhibit deadline passed ${Math.abs(n)} days ago`
          : n === 0
            ? 'Exhibit deadline is TODAY'
            : `${n} day${n === 1 ? '' : 's'} until exhibit deadline`)
      : '';

    const taskRows = sortTasks(evTasks).map(t => {
      const dc = dlClass(t.due);
      return `
        <div class="task-row">
          <div class="chk ${t.done ? 'done' : ''}" onclick="toggleDone(${t.id})" role="checkbox" aria-checked="${t.done}" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')toggleDone(${t.id})">${t.done ? '✓' : ''}</div>
          <div class="pdot p-${t.priority}" title="${t.priority} priority"></div>
          <span class="t-name ${t.done ? 'done' : ''}">${escHtml(t.name)}</span>
          <span class="t-type">${escHtml(t.type)}</span>
          <span class="t-due ${dc}">${dlLabel(t.due)}</span>
          <button class="delete-btn" onclick="deleteTask(${t.id})" title="Remove task"><i class="ti ti-x" aria-hidden="true"></i></button>
        </div>`;
    }).join('');

    return `
      <div class="card ${borderClass(ev.deadline)}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap">
          <div>
            <div class="event-name">${escHtml(ev.name)}</div>
            <div class="event-meta">${[ev.dates, ev.venue].filter(Boolean).map(escHtml).join(' · ')}</div>
            ${ev.notes ? `<div class="event-meta" style="font-style:italic;margin-top:2px">${escHtml(ev.notes)}</div>` : ''}
          </div>
          <div class="ev-actions">
            <button class="add-btn" style="font-size:12px;padding:3px 9px" onclick="openAddTaskForEvent(${ev.id})">
              <i class="ti ti-plus" aria-hidden="true"></i> Task
            </button>
            <button class="delete-btn" onclick="deleteEvent(${ev.id})" title="Delete event">
              <i class="ti ti-trash" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        ${ev.deadline ? `
          <div class="deadline-alert ${cls}">
            <i class="ti ${icon}" aria-hidden="true" style="font-size:13px;flex-shrink:0"></i>
            <span>${dlText} — ${fmtDate(ev.deadline)}</span>
          </div>` : ''}
        <div class="prog-bar">
          <div class="prog-labels"><span>${doneCount}/${evTasks.length} tasks complete</span><span>${pct}%</span></div>
          <div class="prog-track"><div class="prog-fill ${fillClass(pct)}" style="width:${pct}%"></div></div>
        </div>
        <button class="expand-btn" onclick="expandedEv[${ev.id}]=!expandedEv[${ev.id}];renderDash()">
          <i class="ti ti-${exp ? 'chevron-up' : 'chevron-down'}" aria-hidden="true"></i>
          ${exp ? 'Hide tasks' : 'Show tasks'} (${evTasks.length})
        </button>
        ${exp ? `<div class="task-list">${taskRows || '<div style="font-size:13px;color:var(--text2);padding:6px 0">No tasks yet for this event.</div>'}</div>` : ''}
      </div>`;
  }).join('');
}

// ---- Render: All Tasks ----------------------------------------------------

function renderTasks() {
  const types = ['all', ...new Set(tasks.map(t => t.type))];
  document.getElementById('taskChips').innerHTML = types.map(tp =>
    `<button class="chip ${taskFilter === tp ? 'active' : ''}" onclick="taskFilter='${tp}';renderTasks()">${tp === 'all' ? 'All tasks' : escHtml(tp)}</button>`
  ).join('');

  populateEventSelect('tEvent');

  let filtered = taskFilter === 'all' ? tasks : tasks.filter(t => t.type === taskFilter);
  filtered = [...filtered].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority])
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    return (a.due || '9999').localeCompare(b.due || '9999');
  });

  document.getElementById('taskRows').innerHTML = filtered.length
    ? filtered.map(t => {
        const ev = events.find(e => e.id === t.eventId);
        const dc = dlClass(t.due);
        return `
          <div class="task-row" style="padding:8px 0">
            <div class="chk ${t.done ? 'done' : ''}" onclick="toggleDone(${t.id})" role="checkbox" aria-checked="${t.done}" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')toggleDone(${t.id})">${t.done ? '✓' : ''}</div>
            <div class="pdot p-${t.priority}" title="${t.priority} priority"></div>
            <span class="t-name ${t.done ? 'done' : ''}" style="flex:1">${escHtml(t.name)}</span>
            <span class="t-type">${escHtml(t.type)}</span>
            <span style="font-size:12px;color:var(--text2);flex-shrink:0;margin:0 10px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ev ? escHtml(ev.name) : '—'}</span>
            <span class="t-due ${dc}">${dlLabel(t.due)}</span>
            <button class="delete-btn" onclick="deleteTask(${t.id})"><i class="ti ti-x" aria-hidden="true"></i></button>
          </div>`;
      }).join('')
    : '<div class="empty">No tasks yet. Add one above.</div>';
}

// ---- Render: Designer Brief -----------------------------------------------

function renderBrief() {
  const evSorted = [...events].sort((a, b) =>
    (a.deadline || '9999').localeCompare(b.deadline || '9999')
  );

  if (!evSorted.length) {
    document.getElementById('briefContent').innerHTML =
      '<div class="empty">Add events and tasks to generate a brief.</div>';
    return;
  }

  document.getElementById('briefContent').innerHTML = evSorted.map(ev => {
    const evTasks = tasks.filter(t => t.eventId === ev.id && !t.done);
    const n       = daysLeft(ev.deadline);
    const dlText  = n === null ? '' : n < 0
      ? `⚠️ Deadline passed ${Math.abs(n)}d ago`
      : n === 0 ? '🚨 Deadline TODAY'
      : `📅 ${n} day${n === 1 ? '' : 's'} to exhibit deadline`;

    const high = evTasks.filter(t => t.priority === 'high').sort(byDue);
    const med  = evTasks.filter(t => t.priority === 'med').sort(byDue);
    const low  = evTasks.filter(t => t.priority === 'low').sort(byDue);

    const section = (list, label, cls, badgeCls) => list.length ? `
      <div class="priority-section">
        <div class="ps-title ${cls}">${label}</div>
        ${list.map(t => `
          <div class="ps-item">
            <span class="badge ${badgeCls}">${escHtml(t.type)}</span>
            <span style="flex:1">${escHtml(t.name)}</span>
            <span style="font-size:12px;color:var(--text2)">${t.due ? 'Due ' + fmtDate(t.due) : ''}</span>
            ${t.notes ? `<span style="font-size:11px;color:var(--text2);font-style:italic" title="${escAttr(t.notes)}"><i class="ti ti-notes" aria-hidden="true"></i></span>` : ''}
          </div>`).join('')}
      </div>` : '';

    return `
      <div class="designer-brief">
        <div class="brief-header">
          <span><i class="ti ti-calendar-event" aria-hidden="true" style="font-size:14px;vertical-align:-2px;margin-right:5px"></i>${escHtml(ev.name)}</span>
          <span class="badge b-gray" style="font-weight:400">${ev.dates ? escHtml(ev.dates) : 'Dates TBD'}</span>
        </div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:8px">${[ev.venue, dlText].filter(Boolean).join(' · ')}</div>
        ${!evTasks.length
          ? '<div style="font-size:13px;color:var(--text2);padding:4px 0">All tasks complete or no tasks added.</div>'
          : section(high, '🔴 High priority — do first', 'high', 'b-red') +
            section(med,  '🟡 Medium priority',           'medium', 'b-amber') +
            section(low,  '🟢 Lower priority',            'low',  'b-green')}
      </div>`;
  }).join('');
}

function byDue(a, b) {
  return (a.due || '9999').localeCompare(b.due || '9999');
}

// ---- Copy brief as plain text ---------------------------------------------

function copyBrief() {
  const evSorted = [...events].sort((a, b) =>
    (a.deadline || '9999').localeCompare(b.deadline || '9999')
  );

  let text = 'TRADE SHOW GRAPHICS — DESIGNER BRIEF\n' + '='.repeat(40) + '\n\n';

  evSorted.forEach(ev => {
    const evTasks = tasks.filter(t => t.eventId === ev.id && !t.done);
    const n       = daysLeft(ev.deadline);
    const dlText  = n === null ? '' : n < 0
      ? `DEADLINE PASSED ${Math.abs(n)} DAYS AGO`
      : `${n} days to exhibit deadline (${fmtDate(ev.deadline)})`;

    text += `EVENT: ${ev.name}\n`;
    if (ev.dates)    text += `Dates:  ${ev.dates}\n`;
    if (ev.venue)    text += `Venue:  ${ev.venue}\n`;
    if (dlText)      text += `${dlText}\n`;
    text += '\n';

    const high = evTasks.filter(t => t.priority === 'high').sort(byDue);
    const med  = evTasks.filter(t => t.priority === 'med').sort(byDue);
    const low  = evTasks.filter(t => t.priority === 'low').sort(byDue);

    const printSection = (list, label) => {
      if (!list.length) return;
      text += `${label}:\n`;
      list.forEach(t => {
        text += `  • [${t.type}] ${t.name}`;
        if (t.due)   text += ` — Due ${fmtDate(t.due)}`;
        if (t.notes) text += ` | Notes: ${t.notes}`;
        text += '\n';
      });
      text += '\n';
    };

    printSection(high, 'HIGH PRIORITY');
    printSection(med,  'MEDIUM PRIORITY');
    printSection(low,  'LOWER PRIORITY');

    if (!evTasks.length) text += 'All tasks complete.\n\n';
    text += '-'.repeat(40) + '\n\n';
  });

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.copy-btn');
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i> Copied!';
    setTimeout(() => { btn.innerHTML = orig; }, 2000);
  }).catch(() => {
    alert('Could not copy to clipboard. Please copy manually from the brief below.');
  });
}

// ---- XSS helpers ----------------------------------------------------------

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

function escAttr(str) { return escHtml(str); }

// ---- Boot -----------------------------------------------------------------

load();
renderDash();
