/* ============================================
   GASTOAPP — Control de gastos personal
   ============================================ */

// ---- STATE ----
let expenses = [];
let currentMonth = new Date();
let editingId = null;

// ---- DOM REFS ----
const $ = id => document.getElementById(id);

const totalDisplay = $('totalDisplay');
const countDisplay = $('countDisplay');
const currentMonthEl = $('currentMonth');
const sTotal = $('sTotal');
const sAvg = $('sAvg');
const sMax = $('sMax');
const categoriesBreakdown = $('categoriesBreakdown');
const expensesList = $('expensesList');
const modalOverlay = $('modalOverlay');
const modalTitle = $('modalTitle');
const expenseForm = $('expenseForm');
const eDesc = $('eDesc');
const eAmount = $('eAmount');
const eDate = $('eDate');
const eCategory = $('eCategory');
const editingIdInput = $('editingId');
const saveBtn = $('saveBtn');
const searchInput = $('searchInput');
const closeModal = $('closeModal');
const fabAdd = $('fabAdd');

// ---- HELPERS ----
function formatCurrency(n) {
  return '$' + Number(n).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(date) {
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${months[date.getMonth()]} ${date.getMonth() === currentMonth.getMonth() ? '' : date.getFullYear()}`.trim();
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// ---- LOCAL STORAGE ----
function loadExpenses() {
  try {
    expenses = JSON.parse(localStorage.getItem('gastoapp_expenses')) || [];
  } catch {
    expenses = [];
  }
}

function saveExpenses() {
  localStorage.setItem('gastoapp_expenses', JSON.stringify(expenses));
}

// ---- FILTERS ----
function getFilteredExpenses() {
  const prefix = getMonthKey(currentMonth);
  const q = searchInput.value.toLowerCase().trim();
  return expenses.filter(e => {
    if (!e.date.startsWith(prefix)) return false;
    if (q && !e.desc.toLowerCase().includes(q)) return false;
    return true;
  });
}

// ---- RENDER ----

function renderHeader() {
  const filtered = getFilteredExpenses();
  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);
  totalDisplay.textContent = formatCurrency(total);
  countDisplay.textContent = `${filtered.length} gasto${filtered.length !== 1 ? 's' : ''} este mes`;
}

function renderSummary() {
  const filtered = getFilteredExpenses();
  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const count = filtered.length;

  sTotal.textContent = formatCurrency(total);

  // Average per day based on days in month that have expenses, or all days with expenses
  const daysWithExpenses = new Set(filtered.map(e => e.date)).size;
  const actualDays = daysWithExpenses || 1;
  sAvg.textContent = formatCurrency(total / actualDays);

  // Max expense
  const maxAmt = filtered.length ? Math.max(...filtered.map(e => Number(e.amount))) : 0;
  sMax.textContent = formatCurrency(maxAmt);
}

function renderCategories() {
  const filtered = getFilteredExpenses();
  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);

  if (!filtered.length) {
    categoriesBreakdown.innerHTML = '<div class="empty-state"><span class="empty-icon">📊</span><p>Sin gastos este mes</p></div>';
    return;
  }

  // Group by category
  const cats = {};
  const catIcons = {
    Comida: '🍔', Transporte: '🚗', Salud: '💊', Entretenimiento: '🎬',
    Hogar: '🏠', Educación: '📚', Ropa: '👕', Suscripciones: '📡', Otro: '📦'
  };
  filtered.forEach(e => {
    cats[e.category] = (cats[e.category] || 0) + Number(e.amount);
  });

  const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);

  categoriesBreakdown.innerHTML = sorted.map(([cat, amt]) => {
    const pct = total > 0 ? (amt / total) * 100 : 0;
    const icon = catIcons[cat] || '📦';
    return `
      <div class="category-item">
        <div class="category-icon">${icon}</div>
        <div class="category-info">
          <div class="category-name">${cat}</div>
          <div class="category-bar-bg">
            <div class="category-bar-fill" style="width:${pct}%"></div>
          </div>
        </div>
        <div class="category-amount">${formatCurrency(amt)}</div>
        <div class="category-pct">${pct.toFixed(1)}%</div>
      </div>
    `;
  }).join('');
}

function renderExpenses() {
  const filtered = getFilteredExpenses();
  const catIcons = {
    Comida: '🍔', Transporte: '🚗', Salud: '💊', Entretenimiento: '🎬',
    Hogar: '🏠', Educación: '📚', Ropa: '👕', Suscripciones: '📡', Otro: '📦'
  };

  if (!filtered.length) {
    expensesList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📭</span>
        <p>No hay gastos</p>
        <p class="empty-sub" style="font-size:0.8rem;color:var(--text-muted);">Toca + para agregar</p>
      </div>
    `;
    return;
  }

  // Group by date descending
  const groups = {};
  filtered.forEach(e => {
    if (!groups[e.date]) groups[e.date] = [];
    groups[e.date].push(e);
  });

  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  expensesList.innerHTML = sortedDates.map(date => {
    const items = groups[date].sort((a, b) => b.timestamp - a.timestamp);
    const dateParts = date.split('-');
    const d = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const dayName = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.getDay()];
    const formattedDate = `${dayName} ${dateParts[2]} ${['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][Number(dateParts[1])-1]}`;
    const dayTotal = items.reduce((s, e) => s + Number(e.amount), 0);

    return `
      <div class="expense-date-group" style="margin-top:${date === sortedDates[0] ? '0' : '16px'}">
        <div style="display:flex;justify-content:space-between;padding:4px 2px 6px;font-size:0.8rem;">
          <span style="font-weight:600;">${formattedDate}</span>
          <span style="color:var(--text-muted);">${formatCurrency(dayTotal)}</span>
        </div>
        ${items.map(e => `
          <div class="expense-item">
            <div class="expense-cat-icon">${catIcons[e.category] || '📦'}</div>
            <div class="expense-info">
              <div class="expense-desc">${escapeHtml(e.desc)}</div>
              <div class="expense-meta">${e.category}</div>
            </div>
            <div class="expense-amount">-${formatCurrency(e.amount)}</div>
            <div class="expense-actions">
              <button class="btn-icon-sm" onclick="editExpense('${e.id}')" title="Editar">✏️</button>
              <button class="btn-icon-sm danger" onclick="deleteExpense('${e.id}')" title="Eliminar">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderMonth() {
  currentMonthEl.textContent = formatMonthLabel(currentMonth);
}

function renderAll() {
  renderMonth();
  renderHeader();
  renderSummary();
  renderCategories();
  renderExpenses();
}

// ---- CRUD ----
function addExpense(desc, amount, date, category) {
  const expense = {
    id: 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    desc: desc.trim(),
    amount: Number(amount),
    date: date,
    category: category,
    timestamp: Date.now()
  };
  expenses.push(expense);
  saveExpenses();
  renderAll();
  return expense;
}

function updateExpense(id, desc, amount, date, category) {
  const idx = expenses.findIndex(e => e.id === id);
  if (idx === -1) return;
  expenses[idx] = { ...expenses[idx], desc: desc.trim(), amount: Number(amount), date, category };
  saveExpenses();
  renderAll();
}

function deleteExpense(id) {
  if (!confirm('¿Eliminar este gasto?')) return;
  expenses = expenses.filter(e => e.id !== id);
  saveExpenses();
  renderAll();
}

function editExpense(id) {
  const e = expenses.find(exp => exp.id === id);
  if (!e) return;
  editingId = e.id;
  modalTitle.textContent = 'Editar gasto';
  eDesc.value = e.desc;
  eAmount.value = e.amount;
  eDate.value = e.date;
  eCategory.value = e.category;
  editingIdInput.value = e.id;
  saveBtn.textContent = 'Actualizar';
  openModal();
}

function resetForm() {
  editingId = null;
  editingIdInput.value = '';
  eDesc.value = '';
  eAmount.value = '';
  eDate.value = todayStr();
  eCategory.value = 'Comida';
  modalTitle.textContent = 'Nuevo gasto';
  saveBtn.textContent = 'Guardar';
}

function openModal() {
  modalOverlay.classList.remove('hidden');
}

function closeModalFn() {
  modalOverlay.classList.add('hidden');
  resetForm();
}

// ---- EVENTS ----

// Modal
fabAdd.addEventListener('click', () => {
  resetForm();
  eDate.value = todayStr();
  openModal();
});

closeModal.addEventListener('click', closeModalFn);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModalFn();
});

// Form submit
expenseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const desc = eDesc.value.trim();
  const amount = Number(eAmount.value);
  const date = eDate.value;
  const category = eCategory.value;

  if (!desc || !amount || !date || !category) {
    alert('Completa todos los campos');
    return;
  }

  if (amount <= 0) {
    alert('El monto debe ser mayor a 0');
    return;
  }

  const editId = editingIdInput.value;

  if (editId) {
    updateExpense(editId, desc, amount, date, category);
  } else {
    addExpense(desc, amount, date, category);
  }

  closeModalFn();
});

// Search
searchInput.addEventListener('input', renderAll);

// Month navigation
$('prevMonth').addEventListener('click', () => {
  currentMonth.setMonth(currentMonth.getMonth() - 1);
  renderAll();
});

$('nextMonth').addEventListener('click', () => {
  currentMonth.setMonth(currentMonth.getMonth() + 1);
  renderAll();
});

// Keyboard shortcut: Escape to close modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) {
    closeModalFn();
  }
});

// ---- INIT ----
loadExpenses();
resetForm();
renderAll();
