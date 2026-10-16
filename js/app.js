/* =========================================================
   TaskTrack — shared logic used by every page
   - Data storage (localStorage)
   - Navigation bar + footer
   - Theme, reminders, toasts, helper functions
   ========================================================= */

const STORAGE_KEY = "tasktrack.tasks";
const SETTINGS_KEY = "tasktrack.settings";

/* ---------- Date helpers ---------- */
function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function todayISO() { return toISO(new Date()); }
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }

/** Whole days from today until the given ISO date (negative = overdue). */
function daysUntil(iso) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((parseISO(iso) - t) / 86400000);
}

/** Friendly due label, e.g. "Due today", "Due tomorrow", "Due Friday", "Due Oct 30". */
function dueLabel(iso) {
  const n = daysUntil(iso);
  if (n < 0) return `Overdue by ${-n} day${n === -1 ? "" : "s"}`;
  if (n === 0) return "Due today";
  if (n === 1) return "Due tomorrow";
  const d = parseISO(iso);
  if (n < 7) return "Due " + d.toLocaleDateString(undefined, { weekday: "long" });
  return "Due " + d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function escapeHTML(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/* ---------- Sample data (matches the UI/UX design slides) ---------- */
function sampleTasks() {
  const t = new Date();
  // next Friday (or today + 7 if today is Friday)
  const toFriday = ((5 - t.getDay() + 7) % 7) || 7;
  const mk = (name, subject, type, offset, priority, status, description = "") => ({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    name, subject, type,
    due: toISO(addDays(t, offset)),
    priority, status, description,
    createdAt: Date.now()
  });
  return [
    mk("Database Assignment", "Database Systems", "Assignment", 0, "high", "progress", "Normalize the given schema up to 3NF and submit the ERD."),
    mk("Circuit Design", "Logic Circuits", "Project", 1, "medium", "todo", "Design a 4-bit adder in the simulator."),
    mk("Read Chapter 5", "Data Structures", "Reading", toFriday, "low", "todo", "Trees and binary search trees."),
    mk("Research Paper", "Technical Writing", "Project", 9, "high", "todo", "Draft the introduction and related literature."),
    mk("Programming Activity", "Object-Oriented Programming", "Activity", 3, "medium", "progress", "Implement inheritance exercise #3."),
    mk("Quiz", "Engineering Math", "Quiz", 4, "medium", "todo"),
    mk("Project Proposal", "Software Design", "Project", 6, "high", "todo"),
    mk("Lab Activity 4", "Logic Circuits", "Activity", 6, "low", "todo"),
    mk("Reflection Essay", "Technical Writing", "Assignment", 6, "medium", "todo"),
    mk("Lab Report", "Physics for Engineers", "Report", 11, "medium", "todo"),
    mk("Midterm Exam", "Data Structures", "Exam", 13, "high", "todo", "Coverage: Chapters 1–5."),
    mk("Math Worksheet", "Engineering Math", "Assignment", -2, "low", "done"),
    mk("Lab Report 1", "Physics for Engineers", "Report", -3, "medium", "done"),
    mk("Quiz Review", "Database Systems", "Quiz", -1, "low", "done"),
    mk("Group Meeting", "Software Design", "Other", -1, "low", "done")
  ];
}

/* ---------- Task storage ---------- */
const Store = {
  all() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* storage unavailable */ }
    const seed = sampleTasks();
    this.save(seed);
    return seed;
  },
  save(tasks) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch (e) {}
  },
  get(id) { return this.all().find(t => t.id === id); },
  add(task) {
    const tasks = this.all();
    task.id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    task.createdAt = Date.now();
    tasks.push(task);
    this.save(tasks);
    return task;
  },
  update(id, changes) {
    const tasks = this.all().map(t => (t.id === id ? { ...t, ...changes } : t));
    this.save(tasks);
  },
  remove(id) { this.save(this.all().filter(t => t.id !== id)); },
  reset() { this.save(sampleTasks()); }
};

