/* ============================================
   GASTOAPP — Control de gastos personal
   ============================================ */

// ---- STATE ----
let expenses = [];
let currentMonth = new Date();
let editingId = null;

// ---- DOM REFS ----
const $ = id => document.getElementById(id);

const currentMonthEl = $('currentMonth');
const balanceDisplay = $('balanceDisplay');
const headerBalance = $('headerBalance');
const incomeDisplay = $('incomeDisplay');
const expenseDisplay = $('expenseDisplay');
const sIncome = $('sIncome');
const sExpense = $('sExpense');
const sBalance = $('sBalance');
const categoriesBreakdown = $('categoriesBreakdown');
const expensesList = $('expensesList');
const modalOverlay = $('modalOverlay');
const modalTitle = $('modalTitle');
const expenseForm = $('expenseForm');
const eDesc = $('eDesc');
const eAmount = $('eAmount');
const eDate = $('eDate');
const eCategory = $('eCategory');
const eType = $('eType');
const editingIdInput = $('editingId');
const saveBtn = $('saveBtn');
const searchInput = $('searchInput');
const closeModal = $('closeModal');
const fabAdd = $('fabAdd');
const typeExpenseBtn = $('typeExpenseBtn');
const typeIncomeBtn = $('typeIncomeBtn');

// ---- HELPERS ----
function formatCurrency(n) {
  return '$' + Number(n).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ---- CATEGORIES ----
const CATEGORIES = {
  expense: [
    { value: 'Comida', icon: '🍔', name: 'Comida' },
    { value: 'Transporte', icon: '🚗', name: 'Transporte' },
    { value: 'Salud', icon: '💊', name: 'Salud' },
    { value: 'Entretenimiento', icon: '🎬', name: 'Entretenimiento' },
    { value: 'Hogar', icon: '🏠', name: 'Hogar' },
    { value: 'Educación', icon: '📚', name: 'Educación' },
    { value: 'Ropa', icon: '👕', name: 'Ropa' },
    { value: 'Suscripciones', icon: '📡', name: 'Suscripciones' },
    { value: 'Otro', icon: '📦', name: 'Otro' },
  ],
  income: [
    { value: 'Salario', icon: '💼', name: 'Salario' },
    { value: 'Freelance', icon: '💻', name: 'Freelance' },
    { value: 'Inversiones', icon: '📈', name: 'Inversiones' },
    { value: 'Ventas', icon: '🏪', name: 'Ventas' },
    { value: 'Regalo', icon: '🎁', name: 'Regalo' },
    { value: 'Reembolso', icon: '🔄', name: 'Reembolso' },
    { value: 'Otro', icon: '📦', name: 'Otro' },
  ],
};

function getCatIcon(cat) {
  for (const group of Object.values(CATEGORIES)) {
    const found = group.find(c => c.value === cat);
    if (found) return found.icon;
  }
  return '📦';
}

function populateCategorySelect(type, selectedValue) {
  eCategory.innerHTML = '';
  const cats = CATEGORIES[type] || CATEGORIES.expense;
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.value;
    opt.textContent = c.icon + ' ' + c.name;
    if (c.value === selectedValue) opt.selected = true;
    eCategory.appendChild(opt);
  });
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
  const totalIncome = filtered.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0);
  const totalExpense = filtered.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0);
  const balance = totalIncome - totalExpense;

  balanceDisplay.textContent = formatCurrency(Math.abs(balance));
  balanceDisplay.className = 'balance-value ' + (balance > 0 ? 'balance-positive' : balance < 0 ? 'balance-negative' : 'balance-zero');
  if (balance < 0) balanceDisplay.textContent = '-' + balanceDisplay.textContent;

  incomeDisplay.textContent = '+' + formatCurrency(totalIncome);
  expenseDisplay.textContent = '-' + formatCurrency(totalExpense);
}

function renderSummary() {
  const filtered = getFilteredExpenses();
  const totalIncome = filtered.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0);
  const totalExpense = filtered.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0);
  const balance = totalIncome - totalExpense;

  sIncome.textContent = formatCurrency(totalIncome);
  sExpense.textContent = formatCurrency(totalExpense);
  sBalance.textContent = formatCurrency(Math.abs(balance));
  sBalance.style.color = balance >= 0 ? 'var(--success)' : 'var(--danger)';
  if (balance < 0) sBalance.textContent = '-' + sBalance.textContent;
}

