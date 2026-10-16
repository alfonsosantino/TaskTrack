/* TaskTrack — Dashboard page */
document.addEventListener("DOMContentLoaded", () => {
  const todayList = document.getElementById("today-list");
  const allList = document.getElementById("all-list");
  const search = document.getElementById("search");
  const fPriority = document.getElementById("filter-priority");
  const fStatus = document.getElementById("filter-status");

  // Greeting based on time of day + user's first name
  const hour = new Date().getHours();
  const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const first = Settings.get().name.split(" ")[0];
  document.getElementById("greeting").textContent = `${part}, ${first}!`;

  renderReminderBanner(document.getElementById("reminder-slot"));

  function render() {
    const tasks = Store.all().sort(byUrgency);

    // --- Today's tasks: overdue + due within the next 7 days, max 5 ---
    const focus = tasks.filter(t => t.status !== "done" && daysUntil(t.due) <= 7).slice(0, 5);
    todayList.innerHTML = focus.length
      ? focus.map(taskRowHTML).join("")
      : `<div class="empty">Nothing due this week.</div>`;

    // --- Progress ---
    const done = tasks.filter(t => t.status === "done").length;
    const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    document.getElementById("progress-fill").style.width = pct + "%";
    document.getElementById("progress-bar").setAttribute("aria-valuenow", pct);
    document.getElementById("progress-text").textContent = `${done} / ${tasks.length} tasks completed`;

    // --- Stats ---
    const pending = tasks.filter(t => t.status !== "done");
    const urgent = pending.filter(t => daysUntil(t.due) <= 1 || (t.priority === "high" && daysUntil(t.due) <= 3));
    document.getElementById("stat-urgent").textContent = urgent.length;
    document.getElementById("stat-pending").textContent = pending.length;
    document.getElementById("stat-done").textContent = done;

    // --- All tasks with search + filters ---
    const q = search.value.trim().toLowerCase();
    const list = tasks.filter(t =>
      (fPriority.value === "all" || t.priority === fPriority.value) &&
      (fStatus.value === "all" || (fStatus.value === "done" ? t.status === "done" : t.status !== "done")) &&
      (!q || t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q))
    );
    allList.innerHTML = list.length
      ? list.map(taskRowHTML).join("")
      : `<div class="empty">No tasks match your filters.</div>`;
  }

  [search, fPriority, fStatus].forEach(el => el.addEventListener("input", render));
  bindTaskActions(todayList, render);
  bindTaskActions(allList, render);
  render();
});
