/* ============================================
   GASTOAPP v2 — Native Android feel
   ============================================ */

// =============================================
// 1. SNACKBAR SYSTEM
// =============================================
const Snackbar = {
  container: null,
  queue: [],
  showing: false,

  init() {
    this.container = document.getElementById('snackbarContainer');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'snackbarContainer';
      this.container.className = 'snackbar-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, action = null, duration = 4000) {
    this.queue.push({ message, action, duration });
    if (!this.showing) this._next();
  },

  _next() {
    if (!this.queue.length) { this.showing = false; return; }
    this.showing = true;
    const { message, action, duration } = this.queue.shift();

    const el = document.createElement('div');
    el.className = 'snackbar';
    el.innerHTML = `<span class="snackbar-message">${this._escHtml(message)}</span>
      ${action ? `<button class="snackbar-action ripple" data-action="${this._escHtml(action.label)}">${this._escHtml(action.label)}</button>` : ''}`;
    this.container.appendChild(el);

    if (action) {
      const btn = el.querySelector('.snackbar-action');
      btn.addEventListener('click', () => {
        action.cb();
        this._dismiss(el);
      });
    }

    // Auto dismiss
    this._timer = setTimeout(() => this._dismiss(el), duration);
    el.addEventListener('touchstart', () => clearTimeout(this._timer));
    el.addEventListener('mousedown', () => clearTimeout(this._timer));
  },

  _dismiss(el) {
    clearTimeout(this._timer);
    if (!el || !el.parentNode) return;
    el.classList.add('removing');
    el.addEventListener('animationend', () => {
      el.remove();
      this._next();
    }, { once: true });
  },

  _escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }
};

// =============================================
// 2. RIPPLE EFFECT
// =============================================
const Ripple = {
  init(scope = document) {
    scope.addEventListener('click', (e) => {
      const target = e.target.closest('.ripple, button, .btn, .btn-icon-sm, .btn-month, .type-btn, .expense-item, .summary-card, .category-item, .fab, .btn-header');
      if (!target || target.closest('.expense-actions, .context-menu, .snackbar')) return;
      if (target.classList.contains('no-ripple')) return;
      this._create(e, target);
    });
  },

  _create(e, element) {
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.2;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || rect.left + rect.width / 2;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || rect.top + rect.height / 2;
    const x = clientX - rect.left - size / 2;
    const y = clientY - rect.top - size / 2;

    const el = document.createElement('span');
    el.className = 'ripple-el';
    el.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
    element.style.position = element.style.position || (getComputedStyle(element).position === 'static' ? 'relative' : getComputedStyle(element).position);
    element.style.overflow = element.style.overflow || 'hidden';
    element.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }
};

// =============================================
// 3. ANIMATED COUNTER
// =============================================
function animateNumber(el, target, opts = {}) {
  const { prefix = '', suffix = '', duration = 500, decimals = 0 } = opts;
  const current = parseFloat(el.textContent.replace(/[^0-9.-]/g, '')) || 0;
  const start = current;
  const diff = target - start;
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const val = start + diff * eased;
    el.textContent = prefix + val.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// =============================================
// 4. SWIPE TO DELETE
// =============================================
const SwipeToDelete = {
  init() {
    document.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: true });
    document.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this._onTouchEnd.bind(this), { passive: true });
  },

  _state: { el: null, startX: 0, currentX: 0, swiping: false, id: null },

  _onTouchStart(e) {
    const item = e.target.closest('.expense-swipe-container');
    if (!item) return;
    // Don't swipe on action buttons
    if (e.target.closest('.expense-actions, .btn-icon-sm')) return;

    this._state.el = item;
    this._state.startX = e.touches[0].clientX;
    this._state.currentX = e.touches[0].clientX;
    this._state.swiping = false;
    this._state.id = item.dataset.id;
  },

  _onTouchMove(e) {
    if (!this._state.el) return;
    this._state.currentX = e.touches[0].clientX;
    const dx = this._state.currentX - this._state.startX;

    if (Math.abs(dx) > 5) {
      this._state.swiping = true;
    }
    if (!this._state.swiping) return;

    // Only allow left swipe (negative dx)
    if (dx > 0) {
      this._state.el.querySelector('.expense-item').style.transform = `translateX(${Math.min(dx * 0.3, 0)}px)`;
      return;
    }

    // Clamp to max -80px
    const move = Math.max(dx, -80);
    this._state.el.querySelector('.expense-item').style.transform = `translateX(${move}px)`;
    e.preventDefault();
  },

  _onTouchEnd() {
    if (!this._state.el || !this._state.swiping) {
      this._reset();
      return;
    }

    const dx = this._state.currentX - this._state.startX;
    const item = this._state.el;
    const id = this._state.id;

    if (dx < -40) {
      // Threshold crossed — delete
      const expenseItem = item.querySelector('.expense-item');
      expenseItem.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
      expenseItem.style.transform = 'translateX(-100%)';
      expenseItem.style.opacity = '0';

      setTimeout(() => {
        this._deleteWithUndo(id);
      }, 200);
    } else {
      // Snap back
      const expenseItem = item.querySelector('.expense-item');
      expenseItem.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)';
      expenseItem.style.transform = '';
      setTimeout(() => {
        if (expenseItem) expenseItem.style.transition = '';
      }, 250);
    }
    this._reset();
  },

  _deleteWithUndo(id) {
    const idx = expenses.findIndex(e => e.id === id);
    if (idx === -1) return;
    const deleted = expenses.splice(idx, 1)[0];
    saveExpenses();
    renderAll();

    Snackbar.show('Movimiento eliminado', {
      label: 'Deshacer',
      cb: () => {
        expenses.splice(idx, 0, deleted);
        saveExpenses();
        renderAll();
        Snackbar.show('Movimiento restaurado');
      }
    }, 5000);
  },

  _reset() {
    this._state.el = null;
    this._state.startX = 0;
    this._state.currentX = 0;
    this._state.swiping = false;
    this._state.id = null;
  }
};

