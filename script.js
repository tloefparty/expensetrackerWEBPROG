
// ---------- Data ----------
let expenses = [
  { id: 1, title: "Strawberry milk", amount: 45,  category: "Food" },
  { id: 2, title: "Jeepney fare",    amount: 25,  category: "Transport" },
  { id: 3, title: "Cute notebook",   amount: 180, category: "Other" },
  { id: 4, title: "Milk tea",        amount: 120, category: "Food" }
];

let currentFilter = "All";

const DEFAULT_BUDGET = 2000;
const SESSION_KEY = "cuteTrackerUser";
const BUDGET_KEY = "cuteTrackerBudget";

// budget === null means "no budget set" (cleared)
let budget = DEFAULT_BUDGET;
try {
  const rawBudget = localStorage.getItem(BUDGET_KEY);
  if (rawBudget === "none") {
    budget = null;
  } else if (rawBudget !== null) {
    const savedBudget = Number(rawBudget);
    if (Number.isFinite(savedBudget) && savedBudget > 0) budget = savedBudget;
  }
} catch (e) { }

// Built-in categories (can't be removed)
const DEFAULT_CATEGORIES = ["Food", "Transport", "Other"];
const CATEGORIES_KEY = "cuteTrackerCategories";
const FALLBACK_ICON = "🌸";

// category name -> emoji. 
const categoryIcons = {
  Food: "🍓",
  Transport: "🚌",
  Other: "🎀"
};


try {
  const saved = JSON.parse(localStorage.getItem(CATEGORIES_KEY) ?? "{}");
  Object.entries(saved).forEach(([name, icon]) => {
    if (typeof name === "string" && typeof icon === "string" && !(name in categoryIcons)) {
      categoryIcons[name] = icon;
    }
  });
} catch (e) { }


const tabInfo = {
  tracker: { headline: "Expense Tracker", title: "expense_tracker.exe" },
  budget:  { headline: "My Budget",       title: "budget.exe" },
  calc:    { headline: "Calculator",      title: "calculator.exe" }
};

// ---------- DOM Elements ----------
const windowTitle   = document.getElementById("windowTitle");
const loginView     = document.getElementById("loginView");
const appView       = document.getElementById("appView");
const loginForm     = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginError    = document.getElementById("loginError");
const loginBtn      = document.getElementById("loginBtn");
const guestBtn      = document.getElementById("guestBtn");
const logoutBtn     = document.getElementById("logoutBtn");
const userLabel     = document.getElementById("userLabel");

const panelHeadline = document.getElementById("panelHeadline");
const filterBox     = document.getElementById("filterBox");
const tabsWrap      = document.getElementById("tabs");
const panels = {
  tracker: document.getElementById("trackerPanel"),
  budget:  document.getElementById("budgetPanel"),
  calc:    document.getElementById("calcPanel")
};

// tracker tab
const form          = document.getElementById("expenseForm");
const titleInput    = document.getElementById("title");
const amountInput   = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const errorBox      = document.getElementById("error");
const listEl        = document.getElementById("expenseList");
const totalEl       = document.getElementById("totalAmount");
const totalLabel    = document.getElementById("totalLabel");
const statTotalEl   = document.getElementById("statTotal");
const statPctEl     = document.getElementById("statPct");
const meterEl       = document.getElementById("meter");
const meterFill     = document.getElementById("meterFill");
const meterNote     = document.getElementById("meterNote");
const filterNote    = document.getElementById("filterNote");
const countLabel    = document.getElementById("countLabel");
const filterSelect  = document.getElementById("categoryFilter");
const chipsWrap     = document.getElementById("chips");
const resetBtn      = document.getElementById("resetBtn");
const addBtn        = document.getElementById("addBtn");

// custom category UI
const toggleCatBtn  = document.getElementById("toggleCatBtn");
const newCatBox     = document.getElementById("newCatBox");
const newCatName    = document.getElementById("newCatName");
const newCatIcon    = document.getElementById("newCatIcon");
const addCatBtn     = document.getElementById("addCatBtn");
const catError      = document.getElementById("catError");