function renderCategories() {
  const filtered = getFilteredExpenses();

  if (!filtered.length) {
    categoriesBreakdown.innerHTML = '<div class="empty-state"><span class="empty-icon">📊</span><p>Sin movimientos este mes</p></div>';
    return;
  }

  const expenseItems = filtered.filter(e => e.type === 'expense');
  const incomeItems = filtered.filter(e => e.type === 'income');
  const totalExpense = expenseItems.reduce((s, e) => s + Number(e.amount), 0);
  const totalIncome = incomeItems.reduce((s, e) => s + Number(e.amount), 0);

  function renderCatGroup(items, total, type) {
    if (!items.length) return '';
    const cats = {};
    items.forEach(e => {
      cats[e.category] = (cats[e.category] || 0) + Number(e.amount);
    });
    const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const label = type === 'expense' ? 'Gastos' : 'Ingresos';

    return `
      <div class="categories-section-title">${label}</div>
      ${sorted.map(([cat, amt]) => {
        const pct = total > 0 ? (amt / total) * 100 : 0;
        const icon = getCatIcon(cat);
        return `
          <div class="category-item">
            <div class="category-icon">${icon}</div>
            <div class="category-info">
              <div class="category-name">${cat}</div>
              <div class="category-bar-bg">
                <div class="category-bar-fill ${type === 'expense' ? 'is-expense' : 'is-income'}" style="width:${pct}%"></div>
              </div>
            </div>
            <div class="category-amount">${formatCurrency(amt)}</div>
            <div class="category-pct">${pct.toFixed(1)}%</div>
          </div>
        `;
      }).join('')}
    `;
  }

  categoriesBreakdown.innerHTML = renderCatGroup(expenseItems, totalExpense, 'expense') + renderCatGroup(incomeItems, totalIncome, 'income');
}

function renderExpenses() {
  const filtered = getFilteredExpenses();

  if (!filtered.length) {
    expensesList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📭</span>
        <p>No hay movimientos</p>
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
    const dayIncome = items.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0);
    const dayExpense = items.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0);

    return `
      <div class="expense-date-group" style="margin-top:${date === sortedDates[0] ? '0' : '16px'}">
        <div style="display:flex;justify-content:space-between;padding:4px 2px 6px;font-size:0.8rem;">
          <span style="font-weight:600;">${formattedDate}</span>
          <span style="color:var(--text-secondary);font-weight:600;">${formatCurrency(dayIncome - dayExpense)}</span>
        </div>
        ${items.map(e => {
          const isExpense = e.type === 'expense';
          const icon = getCatIcon(e.category);
          return `
          <div class="expense-item">
            <div class="expense-cat-icon">${icon}</div>
            <div class="expense-info">
              <div class="expense-desc">${escapeHtml(e.desc)}</div>
              <div class="expense-meta">${e.category} · ${isExpense ? 'Gasto' : 'Ingreso'}</div>
            </div>
            <div class="expense-amount ${isExpense ? 'is-expense' : 'is-income'}">${isExpense ? '-' : '+'}${formatCurrency(e.amount)}</div>
            <div class="expense-actions">
              <button class="btn-icon-sm" onclick="editExpense('${e.id}')" title="Editar">✏️</button>
              <button class="btn-icon-sm danger" onclick="deleteExpense('${e.id}')" title="Eliminar">🗑️</button>
            </div>
          </div>
        `}).join('')}
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
function addExpense(desc, amount, date, category, type) {
  const expense = {
    id: 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    desc: desc.trim(),
    amount: Number(amount),
    date: date,
    category: category,
    type: type,
    timestamp: Date.now()
  };
  expenses.push(expense);
  saveExpenses();
  renderAll();
  return expense;
}

function updateExpense(id, desc, amount, date, category, type) {
  const idx = expenses.findIndex(e => e.id === id);
  if (idx === -1) return;
  expenses[idx] = { ...expenses[idx], desc: desc.trim(), amount: Number(amount), date, category, type };
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
  modalTitle.textContent = 'Editar movimiento';
  eDesc.value = e.desc;
  eAmount.value = e.amount;
  eDate.value = e.date;
  eType.value = e.type;
  // Update toggle buttons
  typeExpenseBtn.classList.toggle('active', e.type === 'expense');
  typeIncomeBtn.classList.toggle('active', e.type === 'income');
  populateCategorySelect(e.type, e.category);
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
  eType.value = 'expense';
  typeExpenseBtn.classList.add('active');
  typeIncomeBtn.classList.remove('active');
  populateCategorySelect('expense', 'Comida');
  modalTitle.textContent = 'Nuevo movimiento';
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

// Type toggle
function setType(type) {
  eType.value = type;
  typeExpenseBtn.classList.toggle('active', type === 'expense');
  typeIncomeBtn.classList.toggle('active', type === 'income');
  // Update categories when type changes
  const currentCat = eCategory.value;
  populateCategorySelect(type, currentCat);
}

typeExpenseBtn.addEventListener('click', () => setType('expense'));
typeIncomeBtn.addEventListener('click', () => setType('income'));

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
  const type = eType.value;

  if (!desc || !amount || !date || !category || !type) {
    alert('Completa todos los campos');
    return;
  }

  if (amount <= 0) {
    alert('El monto debe ser mayor a 0');
    return;
  }

  const editId = editingIdInput.value;

  if (editId) {
    updateExpense(editId, desc, amount, date, category, type);
  } else {
    addExpense(desc, amount, date, category, type);
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