// =============================================
// 5. MONTH SWIPE GESTURE
// =============================================
const MonthSwipe = {
  init() {
    const list = document.getElementById('expensesList');
    if (!list) return;

    let startX = 0, startY = 0, swiping = false;

    list.addEventListener('touchstart', (e) => {
      if (e.target.closest('.expense-swipe-container')) return; // Let SwipeToDelete handle it
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      swiping = false;
    }, { passive: true });

    list.addEventListener('touchmove', (e) => {
      if (e.target.closest('.expense-swipe-container')) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20) {
        swiping = true;
        e.preventDefault();
      }
    }, { passive: false });

    list.addEventListener('touchend', (e) => {
      if (!swiping) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 60) {
        if (dx > 0) {
          currentMonth.setMonth(currentMonth.getMonth() - 1);
        } else {
          currentMonth.setMonth(currentMonth.getMonth() + 1);
        }
        renderAll();
        // Vibration feedback if available
        if (navigator.vibrate) navigator.vibrate(10);
      }
    }, { passive: true });
  }
};

// =============================================
// 6. PULL TO REFRESH
// =============================================
const PullToRefresh = {
  _state: { startY: 0, pulling: false, moved: false },
  _indicator: null,

  init() {
    this._indicator = document.getElementById('pullIndicator');
    if (!this._indicator) return;

    document.addEventListener('touchstart', (e) => {
      if (window.scrollY > 0) return;
      if (e.target.closest('.modal-overlay, .modal, .fab')) return;
      this._state.startY = e.touches[0].clientY;
      this._state.pulling = true;
      this._state.moved = false;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!this._state.pulling || window.scrollY > 0) return;
      const dy = e.touches[0].clientY - this._state.startY;
      if (dy > 0) {
        this._state.moved = true;
        const pull = Math.min(dy * 0.4, 120);
        this._indicator.style.height = pull + 'px';
        this._indicator.classList.toggle('visible', pull > 10);
      }
    }, { passive: true });

    document.addEventListener('touchend', () => {
      if (!this._state.pulling || !this._state.moved) {
        this._state.pulling = false;
        return;
      }
      const height = parseInt(this._indicator.style.height) || 0;
      this._indicator.style.height = '0';
      this._indicator.classList.remove('visible');
      this._state.pulling = false;

      if (height > 50) {
        this._indicator.classList.add('refreshing');
        this._indicator.style.height = '48px';
        this._indicator.classList.add('visible');
        // Refresh: re-sort, re-render
        loadExpenses();
        renderAll();
        setTimeout(() => {
          this._indicator.classList.remove('refreshing', 'visible');
          this._indicator.style.height = '0';
          if (navigator.vibrate) navigator.vibrate(15);
        }, 400);
      }
    }, { passive: true });
  }
};