// budget tab
const budgetForm     =document.getElementById("budgetForm");
const budgetInput    = document.getElementById("budgetInput");
const budgetError    = document.getElementById("budgetError");
const setBudgetBtn   = document.getElementById("setBudgetBtn");
const resetBudgetBtn = document.getElementById("resetBudgetBtn");
const clearBudgetBtn = document.getElementById("clearBudgetBtn");
const bBudget        = document.getElementById("bBudget");
const bSpent         = document.getElementById("bSpent");
const bLeft          = document.getElementById("bLeft");
const bMeter         = document.getElementById("bMeter");
const bMeterFill     = document.getElementById("bMeterFill");
const bMeterNote     = document.getElementById("bMeterNote");
const breakdownEl    = document.getElementById("breakdown");

// calculator tab
const calcKeys    = document.getElementById("calcKeys");
const calcExpr    = document.getElementById("calcExpr");
const calcDisplay = document.getElementById("calcDisplay");
const useTotalBtn = document.getElementById("useTotalBtn");
const useLeftBtn  = document.getElementById("useLeftBtn");

// ---------- Helpers ----------

// Classic function declaration: adds up the amounts with .reduce()
function calculateTotal(list) {
  return list.reduce((sum, { amount }) => sum + amount, 0);
}

// Classic function declaration: money formatting
function formatPeso(value) {
  return "₱" + value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Keeps user text from being treated as HTML
const escapeHTML = (text) =>
  text.replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));

// .filter() by category (strict equality)
const getVisibleExpenses = () =>
  expenses.filter((expense) => currentFilter === "All" || expense.category === currentFilter);

// Shared error-message helpers (used by login, tracker and budget forms)
function showMessage(box, message) {
  box.classList.remove("show");
  void box.offsetWidth; // restart shake animation
  box.textContent = "x_x " + message;
  box.classList.add("show");
}
const hideMessage = (box) => {
  box.textContent = "";
  box.classList.remove("show");
};

// ---------- Categories ----------
const getCategories = () => Object.keys(categoryIcons);

// Rebuild every place that lists categories: the add-form dropdown,
// the filter dropdown and the filter chips.
function renderCategoryControls() {
  const names = getCategories();
  const selectedForForm = categoryInput.value;

  categoryInput.innerHTML = names
    .map((name) => `<option value="${escapeHTML(name)}">${categoryIcons[name]} ${escapeHTML(name)}</option>`)
    .join("");
  if (names.includes(selectedForForm)) categoryInput.value = selectedForForm;

  filterSelect.innerHTML =
    `<option value="All">all categories</option>` +
    names
      .map((name) => `<option value="${escapeHTML(name)}">${categoryIcons[name]} ${escapeHTML(name)}</option>`)
      .join("");

  chipsWrap.innerHTML =
    `<button type="button" class="pill chip" data-filter="All">all</button>` +
    names
      .map((name) => {
        const safe = escapeHTML(name);
        const chip = `<button type="button" class="pill chip" data-filter="${safe}" title="${safe}">${categoryIcons[name]} ${safe}</button>`;
        if (DEFAULT_CATEGORIES.includes(name)) return `<span class="chip-wrap">${chip}</span>`;
        return `<span class="chip-wrap has-x">${chip}<button type="button" class="chip-x" data-remove="${safe}" aria-label="Remove category ${safe}" title="remove category">✕</button></span>`;
      })
      .join("");
}

function pickIcon(text) {
  const clean = text.trim();
  if (clean === "") return FALLBACK_ICON;
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const [first] = new Intl.Segmenter().segment(clean);
    return first.segment;
  }
  return Array.from(clean)[0];
}

function saveCategories() {
  const custom = Object.fromEntries(
    Object.entries(categoryIcons).filter(([name]) => !DEFAULT_CATEGORIES.includes(name))
  );
  try { localStorage.setItem(CATEGORIES_KEY, JSON.stringify(custom)); } catch (e) { /* ignore */ }
}

function toggleNewCategoryBox(open) {
  newCatBox.hidden = !open;
  toggleCatBtn.setAttribute("aria-expanded", String(open));
  hideMessage(catError);
  if (open) newCatName.focus();
}

function addCategory() {
  const name = newCatName.value.trim().replace(/\s+/g, " ");

  if (name === "") {
    showMessage(catError, "give your category a name!");
    return;
  }
  // case-insensitive duplicate check, so "food" and "Food" can't both exist
  if (getCategories().some((existing) => existing.toLowerCase() === name.toLowerCase())) {
    showMessage(catError, `"${name}" already exists!`);
    return;
  }
  if (name.toLowerCase() === "all") {
    showMessage(catError, `"all" is already used by the filter!`);
    return;
  }

  categoryIcons[name] = pickIcon(newCatIcon.value);
  saveCategories();

  newCatName.value = "";
  newCatIcon.value = "";
  toggleNewCategoryBox(false);

  renderCategoryControls();
  categoryInput.value = name; // select it for the expense you're adding
  render();
  burstFrom(addCatBtn, 14);
}

