const form = document.getElementById('ticket-form');
const message = document.getElementById('message');
const submitBtn = document.getElementById('submit-btn');
const rows = document.getElementById('ticket-rows');
const stats = document.getElementById('stats');

function showMessage(text, type) {
  message.textContent = text;
  message.className = type;
}

// Builds a table cell using textContent, so user text is never treated as HTML.
function makeCell(text, className) {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

async function loadTickets() {
  const res = await fetch('/api/tickets');
  const tickets = await res.json();
  rows.innerHTML = '';

  if (tickets.length === 0) {
    const tr = document.createElement('tr');
    const td = makeCell('No tickets yet. Submit the first one above.');
    td.colSpan = 6;
    tr.appendChild(td);
    rows.appendChild(tr);
    return;
  }

  tickets.forEach((t) => {
    const tr = document.createElement('tr');
    tr.appendChild(makeCell(t.id));
    tr.appendChild(makeCell(t.user_name));
    tr.appendChild(makeCell(t.title));
    tr.appendChild(t.category ? makeCell(t.category) : makeCell('Uncategorised', 'uncategorised'));
    tr.appendChild(makeCell(t.priority, 'priority ' + t.priority));
    tr.appendChild(makeCell(t.summary));
    rows.appendChild(tr);
  });
}

async function loadStats() {
  const res = await fetch('/api/tickets/stats');
  const data = await res.json();
  stats.innerHTML = '';
  data.forEach((s) => {
    const div = document.createElement('div');
    div.className = 'stat';
    div.textContent = s.category;
    const count = document.createElement('strong');
    count.textContent = s.total;
    div.appendChild(count);
    stats.appendChild(div);
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  submitBtn.disabled = true;
  showMessage('Triaging your ticket with AI...', '');

  const body = {
    name: document.getElementById('name').value,
    title: document.getElementById('title').value,
    description: document.getElementById('description').value
  };

  try {
    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.error, 'error');
    } else {
      showMessage(`Ticket #${data.id} saved as ${data.priority} priority.`, 'ok');
      form.reset();
      await Promise.all([loadTickets(), loadStats()]);
    }
  } catch {
    showMessage('Could not reach the server. Is it running?', 'error');
  } finally {
    submitBtn.disabled = false;
  }
});

loadTickets();
loadStats();