/* ---------- Settings storage ---------- */
const DEFAULT_SETTINGS = {
  name: "Student User",
  program: "Computer Engineering",
  year: "2nd Year",
  reminderDays: 1,          // remind N day(s) before the deadline
  theme: "light",
  notifications: true,
  showCompleted: true
};
const Settings = {
  get() {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
    } catch (e) { return { ...DEFAULT_SETTINGS }; }
  },
  set(changes) {
    const s = { ...this.get(), ...changes };
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
    return s;
  }
};

/* ---------- Sorting by urgency ---------- */
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
function byUrgency(a, b) {
  if ((a.status === "done") !== (b.status === "done")) return a.status === "done" ? 1 : -1;
  if (a.due !== b.due) return a.due < b.due ? -1 : 1;
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
}

/* ---------- Icons (inline SVG, no emoji) ---------- */
const ICON_PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  chart: '<path d="M4 20V11M10 20V5M16 20v-6M2 20h20"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  check: '<path d="M5 12.5 10 17 19 7"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>'
};
function icon(name) {
  return `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON_PATHS[name]}</svg>`;
}

/* ---------- Layout: navbar + footer ---------- */
const NAV_ITEMS = [
  { href: "index.html", label: "Dashboard", icon: "home" },
  { href: "add-task.html", label: "Add Task", icon: "plus" },
  { href: "calendar.html", label: "Calendar", icon: "calendar" },
  { href: "progress.html", label: "Progress", icon: "chart" },
  { href: "profile.html", label: "Profile", icon: "user" }
];

function renderLayout() {
  const page = location.pathname.split("/").pop() || "index.html";

  const header = document.createElement("header");
  header.className = "navbar";
  header.innerHTML = `
    <div class="inner">
      <a class="brand" href="index.html" aria-label="TaskTrack home">
        <span class="brand-logo">${icon("check")}</span> TASKTRACK
      </a>
      <button class="nav-toggle" aria-label="Open menu" aria-expanded="false">${icon("menu")}</button>
      <ul class="nav-links">
        ${NAV_ITEMS.map(i => `
          <li><a href="${i.href}" class="${i.href === page ? "active" : ""}">
            ${icon(i.icon)}${i.label}</a></li>`).join("")}
      </ul>
    </div>`;
  document.body.prepend(header);

  const toggle = header.querySelector(".nav-toggle");
  const links = header.querySelector(".nav-links");
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
  });

  const footer = document.createElement("footer");
  footer.className = "footer";
  footer.innerHTML = `
    <div class="inner">
      <span>GROUP 6 • TASKTRACK</span>
      <span>“Track Your Tasks. Take Control of Your Time.”</span>
    </div>`;
  document.body.append(footer);

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.id = "toast";
  document.body.append(toast);
}

/* ---------- Theme ---------- */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
}

/* ---------- Toast ---------- */
let toastTimer;
function showToast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
}

/* ---------- Reminders ----------
   Shows an in-app banner for unfinished tasks that are overdue or due within
   the reminder window set on the Profile page. If the user allowed browser
   notifications, a system notification is sent once per day as well. */
function upcomingReminders() {
  const { reminderDays } = Settings.get();
  return Store.all()
    .filter(t => t.status !== "done" && daysUntil(t.due) <= reminderDays)
    .sort(byUrgency);
}