function removeCategory(name) {
  // strict equality: block removal while any expense still uses it
  if (expenses.some((expense) => expense.category === name)) {
    showMessage(errorBox, `can't remove "${name}" while expenses use it. delete those first!`);
    return;
  }
  delete categoryIcons[name];
  if (currentFilter === name) currentFilter = "All";
  hideMessage(errorBox);
  saveCategories();
  renderCategoryControls();
  render();
}

// ---------- Heart particles (styled in style.css) ----------
function heartBurst(x, y, count = 22) {
  for (let i = 0; i < count; i++) {
    const heart = document.createElement("span");
    heart.className = `heart-particle c${(i % 4) + 1}`;
    heart.textContent = i % 5 === 0 ? "♡" : "♥";

    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * 110;

    heart.style.left = x + "px";
    heart.style.top = y + "px";
    heart.style.setProperty("--dx", Math.cos(angle) * distance + "px");
    heart.style.setProperty("--dy", Math.sin(angle) * distance - 40 + "px");
    heart.style.setProperty("--rot", (Math.random() * 200 - 100) + "deg");
    heart.style.setProperty("--size", (14 + Math.random() * 20) + "px");
    heart.style.setProperty("--dur", (0.8 + Math.random() * 0.6) + "s");

    document.body.appendChild(heart);
    heart.addEventListener("animationend", () => heart.remove());
  }
}

// burst from the center of any element
function burstFrom(element, count = 22) {
  const { left, top, width, height } = element.getBoundingClientRect();
  heartBurst(left + width / 2, top + height / 2, count);
}

// ---------- Views (login <-> app) and tabs ----------
function switchTab(name) {
  Object.entries(panels).forEach(([key, panel]) => {
    panel.hidden = key !== name;
  });

  tabsWrap.querySelectorAll(".tab").forEach((tab) => {
    const isActive = tab.dataset.tab === name;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  const { headline, title } = tabInfo[name];
  panelHeadline.textContent = headline;
  windowTitle.textContent = title;
  filterBox.hidden = name !== "tracker"; // the category filter belongs to the tracker tab
}

function showApp(name) {
  loginView.hidden = true;
  appView.hidden = false;
  userLabel.textContent = `${name}.jpg`;
  switchTab("tracker");
  render();
}

function showLogin() {
  appView.hidden = true;
  loginView.hidden = false;
  windowTitle.textContent = "login.exe";
  loginForm.reset();
  hideMessage(loginError);
  loginBtn.disabled = false;
  guestBtn.disabled = false;
}

// hearts first, then switch screens
function enterApp(name, button) {
  burstFrom(button);
  loginBtn.disabled = true;
  guestBtn.disabled = true;
  try { sessionStorage.setItem(SESSION_KEY, name); } catch (e) { /* storage blocked, ignore */ }
  setTimeout(() => showApp(name), 700);
}

tabsWrap.addEventListener("click", (event) => {
  const tab = event.target.closest(".tab");
  if (!tab) return;
  switchTab(tab.dataset.tab);
});

// ---------- Login events ----------
loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (username === "") {
    showMessage(loginError, "please enter your username!");
    return;
  }
  if (password.length < 4) {
    showMessage(loginError, "password needs at least 4 characters!");
    return;
  }

  hideMessage(loginError);
  enterApp(username, loginBtn);
});

guestBtn.addEventListener("click", () => {
  hideMessage(loginError);
  enterApp("guest", guestBtn);
});

logoutBtn.addEventListener("click", () => {
  try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
  showLogin();
});

// ---------- Rendering ----------

