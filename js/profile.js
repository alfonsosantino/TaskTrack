/* TaskTrack — Profile & Settings page */
document.addEventListener("DOMContentLoaded", () => {
  const s = Settings.get();
  const $ = id => document.getElementById(id);

  function renderHero() {
    const cur = Settings.get();
    const initials = cur.name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase();
    $("avatar").textContent = initials || "?";
    $("hero-name").textContent = cur.name;
    $("hero-sub").textContent = `${cur.program} • ${cur.year}`;
    $("hero-done").textContent = Store.all().filter(t => t.status === "done").length;
  }

  // Fill current values
  $("p-name").value = s.name;
  $("p-program").value = s.program;
  $("p-year").value = s.year;
  $("s-reminder").value = String(s.reminderDays);
  $("s-theme").checked = s.theme === "dark";
  $("s-notify").checked = s.notifications;

  $("profile-form").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("p-name").value.trim();
    if (!name) { $("p-name").focus(); return showToast("Please enter your name"); }
    Settings.set({ name, program: $("p-program").value.trim() || "—", year: $("p-year").value });
    renderHero();
    showToast("✓ Profile saved");
  });

  $("s-reminder").addEventListener("change", e => {
    Settings.set({ reminderDays: Number(e.target.value) });
    try { sessionStorage.removeItem("tasktrack.reminderDismissed"); } catch (err) {}
    showToast("✓ Reminder preference saved");
  });

  $("s-theme").addEventListener("change", e => {
    const theme = e.target.checked ? "dark" : "light";
    Settings.set({ theme });
    applyTheme(theme);
  });

  $("s-notify").addEventListener("change", e => {
    Settings.set({ notifications: e.target.checked });
    showToast(e.target.checked ? "Reminders turned on" : "Reminders turned off");
  });

  // Browser notification permission
  const browserBtn = $("s-browser");
  function syncBrowserBtn() {
    if (!("Notification" in window)) { browserBtn.textContent = "UNSUPPORTED"; browserBtn.disabled = true; return; }
    if (Notification.permission === "granted") { browserBtn.textContent = "ENABLED ✓"; browserBtn.disabled = true; }
    if (Notification.permission === "denied") { browserBtn.textContent = "BLOCKED"; browserBtn.disabled = true; }
  }
  browserBtn.addEventListener("click", async () => {
    try { await Notification.requestPermission(); } catch (e) {}
    syncBrowserBtn();
  });
  syncBrowserBtn();

  $("s-reset").addEventListener("click", async () => {
    if (await confirmDialog("Reset tasks?", "All your tasks will be replaced with the sample tasks.", "Reset")) {
      Store.reset();
      renderHero();
      showToast("Sample tasks restored");
    }
  });

  renderHero();
});