// =============================================
// 7. LONG PRESS → CONTEXT MENU
// =============================================
const ContextMenu = {
  _timer: null,
  _menu: null,

  init() {
    document.addEventListener('contextmenu', (e) => {
      const item = e.target.closest('.expense-item');
      if (item) {
        e.preventDefault();
        const id = item.closest('.expense-swipe-container')?.dataset?.id;
        if (id) this._show(e.clientX, e.clientY, id);
      }
    });

    // Long press on expense items
    let longPressEl = null;
    let longPressStarted = false;

    document.addEventListener('touchstart', (e) => {
      const item = e.target.closest('.expense-swipe-container');
      if (!item || e.target.closest('.expense-actions')) return;
      longPressEl = item;
      longPressStarted = false;
      this._timer = setTimeout(() => {
        longPressStarted = true;
        const touch = e.touches[0];
        if (navigator.vibrate) navigator.vibrate(20);
        this._show(touch.clientX, touch.clientY, item.dataset.id);
      }, 500);
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (this._timer) {
        clearTimeout(this._timer);
        this._timer = null;
      }
    }, { passive: true });

    document.addEventListener('touchend', () => {
      if (this._timer) {
        clearTimeout(this._timer);
        this._timer = null;
      }
      // Don't close immediately on touchend — let user tap action
      if (this._menu) {
        setTimeout(() => this._dismiss(), 3000);
      }
    }, { passive: true });

    // Close on scroll
    document.addEventListener('scroll', () => this._dismiss(), { passive: true });
  },

  _show(x, y, id) {
    this._dismiss();

    const exp = expenses.find(e => e.id === id);
    if (!exp) return;

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    const isExpense = exp.type === 'expense';
    const title = isExpense ? 'Gasto' : 'Ingreso';

    menu.innerHTML = `
      <button class="context-menu-item" data-action="edit">
        <span class="cm-icon">✏️</span> Editar
      </button>
      <button class="context-menu-item danger" data-action="delete">
        <span class="cm-icon">🗑️</span> Eliminar
      </button>
    `;

    menu.style.left = Math.min(x, window.innerWidth - 170) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - 120) + 'px';

    menu.querySelector('[data-action="edit"]').addEventListener('click', () => {
      this._dismiss();
      editExpense(id);
    });

    menu.querySelector('[data-action="delete"]').addEventListener('click', () => {
      this._dismiss();
      deleteExpense(id);
    });

    document.body.appendChild(menu);
    this._menu = menu;
  },

  _dismiss() {
    if (this._menu) {
      this._menu.remove();
      this._menu = null;
    }
  }
};

// =============================================
// STATE
// =============================================
let expenses = [];
let currentMonth = new Date();
let editingId = null;

// =============================================
// MIGRATE OLD DATA
// =============================================
function migrateExpense(e) {
  if (!e.type) e.type = 'expense';
  if (!e.id) e.id = 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  if (!e.timestamp) e.timestamp = Date.now();
  return e;
}

// =============================================
// DOM REFS
// =============================================
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