// Budget numbers ALWAYS use every expense, never the filtered list.
// That keeps the meter the same no matter which filter is selected.
function renderBudget(visibleTotal) {
  const spent = calculateTotal(expenses);
  const hasBudget = budget !== null;
  const left = hasBudget ? budget - spent : 0;
  const pct = hasBudget ? Math.round((spent / budget) * 100) : 0;
  const barWidth = Math.min(100, pct) + "%";
  const isOver = hasBudget && spent > budget;

  const message = !hasBudget
    ? "no budget set ( ˘ω˘ ) set one in the budget tab"
    : isOver
      ? `over budget by ${formatPeso(Math.abs(left))}!! ( ; ω ; )`
      : pct >= 75
        ? `careful bestie ( •̀ ω •́ ) ${formatPeso(left)} left of ${formatPeso(budget)}`
        : `${formatPeso(left)} left of ${formatPeso(budget)} (๑˃ᴗ˂)ﻭ`;

  // tracker tab summary
  statPctEl.textContent = hasBudget ? pct + "%" : "--";
  meterFill.style.width = barWidth;
  meterEl.classList.toggle("over", isOver);
  meterNote.textContent = message;

  // explain what the filter does (and doesn't) change
  if (!hasBudget) {
    filterNote.textContent = currentFilter === "All"
      ? ""
      : `${categoryIcons[currentFilter]} ${currentFilter} is ${spent > 0 ? Math.round((visibleTotal / spent) * 100) : 0}% of your spending.`;
  } else if (currentFilter === "All") {
    filterNote.textContent = "showing all categories: the list total matches the meter";
  } else {
    const share = spent > 0 ? Math.round((visibleTotal / spent) * 100) : 0;
    filterNote.textContent =
      `${categoryIcons[currentFilter]} ${currentFilter} is ${share}% of your spending. the meter still counts everything.`;
  }

  // budget tab
  bBudget.textContent = hasBudget ? formatPeso(budget) : "none";
  bSpent.textContent = formatPeso(spent);
  bLeft.textContent = !hasBudget ? "--" : isOver ? "-" + formatPeso(Math.abs(left)) : formatPeso(left);
  bMeterFill.style.width = barWidth;
  bMeter.classList.toggle("over", isOver);
  bMeterNote.textContent = hasBudget ? `${pct}% used · ${message}` : message;

  // these only make sense when a budget exists
  clearBudgetBtn.disabled = !hasBudget;
  useLeftBtn.disabled = !hasBudget;
  useLeftBtn.title = hasBudget ? "" : "set a budget first";

  // spending per category with .reduce() + spread
  const byCategory = expenses.reduce(
    (acc, { category, amount }) => ({ ...acc, [category]: (acc[category] ?? 0) + amount }),
    {}
  );

  breakdownEl.innerHTML = getCategories()
    .map((category) => {
      const amount = byCategory[category] ?? 0;
      const share = spent > 0 ? Math.round((amount / spent) * 100) : 0;
      // with a budget the bar shows % of budget; without one it shows share of spending
      const barPct = hasBudget ? Math.min(100, (amount / budget) * 100) : share;
      const meta = hasBudget
        ? `${share}% of spending · ${Math.round(barPct)}% of budget`
        : `${share}% of spending`;
      return `
        <div class="cat-row">
          <div class="cat-head"><span>${categoryIcons[category]} ${escapeHTML(category)}</span><span class="a">${formatPeso(amount)}</span></div>
          <div class="cat-bar"><div style="width:${barPct}%"></div></div>
          <div class="cat-meta">${meta}</div>
        </div>`;
    })
    .join("");
}

function render() {
  const visible = getVisibleExpenses();

  if (visible.length === 0) {
    listEl.innerHTML = `<li class="empty">( ˘▽˘) nothing here yet~</li>`;
  } else {
    // .map() renders every expense, destructuring each object
    listEl.innerHTML = visible
      .map((expense) => {
        const { id, title, amount, category } = expense;
        return `
          <li class="pill item">
            <span class="emoji">${categoryIcons[category]}</span>
            <div class="info">
              <div class="t">${escapeHTML(title)}</div>
              <div class="c">${escapeHTML(category)}</div>
            </div>
            <span class="a">${formatPeso(amount)}</span>
            <button class="del" data-id="${id}" title="delete" aria-label="Delete ${escapeHTML(title)}">✕</button>
          </li>`;
      })
      .join("");
  }

  // .reduce() total for what's currently displayed
  const total = calculateTotal(visible);

  totalEl.textContent     = formatPeso(total);
  totalLabel.textContent  = currentFilter === "All" ? "Total ♡" : `Total · ${currentFilter} ♡`;
  statTotalEl.textContent = formatPeso(total);
  countLabel.textContent  = `${visible.length} item${visible.length === 1 ? "" : "s"}`;

  // sync both filter controls
  filterSelect.value = currentFilter;
  chipsWrap.querySelectorAll(".chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.filter === currentFilter);
  });

  renderBudget(total);
}