function renderReminderBanner(container) {
  const settings = Settings.get();
  if (!container || !settings.notifications) return;
  if (sessionStorage.getItem("tasktrack.reminderDismissed")) return;

  const due = upcomingReminders();
  if (!due.length) return;

  const names = due.slice(0, 3).map(t => `<strong>${escapeHTML(t.name)}</strong> (${dueLabel(t.due).toLowerCase()})`);
  const extra = due.length > 3 ? ` and ${due.length - 3} more` : "";

  const banner = document.createElement("div");
  banner.className = "reminder";
  banner.setAttribute("role", "alert");
  banner.innerHTML = `
    <span class="reminder-icon">${icon("bell")}</span>
    <span>Reminder: ${names.join(", ")}${extra}.</span>
    <button class="icon-btn close" aria-label="Dismiss reminder">${icon("close")}</button>`;
  banner.querySelector(".close").addEventListener("click", () => {
    banner.remove();
    try { sessionStorage.setItem("tasktrack.reminderDismissed", "1"); } catch (e) {}
  });
  container.prepend(banner);

  // Optional browser notification (once per day)
  try {
    const key = "tasktrack.notified." + todayISO();
    if ("Notification" in window && Notification.permission === "granted" && !localStorage.getItem(key)) {
      new Notification("TaskTrack reminder", {
        body: `${due.length} task${due.length > 1 ? "s" : ""} need your attention soon.`
      });
      localStorage.setItem(key, "1");
    }
  } catch (e) {}
}

/* ---------- Confirm modal ---------- */
function confirmDialog(title, message, okLabel = "Delete") {
  return new Promise(resolve => {
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop open";
    wrap.innerHTML = `
      <div class="card modal" role="dialog" aria-modal="true" aria-labelledby="mdl-title">
        <h3 id="mdl-title">${escapeHTML(title)}</h3>
        <p>${escapeHTML(message)}</p>
        <div class="form-actions">
          <button class="btn ghost" data-act="cancel">Cancel</button>
          <button class="btn danger" data-act="ok">${escapeHTML(okLabel)}</button>
        </div>
      </div>`;
    const close = val => { wrap.remove(); resolve(val); };
    wrap.addEventListener("click", e => {
      if (e.target === wrap || e.target.dataset.act === "cancel") close(false);
      if (e.target.dataset.act === "ok") close(true);
    });
    document.body.append(wrap);
    wrap.querySelector('[data-act="ok"]').focus();
  });
}

/* ---------- Shared task row (used on Dashboard + Calendar) ---------- */
function taskRowHTML(t) {
  const overdue = t.status !== "done" && daysUntil(t.due) < 0;
  return `
    <div class="task-item ${t.status === "done" ? "done" : ""}" data-id="${t.id}">
      <button class="check" data-act="toggle" aria-label="Mark ${escapeHTML(t.name)} as ${t.status === "done" ? "not done" : "done"}">${t.status === "done" ? icon("check") : ""}</button>
      <div class="t-body">
        <div class="t-name">${escapeHTML(t.name)}</div>
        <div class="t-meta">${escapeHTML(t.subject)} • ${dueLabel(t.due)} • ${capitalize(t.priority)}
          ${overdue ? ' <span class="badge overdue">Overdue</span>' : ""}</div>
      </div>
      <span class="dot ${t.priority}" title="${capitalize(t.priority)} priority"></span>
      <div class="t-actions">
        <a class="icon-btn" href="add-task.html?id=${t.id}" aria-label="Edit task" title="Edit">${icon("edit")}</a>
        <button class="icon-btn" data-act="delete" aria-label="Delete task" title="Delete">${icon("trash")}</button>
      </div>
    </div>`;
}

/** Wires toggle/delete buttons inside a list, then calls onChange to re-render. */
function bindTaskActions(container, onChange) {
  container.addEventListener("click", async e => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const id = btn.closest("[data-id]")?.dataset.id;
    const task = id && Store.get(id);
    if (!task) return;

    if (btn.dataset.act === "toggle") {
      const done = task.status !== "done";
      Store.update(id, { status: done ? "done" : "todo" });
      showToast(done ? `“${task.name}” completed` : `“${task.name}” moved back to To Do`);
      onChange();
    }
    if (btn.dataset.act === "delete") {
      if (await confirmDialog("Delete task?", `“${task.name}” will be permanently removed.`)) {
        Store.remove(id);
        showToast("Task deleted");
        onChange();
      }
    }
  });
}

/* ---------- Boot ---------- */
applyTheme(Settings.get().theme);
document.addEventListener("DOMContentLoaded", renderLayout);