// =============================================
// HELPERS
// =============================================
function formatCurrency(n) {
  return '$' + Number(n).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function isCurrentMonth(date) {
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

// =============================================
// CATEGORIES
// =============================================
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

// =============================================
// DATE HELPERS
// =============================================
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function formatMonthLabel(date) {
  const label = `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  return label;
}

function formatDateLabel(dateStr) {
  const parts = dateStr.split('-');
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const dayName = DAYS_SHORT[d.getDay()];
  const day = parseInt(parts[2]);
  const month = MONTHS_SHORT[parseInt(parts[1]) - 1];
  const isToday = dateStr === todayStr();
  return `${isToday ? 'Hoy' : dayName} ${day} ${month}`;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// =============================================
// LOCAL STORAGE
// =============================================
function loadExpenses() {
  try {
    const raw = JSON.parse(localStorage.getItem('gastoapp_expenses')) || [];
    expenses = raw.map(migrateExpense);
  } catch (e) {
    console.warn('Error loading expenses:', e);
    expenses = [];
  }
}

function saveExpenses() {
  try {
    localStorage.setItem('gastoapp_expenses', JSON.stringify(expenses));
  } catch (e) {
    console.error('Error saving to localStorage:', e);
    Snackbar.show('Error al guardar los datos');
  }
}

// =============================================
// FILTERS
// =============================================
function getFilteredExpenses() {
  const prefix = getMonthKey(currentMonth);
  const q = searchInput.value.toLowerCase().trim();
  return expenses.filter(e => {
    if (!e.date || !e.date.startsWith(prefix)) return false;
    if (q && !e.desc.toLowerCase().includes(q)) return false;
    return true;
  });
}

// =============================================
// VALIDATION
// =============================================
function validateExpense(desc, amount, date, category) {
  if (!desc || desc.trim().length === 0) return 'La descripción es obligatoria';
  if (desc.trim().length > 100) return 'La descripción es muy larga';
  if (!amount || isNaN(amount) || amount <= 0) return 'Ingresa un monto válido mayor a 0';
  if (amount > 999999999) return 'El monto es demasiado grande';
  if (!date) return 'La fecha es obligatoria';
  if (!category) return 'Selecciona una categoría';
  return null;
}

// =============================================
// ANIMATIONS
// =============================================
function animateBalanceChange(oldBalance, newBalance) {
  const diff = newBalance - oldBalance;
  if (diff === 0) return;
  const el = balanceDisplay;
  if (navigator.vibrate && Math.abs(diff) > 1000) navigator.vibrate(5);
  // Add a subtle highlight
  const color = diff > 0 ? 'var(--success)' : 'var(--danger)';
  el.style.transition = 'color 0.3s';
  el.style.color = color;
  setTimeout(() => {
    el.style.color = '';
  }, 600);
}

// =============================================
// RENDER
// =============================================

function renderMonth() {
  currentMonthEl.textContent = formatMonthLabel(currentMonth);
  // Update today button
  const todayBtn = document.querySelector('[data-action="today"]');
  if (todayBtn) {
    todayBtn.style.display = isCurrentMonth(currentMonth) ? 'none' : 'flex';
  }
}

function renderHeader() {
  const filtered = getFilteredExpenses();
  const totalIncome = filtered.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0);
  const totalExpense = filtered.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0);
  const balance = totalIncome - totalExpense;

  const prevBalance = parseFloat(balanceDisplay.textContent.replace(/[^0-9.-]/g, '')) || 0;

  balanceDisplay.textContent = formatCurrency(Math.abs(balance));
  balanceDisplay.className = 'balance-value ' + (balance > 0 ? 'balance-positive' : balance < 0 ? 'balance-negative' : 'balance-zero');
  if (balance < 0) {
    balanceDisplay.textContent = '-' + balanceDisplay.textContent;
    balanceDisplay.style.setProperty('--counter-prefix', '"-"');
  } else {
    balanceDisplay.style.setProperty('--counter-prefix', '');
  }

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
          <div class="category-item ripple">
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
        <p class="empty-sub">Toca + para agregar o desliza para cambiar de mes</p>
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

  expensesList.innerHTML = sortedDates.map((date, dateIdx) => {
    const items = groups[date].sort((a, b) => b.timestamp - a.timestamp);
    const formattedDate = formatDateLabel(date);
    const dayIncome = items.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0);
    const dayExpense = items.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0);
    const dayBalance = dayIncome - dayExpense;

    return `
      <div class="expense-date-group" style="margin-top:${dateIdx === 0 ? '0' : '4px'}">
        <div class="date-header">
          <div class="date-header-left">
            <span class="date-dot"></span>
            <span class="date-label">${formattedDate}</span>
          </div>
          <span class="date-day-total" style="color:${dayBalance >= 0 ? 'var(--success)' : 'var(--danger)'}">${dayBalance >= 0 ? '+' : ''}${formatCurrency(dayBalance)}</span>
        </div>
        ${items.map(e => {
          const isExpense = e.type === 'expense';
          const icon = getCatIcon(e.category);
          return `
          <div class="expense-swipe-container" data-id="${e.id}">
            <div class="expense-swipe-bg">🗑️ Eliminar</div>
            <div class="expense-item ripple">
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

function renderAll() {
  try {
    const now = performance.now();
    renderMonth();
    renderHeader();
    renderSummary();
    renderCategories();
    renderExpenses();
    // Update today button visibility
    const todayBtn = document.querySelector('[data-action="today"]');
    if (todayBtn) {
      todayBtn.style.display = isCurrentMonth(currentMonth) ? 'none' : 'flex';
    }
  } catch (err) {
    console.error('Error al renderizar:', err);
    Snackbar.show('Error al actualizar la vista');
  }
}

// =============================================
// CRUD
// =============================================
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
  if (navigator.vibrate) navigator.vibrate(10);
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
  const idx = expenses.findIndex(e => e.id === id);
  if (idx === -1) return;
  const deleted = expenses.splice(idx, 1)[0];
  saveExpenses();
  renderAll();

  Snackbar.show('Movimiento eliminado', {
    label: 'Deshacer',
    cb: () => {
      expenses.splice(idx, 0, deleted);
      saveExpenses();
      renderAll();
      Snackbar.show('Movimiento restaurado');
    }
  }, 5000);
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
  // Focus on description field after animation
  setTimeout(() => eDesc.focus(), 300);
  // Prevent body scroll
  document.body.style.overflow = 'hidden';
}

function closeModalFn() {
  modalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
  setTimeout(() => resetForm(), 200);
}

// =============================================
// EVENTS
// =============================================

// FAB
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
  const currentCat = eCategory.value;
  populateCategorySelect(type, currentCat);
  if (navigator.vibrate) navigator.vibrate(5);
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
  try {
    const desc = eDesc.value.trim();
    const amount = Number(eAmount.value);
    const date = eDate.value;
    const category = eCategory.value;
    const type = eType.value || 'expense';

    // Validate
    const error = validateExpense(desc, amount, date, category);
    if (error) {
      Snackbar.show(error);
      return;
    }

    const editId = editingIdInput.value;

    if (editId) {
      updateExpense(editId, desc, amount, date, category, type);
      Snackbar.show('Movimiento actualizado');
    } else {
      addExpense(desc, amount, date, category, type);
      Snackbar.show('Movimiento guardado');
    }

    closeModalFn();
  } catch (err) {
    console.error('Error al guardar:', err);
    Snackbar.show('Error al guardar. Revisa la consola.');
  }
});

// Search
searchInput.addEventListener('input', renderAll);

// Month navigation
document.getElementById('prevMonth').addEventListener('click', () => {
  currentMonth.setMonth(currentMonth.getMonth() - 1);
  renderAll();
  if (navigator.vibrate) navigator.vibrate(5);
});

document.getElementById('nextMonth').addEventListener('click', () => {
  currentMonth.setMonth(currentMonth.getMonth() + 1);
  renderAll();
  if (navigator.vibrate) navigator.vibrate(5);
});

// Today button in month bar (delegated)
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-action="today"]')) {
    currentMonth = new Date();
    renderAll();
    if (navigator.vibrate) navigator.vibrate(5);
  }
});

// Keyboard: Escape to close modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) {
    closeModalFn();
  }
  // Ctrl+Z to undo last delete
  if (e.ctrlKey && e.key === 'z') {
    // Could implement undo stack
  }
});

// Prevent zoom on double tap
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });

// =============================================
// EXPORT DATA (hidden feature)
// =============================================
function exportData() {
  try {
    const data = JSON.stringify(expenses, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gastoapp_${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Snackbar.show('Datos exportados');
  } catch (e) {
    Snackbar.show('Error al exportar');
  }
}

// Export via header button (delegated)
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-action="export"]')) {
    exportData();
  }
});

// =============================================
// 8. THEME TOGGLE (Claro / Oscuro)
// =============================================
const Theme = {
  key: 'gastoapp_theme',

  init() {
    const saved = localStorage.getItem(this.key);
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const theme = saved || (prefersLight ? 'light' : 'dark');
    this.set(theme);
    this._updateButton(theme);

    // Listen for system changes if no saved preference
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      if (!localStorage.getItem(this.key)) {
        this.set(e.matches ? 'light' : 'dark');
        this._updateButton(e.matches ? 'light' : 'dark');
      }
    });
  },

  set(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    // Update meta theme-color dynamically
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.content = theme === 'light' ? '#f1f5f9' : '#0f172a';
    }
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    this.set(next);
    localStorage.setItem(this.key, next);
    this._updateButton(next);
    if (navigator.vibrate) navigator.vibrate(10);
  },

  _updateButton(theme) {
    // Mostramos el icono del modo AL QUE PUEDE CAMBIAR
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
};

// Theme toggle via delegated click
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-action="theme"], #themeToggle')) {
    Theme.toggle();
  }
});

// =============================================
// INIT
// =============================================
function init() {
  // Initialize systems
  Snackbar.init();
  Ripple.init();
  SwipeToDelete.init();
  MonthSwipe.init();
  PullToRefresh.init();
  ContextMenu.init();
  Theme.init();

  // Load data
  loadExpenses();
  resetForm();
  renderAll();

  console.log('🚀 GastoApp v2 — Modo nativo activado');
}

// Start when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