// ---------- Tracker events ----------

// Add expense
form.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const amount = Number(amountInput.value); // safe number conversion
  const category = categoryInput.value;

  if (title === "") {
    showMessage(errorBox, "please type what you bought!");
    return;
  }
  if (amountInput.value.trim() === "" || Number.isNaN(amount)) {
    showMessage(errorBox, "amount must be a real number!");
    return;
  }
  if (amount <= 0) {
    showMessage(errorBox, "amount must be greater than 0!");
    return;
  }

  const newExpense = { id: Date.now(), title, amount, category };

  // spread operator instead of .push()
  expenses = [...expenses, newExpense];

  hideMessage(errorBox);
  form.reset();
  titleInput.focus();
  render();
  burstFrom(addBtn);
});

// Filter via dropdown
filterSelect.addEventListener("change", (event) => {
  currentFilter = event.target.value;
  render();
});

// Filter via chips (or remove a custom category with its ✕)
chipsWrap.addEventListener("click", (event) => {
  const removeBtn = event.target.closest(".chip-x");
  if (removeBtn) {
    removeCategory(removeBtn.dataset.remove);
    return;
  }
  const chip = event.target.closest(".chip");
  if (!chip) return;
  currentFilter = chip.dataset.filter;
  render();
});

// Add a custom category
toggleCatBtn.addEventListener("click", () => toggleNewCategoryBox(newCatBox.hidden));
addCatBtn.addEventListener("click", addCategory);
[newCatName, newCatIcon].forEach((input) => {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); // don't submit the expense form
      addCategory();
    } else if (event.key === "Escape") {
      toggleNewCategoryBox(false);
      toggleCatBtn.focus();
    }
  });
});

// Delete an expense (event delegation)
listEl.addEventListener("click", (event) => {
  const btn = event.target.closest(".del");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  expenses = expenses.filter((expense) => expense.id !== id);
  render();
});

// Clear form
resetBtn.addEventListener("click", () => {
  form.reset();
  hideMessage(errorBox);
  titleInput.focus();
});

// ---------- Budget events ----------
function saveBudget() {
  try { localStorage.setItem(BUDGET_KEY, budget === null ? "none" : String(budget)); } catch (e) { /* ignore */ }
}

budgetForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const raw = budgetInput.value.trim();
  const value = Number(raw); // safe number conversion

  if (raw === "" || Number.isNaN(value)) {
    showMessage(budgetError, "type a real number for your budget!");
    return;
  }
  if (value <= 0) {
    showMessage(budgetError, "budget must be greater than 0!");
    return;
  }

  budget = Math.round(value * 100) / 100;
  saveBudget();
  hideMessage(budgetError);
  budgetInput.value = "";
  render();
  burstFrom(setBudgetBtn, 14);
});

// clear budget: remove the limit completely
clearBudgetBtn.addEventListener("click", () => {
  budget = null;
  saveBudget();
  hideMessage(budgetError);
  budgetInput.value = "";
  render();
});

resetBudgetBtn.addEventListener("click", () => {
  budget = DEFAULT_BUDGET;
  saveBudget();
  hideMessage(budgetError);
  budgetInput.value = "";
  render();
});

// ---------- CALCULATOR ----------
const opSymbols = { "+": "+", "-": "−", "*": "×", "/": "÷" };

const calc = {
  current: "0",       // what's on the screen
  previous: null,     // left-hand number waiting for an operator
  op: null,           // pending operator
  resetNext: false,   // next digit starts a new number
  justEvaluated: false,
  lastExpr: "",
  error: false
};

// Classic function declaration for the math itself
function calcCompute(a, b, op) {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return b === 0 ? NaN : a / b; // NaN = divide by zero
    default:  return b;
  }
}

// trims floating-point noise like 0.1 + 0.2
const calcFormat = (n) => String(parseFloat(n.toPrecision(12)));

function calcReset() {
  calc.current = "0";
  calc.previous = null;
  calc.op = null;
  calc.resetNext = false;
  calc.justEvaluated = false;
  calc.lastExpr = "";
  calc.error = false;
}

