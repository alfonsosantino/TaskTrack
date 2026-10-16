/* TaskTrack — Add / Edit Task page
   Open add-task.html?id=<taskId> to edit an existing task.
   Open add-task.html?date=YYYY-MM-DD to pre-fill the due date (used by Calendar). */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("task-form");
  const params = new URLSearchParams(location.search);
  const editId = params.get("id");
  const editing = editId ? Store.get(editId) : null;

  // Suggest subjects the student already uses
  const subjects = [...new Set(Store.all().map(t => t.subject))].sort();
  document.getElementById("subject-list").innerHTML =
    subjects.map(s => `<option value="${escapeHTML(s)}">`).join("");

  form.due.value = params.get("date") || todayISO();

  if (editing) {
    document.title = "Edit Task • TaskTrack";
    document.getElementById("page-title").textContent = "Edit Task";
    document.getElementById("form-title").textContent = "Update Task";
    document.getElementById("save-btn").textContent = "UPDATE TASK";
    form.name.value = editing.name;
    form.subject.value = editing.subject;
    form.type.value = editing.type || "Other";
    form.due.value = editing.due;
    form.status.value = editing.status;
    form.description.value = editing.description || "";
    form.querySelector(`input[name="priority"][value="${editing.priority}"]`).checked = true;
  } else {
    // New tasks always start as "To Do"
    document.getElementById("status-row").style.display = "none";
  }

  // Validation: highlight the row and show the message underneath
  function validate() {
    let ok = true;
    ["name", "subject", "due"].forEach(field => {
      const row = form[field].closest(".form-row");
      const valid = form[field].value.trim() !== "";
      row.classList.toggle("invalid", !valid);
      if (!valid && ok) { form[field].focus(); ok = false; }
    });
    return ok;
  }
  form.addEventListener("input", e => {
    const row = e.target.closest(".form-row");
    if (row && e.target.value.trim()) row.classList.remove("invalid");
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!validate()) return;

    const data = {
      name: form.name.value.trim(),
      subject: form.subject.value.trim(),
      type: form.type.value,
      due: form.due.value,
      priority: form.querySelector('input[name="priority"]:checked').value,
      status: editing ? form.status.value : "todo",
      description: form.description.value.trim()
    };

    if (editing) {
      Store.update(editId, data);
      showToast("Task updated");
    } else {
      Store.add(data);
      showToast("Task saved");
    }
    setTimeout(() => (location.href = "index.html"), 700);
  });
});
