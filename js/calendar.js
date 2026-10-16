/* TaskTrack — Calendar page (Monday-first month view) */
document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("cal-grid");
  const label = document.getElementById("month-label");
  const dayList = document.getElementById("day-list");
  const dayTitle = document.getElementById("day-title");
  const addOnDay = document.getElementById("add-on-day");

  const now = new Date();
  let viewYear = now.getFullYear();
  let viewMonth = now.getMonth();
  let selected = todayISO();

  const COLOR = { high: "var(--orange)", medium: "var(--blue)", low: "var(--green)" };

  function renderMonth() {
    const tasks = Store.all();
    const byDay = {};
    tasks.forEach(t => (byDay[t.due] = byDay[t.due] || []).push(t));
    Object.values(byDay).forEach(list => list.sort(byUrgency));

    const first = new Date(viewYear, viewMonth, 1);
    label.textContent = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });

    // Monday = 0 … Sunday = 6
    const lead = (first.getDay() + 6) % 7;
    const start = addDays(first, -lead);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = Math.ceil((lead + daysInMonth) / 7) * 7;

    let html = "";
    for (let i = 0; i < cells; i++) {
      const d = addDays(start, i);
      const iso = toISO(d);
      const list = byDay[iso] || [];
      const active = list.filter(t => t.status !== "done");
      const cls = [
        "cal-day",
        d.getMonth() !== viewMonth && "other",
        iso === todayISO() && "today",
        iso === selected && "selected",
        active.length >= 3 && "busy"
      ].filter(Boolean).join(" ");

      const chips = list.slice(0, 2).map(t => `
        <span class="cal-chip" style="background:${COLOR[t.priority]};${t.status === "done" ? "opacity:.45;text-decoration:line-through" : ""}"
              title="${escapeHTML(t.name)} (${capitalize(t.priority)})">${escapeHTML(t.name)}</span>`).join("");
      const more = list.length > 2 ? `<span class="cal-more">+${list.length - 2} more</span>` : "";

      html += `
        <div class="${cls}" data-date="${iso}" role="button" tabindex="0"
             aria-label="${d.toDateString()}, ${list.length} task${list.length === 1 ? "" : "s"}">
          <span class="cal-num">${d.getDate()}</span>${chips}${more}
        </div>`;
    }
    grid.innerHTML = html;
  }

  function renderDay() {
    const list = Store.all().filter(t => t.due === selected).sort(byUrgency);
    dayTitle.textContent = parseISO(selected).toLocaleDateString(undefined, {
      weekday: "long", month: "long", day: "numeric", year: "numeric"
    });
    dayList.innerHTML = list.length
      ? list.map(taskRowHTML).join("")
      : `<div class="empty">No deadlines on this day.</div>`;
    addOnDay.href = `add-task.html?date=${selected}`;
  }

  function renderAll() { renderMonth(); renderDay(); }

  function selectDate(iso) {
    selected = iso;
    const d = parseISO(iso);
    if (d.getMonth() !== viewMonth || d.getFullYear() !== viewYear) {
      viewMonth = d.getMonth();
      viewYear = d.getFullYear();
    }
    renderAll();
  }

  grid.addEventListener("click", e => {
    const cell = e.target.closest(".cal-day");
    if (cell) selectDate(cell.dataset.date);
  });
  grid.addEventListener("keydown", e => {
    const cell = e.target.closest(".cal-day");
    if (cell && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); selectDate(cell.dataset.date); }
  });

  document.getElementById("prev").addEventListener("click", () => {
    viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } renderMonth();
  });
  document.getElementById("next").addEventListener("click", () => {
    viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } renderMonth();
  });
  document.getElementById("today-btn").addEventListener("click", () => selectDate(todayISO()));

  bindTaskActions(dayList, renderAll);
  renderAll();
});