function renderCalc() {
  calcDisplay.textContent = calc.error ? "oops (>_<)" : calc.current;
  calcDisplay.classList.toggle("err", calc.error);
  calcDisplay.classList.toggle("small", !calc.error && calc.current.length > 10);

  let expr = "";
  if (calc.justEvaluated) expr = calc.lastExpr;
  else if (calc.op !== null) expr = `${calcFormat(calc.previous)} ${opSymbols[calc.op]}`;
  calcExpr.textContent = expr === "" ? " " : expr;
}

function calcPress(key) {
  if (calc.error) calcReset();

  if (/^[0-9]$/.test(key)) {
    if (calc.resetNext || calc.justEvaluated) {
      calc.current = key;
      calc.resetNext = false;
      calc.justEvaluated = false;
    } else if (calc.current.replace(/[-.]/g, "").length < 12) {
      calc.current = calc.current === "0" ? key : calc.current + key;
    }
  } else if (key === ".") {
    if (calc.resetNext || calc.justEvaluated) {
      calc.current = "0.";
      calc.resetNext = false;
      calc.justEvaluated = false;
    } else if (!calc.current.includes(".")) {
      calc.current += ".";
    }
  } else if (key === "+" || key === "-" || key === "*" || key === "/") {
    // chain operations: 2 + 3 + ... computes 2 + 3 first
    if (calc.op !== null && !calc.resetNext) {
      const chained = calcCompute(calc.previous, Number(calc.current), calc.op);
      if (Number.isNaN(chained)) {
        calc.error = true;
        renderCalc();
        return;
      }
      calc.current = calcFormat(chained);
    }
    calc.previous = Number(calc.current);
    calc.op = key;
    calc.resetNext = true;
    calc.justEvaluated = false;
  } else if (key === "=") {
    if (calc.op === null || calc.resetNext) return;
    const left = calc.previous;
    const right = Number(calc.current);
    const result = calcCompute(left, right, calc.op);
    if (Number.isNaN(result)) {
      calc.error = true;
      renderCalc();
      return;
    }
    calc.lastExpr = `${calcFormat(left)} ${opSymbols[calc.op]} ${calcFormat(right)} =`;
    calc.current = calcFormat(result);
    calc.previous = null;
    calc.op = null;
    calc.justEvaluated = true;
    calc.resetNext = false;
  } else if (key === "%") {
    calc.current = calcFormat(Number(calc.current) / 100);
  } else if (key === "back") {
    if (calc.resetNext || calc.justEvaluated) return;
    const tooShort = calc.current.length === 1 || (calc.current.length === 2 && calc.current.startsWith("-"));
    calc.current = tooShort ? "0" : calc.current.slice(0, -1);
  } else if (key === "C") {
    calcReset();
  }

  renderCalc();
}

// load a number (like the tracker total) straight into the calculator
function calcUseValue(value) {
  if (calc.error) calcReset();
  calc.current = calcFormat(Math.round(value * 100) / 100);
  calc.resetNext = false;
  calc.justEvaluated = calc.op === null; // if an operator is waiting, this becomes its right-hand number
  renderCalc();
}

calcKeys.addEventListener("click", (event) => {
  const keyBtn = event.target.closest(".key");
  if (!keyBtn) return;
  const key = keyBtn.dataset.key;
  calcPress(key);
  if (key === "=" && !calc.error && calc.justEvaluated) burstFrom(keyBtn, 10);
});

useTotalBtn.addEventListener("click", () => {
  calcUseValue(calculateTotal(getVisibleExpenses()));
});

useLeftBtn.addEventListener("click", () => {
  calcUseValue(budget - calculateTotal(expenses));
});

// keyboard support while the calculator tab is open
document.addEventListener("keydown", (event) => {
  if (appView.hidden || panels.calc.hidden) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  const tag = event.target.tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
  if (tag === "BUTTON" && event.key === "Enter") return; // let the focused button handle it

  const keyMap = { Enter: "=", Backspace: "back", Escape: "C", Delete: "C", ",": "." };
  const key = keyMap[event.key] ?? event.key;

  if (/^[0-9.]$/.test(key) || ["+", "-", "*", "/", "=", "%", "back", "C"].includes(key)) {
    event.preventDefault();
    calcPress(key);
  }
});

// ---------- First paint ----------
renderCategoryControls();
renderCalc();

// If you already logged in this session, skip the login screen
let savedUser = null;
try { savedUser = sessionStorage.getItem(SESSION_KEY); } catch (e) { /* ignore */ }

if (savedUser !== null) {
  showApp(savedUser);
} else {
  showLogin();
}