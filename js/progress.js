/* TaskTrack — Progress board (To Do / In Progress / Completed) */
document.addEventListener("DOMContentLoaded", () => {
  const ORDER = ["todo", "progress", "done"];
  const COUNT_TEXT = {
    todo: n => `${n} task${n === 1 ? "" : "s"} remaining`,
    progress: n => `${n} task${n === 1 ? "" : "s"} in progress`,
    done: n => `${n} task${n === 1 ? "" : "s"} completed`
  };
  const columns = document.querySelectorAll(".column");

  function cardHTML(t) {
    const i = ORDER.indexOf(t.status);
    return `
      <article class="kcard" draggable="true" data-id="${t.id}">
        <div class="row">
          <strong>${t.status === "done" ? "✓ " : ""}${escapeHTML(t.name)}</strong>
          <span class="badge ${t.priority}">${capitalize(t.priority)}</span>
        </div>
        <div class="t-meta">${escapeHTML(t.subject)} • ${dueLabel(t.due)}</div>
        <div class="moves">
          ${i > 0 ? `<button class="btn ghost small" data-move="-1" aria-label="Move back">◀</button>` : ""}
          ${i < 2 ? `<button class="btn ghost small" data-move="1" aria-label="Move forward">▶</button>` : ""}
          <a class="icon-btn" href="add-task.html?id=${t.id}" aria-label="Edit task" style="margin-left:auto">✎</a>
        </div>
      </article>`;
  }

  function render() {
    const tasks = Store.all().sort(byUrgency);
    columns.forEach(col => {
      const status = col.dataset.status;
      const list = tasks.filter(t => t.status === status);
      col.querySelector(".col-body").innerHTML = list.length
        ? list.map(cardHTML).join("")
        : `<div class="empty">Drop tasks here</div>`;
      col.querySelector(".count").textContent = COUNT_TEXT[status](list.length);
    });

    // Weekly completion = tasks due this week (Mon–Sun) that are completed
    const t = new Date();
    const monday = addDays(t, -((t.getDay() + 6) % 7));
    const start = toISO(monday), end = toISO(addDays(monday, 6));
    const week = tasks.filter(x => x.due >= start && x.due <= end);
    const done = week.filter(x => x.status === "done").length;
    const pct = week.length ? Math.round((done / week.length) * 100) : 0;
    document.getElementById("weekly-pct").textContent = pct + "%";
    document.getElementById("weekly-fill").style.width = pct + "%";
    document.getElementById("weekly-note").textContent =
      `${done} of ${week.length} tasks due this week are done.`;
  }

  function move(id, status) {
    const task = Store.get(id);
    if (!task || task.status === status) return;
    Store.update(id, { status });
    showToast(status === "done" ? `🎉 “${task.name}” completed!` :
      `“${task.name}” moved to ${status === "todo" ? "To Do" : "In Progress"}`);
    render();
  }

  // Arrow buttons
  document.querySelector(".board").addEventListener("click", e => {
    const btn = e.target.closest("[data-move]");
    if (!btn) return;
    const id = btn.closest(".kcard").dataset.id;
    const next = ORDER[ORDER.indexOf(Store.get(id).status) + Number(btn.dataset.move)];
    if (next) move(id, next);
  });

  // Drag & drop
  document.addEventListener("dragstart", e => {
    const card = e.target.closest?.(".kcard");
    if (!card) return;
    card.classList.add("dragging");
    e.dataTransfer.setData("text/plain", card.dataset.id);
  });
  document.addEventListener("dragend", e => e.target.closest?.(".kcard")?.classList.remove("dragging"));
  columns.forEach(col => {
    col.addEventListener("dragover", e => { e.preventDefault(); col.classList.add("drag-over"); });
    col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
    col.addEventListener("drop", e => {
      e.preventDefault();
      col.classList.remove("drag-over");
      move(e.dataTransfer.getData("text/plain"), col.dataset.status);
    });
  });

  render();
});
