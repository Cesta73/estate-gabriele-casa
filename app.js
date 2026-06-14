const TASKS_KEY = "gabriele-summer-tasks-v1";
const ENTRIES_KEY = "gabriele-summer-entries-v1";
const ASSIGNMENTS_KEY = "gabriele-summer-assignments-v1";

const seedTasks = [
  { id: "vacuum-room", name: "Aspirapolvere in una stanza", pay: 1, symbol: "ASP", when: "Da concordare", kind: "agreement", rules: "Spostare quello che ingombra, raccogliere le immondizie grossolane, passare bene l'aspirapolvere e rimettere in ordine quanto spostato." },
  { id: "vacuum-living", name: "Aspirapolvere in salotto", pay: 2, symbol: "ASP", when: "Da concordare", kind: "agreement", rules: "Spostare quello che ingombra, raccogliere le immondizie grossolane, passare bene l'aspirapolvere e rimettere in ordine quanto spostato." },
  { id: "clean-vacuum", name: "Pulire l'aspirapolvere", pay: 1, symbol: "PUL", when: "Dopo aver aspirato", kind: "request", rules: "Pulire come da manuale e lasciare pulito l'ambiente." },
  { id: "kitchen", name: "Pulire banco cucina", pay: 3, symbol: "CUC", when: "Da concordare", kind: "agreement", rules: "Spostare tutto e pulire a fondo il piano, i fornelli e il lavandino." },
  { id: "dust", name: "Spolverare", pay: 2, symbol: "POL", when: "Da concordare", kind: "agreement", rules: "Spostare tutti gli oggetti, spolverare superficie e oggetti e riposizionarli al loro posto." },
  { id: "school-books", name: "Mettere in ordine i libri scolastici", pay: 2, symbol: "LIB", when: "Il prima possibile", kind: "request", rules: "Recuperare tutti i libri da tutta la casa e ordinarli, spolverando come necessario." },
  { id: "games", name: "Mettere in ordine i giochi", pay: 3, symbol: "GIO", when: "Il prima possibile", kind: "request", rules: "Recuperare tutti i giochi dalla casa e rimetterli in ordine con cura." },
  { id: "beds", name: "Rifare i letti", pay: 1, symbol: "LET", when: "Tutti i giorni", kind: "daily", rules: "Rifare i letti come a militare." },
  { id: "sheets", name: "Rifare i letti cambiando le lenzuola", pay: 2, symbol: "LET", when: "Da concordare", kind: "agreement", rules: "Farsi dare la biancheria, concordare l'aiuto di un adulto e farlo con lui." },
  { id: "floor-vacuum-room", name: "Preparare un pavimento: una stanza", pay: 1, symbol: "PAV", when: "Da concordare", kind: "agreement", rules: "Spostare gli ingombri, raccogliere lo sporco, passare bene l'aspirapolvere e rimettere in ordine." },
  { id: "floor-vacuum-living", name: "Preparare il pavimento del salotto", pay: 2, symbol: "PAV", when: "Da concordare", kind: "agreement", rules: "Spostare gli ingombri, raccogliere lo sporco, passare bene l'aspirapolvere e rimettere in ordine." },
  { id: "mop-room", name: "Lavare il pavimento di una stanza", pay: 1, symbol: "MOC", when: "Da concordare", kind: "agreement", rules: "Verificare di aver aspirato bene, lavare con il mocio e rimettere tutto in ordine una volta asciutto." },
  { id: "laundry-hang", name: "Stendere e raccogliere i panni", pay: 1, symbol: "PAN", when: "A richiesta", kind: "request", rules: "Stendere o raccogliere i panni con cura quando richiesto." },
  { id: "laundry-basket", name: "Portare i panni sporchi in lavanderia", pay: 1, symbol: "PAN", when: "A richiesta", kind: "request", rules: "Raccogliere i panni sporchi e portarli in lavanderia." },
  { id: "dishwasher", name: "Disfare e fare la lavastoviglie", pay: 1, symbol: "LAV", when: "A richiesta", kind: "request", rules: "Svuotare e riempire la lavastoviglie quando richiesto." },
  { id: "trash", name: "Mettere fuori i rifiuti giusti", pay: 1, symbol: "RIF", when: "Secondo calendario", kind: "request", rules: "Fare tutto il giro della casa, raccogliere i rifiuti e mettere fuori quelli giusti secondo calendario." },
  { id: "extra-half", name: "Lavoro extra da 0,50 euro", pay: 0.5, symbol: "EXT", when: "A richiesta", kind: "request", rules: "Piccolo lavoro extra da concordare con un genitore." },
  { id: "extra-one", name: "Lavoro extra da 1 euro", pay: 1, symbol: "EXT", when: "A richiesta", kind: "request", rules: "Lavoro extra da concordare con un genitore." },
  { id: "extra", name: "Extra a richiesta", pay: 2, symbol: "EXT", when: "Da concordare", kind: "agreement", rules: "Attivita da concordare di volta in volta." },
  { id: "cellar", name: "Aiutare papa a sistemare la taverna", pay: 2, perHour: true, symbol: "TAV", when: "Quando richiesto", kind: "request", rules: "Solo quando richiesto e in collaborazione con papa." }
];

let tasks = [...new Map([...seedTasks, ...read(TASKS_KEY, [])].map((task) => [task.id, task])).values()];
let entries = read(ENTRIES_KEY, []);
let assignments = read(ASSIGNMENTS_KEY, []);
let taskFilter = "all";
let historyFilter = "all";
let cloud = null;
let inviteCloud = null;
let cloudUser = null;
let family = null;
let member = null;
let familyMembers = [];
let cloudChannel = null;
let syncTimer = null;
let syncState = "local";
let currentAssignmentId = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const money = (value) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value || 0);
const dateText = (value) => new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
const today = () => new Date().toISOString().slice(0, 10);
const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || structuredClone(fallback); }
  catch { return structuredClone(fallback); }
}
function save() {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
  scheduleCloudSave();
}
function taskById(id) { return tasks.find((task) => task.id === id); }
function isParent() { return member ? member.role === "owner" || member.role === "adult" : !cloudConfigured(); }
function isOwner() { return member?.role === "owner"; }
function roleLabel(role) { return { owner: "Genitore proprietario", adult: "Genitore", child: "Figlio" }[role] || "Membro"; }
function entryValue(entry) {
  const task = taskById(entry.taskId);
  return task ? task.pay * entry.quantity : entry.value || 0;
}
function statusLabel(status) {
  return { pending: "Da controllare", approved: "Approvato", redo: "Da sistemare", paid: "Pagato" }[status] || status;
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function cloudConfigured() {
  const config = window.APP_CONFIG || {};
  return Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase);
}

function setSyncState(state, label) {
  syncState = state;
  $("#syncButton").className = `sync-chip ${state}`;
  $("#syncLabel").textContent = label;
  $("#settingsSyncTitle").textContent = family ? `Sincronizzato: ${family.name}` : "Dati su questo dispositivo";
  $("#settingsSyncText").textContent = family
    ? `Accesso come ${member?.display_name || cloudUser?.email || "membro della famiglia"}.`
    : "Collega la famiglia per condividere avanzamenti e controlli tra piu dispositivi.";
}

function scheduleCloudSave() {
  if (!cloud || !family) return;
  clearTimeout(syncTimer);
  setSyncState("syncing", "Sincronizzazione...");
  syncTimer = setTimeout(syncNow, 450);
}

function entryTimestamp(entry) {
  return entry.paidAt || entry.reviewedAt || entry.updatedAt || entry.createdAt || "";
}

function mergeRemoteState(remoteTasks = [], remoteEntries = [], remoteAssignments = []) {
  const mergedTasks = [...new Map([...tasks, ...remoteTasks].map((task) => [task.id, task])).values()];
  const entryMap = new Map(remoteEntries.map((entry) => [entry.id, entry]));
  entries.forEach((localEntry) => {
    const remoteEntry = entryMap.get(localEntry.id);
    if (!remoteEntry || entryTimestamp(localEntry) > entryTimestamp(remoteEntry)) entryMap.set(localEntry.id, localEntry);
  });
  const mergedEntries = [...entryMap.values()];
  const assignmentMap = new Map(remoteAssignments.map((assignment) => [assignment.id, assignment]));
  assignments.forEach((localAssignment) => {
    const remoteAssignment = assignmentMap.get(localAssignment.id);
    if (!remoteAssignment || entryTimestamp(localAssignment) > entryTimestamp(remoteAssignment)) assignmentMap.set(localAssignment.id, localAssignment);
  });
  const mergedAssignments = [...assignmentMap.values()];
  const remoteChanged = JSON.stringify(mergedTasks) !== JSON.stringify(remoteTasks)
    || JSON.stringify(mergedEntries) !== JSON.stringify(remoteEntries)
    || JSON.stringify(mergedAssignments) !== JSON.stringify(remoteAssignments);
  tasks = mergedTasks;
  entries = mergedEntries;
  assignments = mergedAssignments;
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
  return remoteChanged;
}

async function syncNow() {
  if (!cloud || !family) return;
  setSyncState("syncing", "Sincronizzazione...");
  const { error } = await cloud.from("family_state").upsert({
    family_id: family.id,
    tasks,
    entries,
    assignments,
    updated_at: new Date().toISOString()
  });
  if (error) {
    console.error(error);
    setSyncState("local", "Sincronizzazione non riuscita");
    showToast("Salvato sul dispositivo. Sincronizzazione non riuscita.");
    return;
  }
  setSyncState("online", "Dati sincronizzati");
}

async function loadFamily() {
  if (!cloud || !cloudUser) return;
  const { data, error } = await cloud.rpc("get_my_family");
  if (error) {
    console.error(error);
    showToast("Impossibile leggere la famiglia.");
    return;
  }
  const info = data?.[0];
  if (!info) {
    family = null;
    member = null;
    setSyncState("local", "Account collegato");
    renderSyncDialog();
    return;
  }
  family = { id: info.family_id, name: info.family_name };
  member = { display_name: info.display_name, role: info.member_role };
  applyRole();
  const { data: membersData } = await cloud.rpc("get_family_members");
  familyMembers = membersData || [];
  const { data: remote, error: stateError } = await cloud.from("family_state").select("*").eq("family_id", family.id).single();
  if (stateError) {
    console.error(stateError);
    showToast("Impossibile caricare i dati condivisi.");
    return;
  }
  if (remote.tasks?.length || remote.entries?.length || remote.assignments?.length) {
    const needsUpload = mergeRemoteState(remote.tasks, remote.entries, remote.assignments);
    if (needsUpload) await syncNow();
  } else if (tasks.length || entries.length) {
    await syncNow();
  }
  subscribeToFamily();
  setSyncState("online", "Dati sincronizzati");
  renderAll();
  renderSyncDialog();
}

function subscribeToFamily() {
  if (cloudChannel) cloud.removeChannel(cloudChannel);
  cloudChannel = cloud.channel(`family-${family.id}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "family_state", filter: `family_id=eq.${family.id}` }, (payload) => {
      const needsUpload = mergeRemoteState(payload.new.tasks, payload.new.entries, payload.new.assignments);
      if (needsUpload) scheduleCloudSave();
      setSyncState("online", "Dati aggiornati");
      renderAll();
    }).subscribe();
}

async function initCloud() {
  if (!cloudConfigured()) {
    setSyncState("local", "Solo su questo dispositivo");
    return;
  }
  cloud = window.supabase.createClient(window.APP_CONFIG.supabaseUrl, window.APP_CONFIG.supabaseAnonKey);
  inviteCloud = window.supabase.createClient(window.APP_CONFIG.supabaseUrl, window.APP_CONFIG.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "estate-gabriele-invite-mailer" }
  });
  const { data } = await cloud.auth.getSession();
  cloudUser = data.session?.user || null;
  if (cloudUser) await loadFamily();
  else setSyncState("local", "Accedi per sincronizzare");
  cloud.auth.onAuthStateChange((_event, session) => {
    const previousId = cloudUser?.id;
    cloudUser = session?.user || null;
    if (cloudUser && cloudUser.id !== previousId) setTimeout(loadFamily, 0);
    if (!cloudUser) {
      family = null;
      member = null;
      familyMembers = [];
      applyRole();
      setSyncState("local", "Accedi per sincronizzare");
      renderSyncDialog();
    }
  });
}

function applyRole() {
  document.body.classList.remove("child-mode", "parent-mode", "adult-mode", "guest-mode");
  if (!member) {
    if (cloudConfigured()) document.body.classList.add("guest-mode");
    $("#roleChip").classList.add("hidden");
    $$('[data-section="review"]').forEach((item) => item.classList.toggle("hidden", cloudConfigured()));
    return;
  }
  document.body.classList.add(member.role === "child" ? "child-mode" : "parent-mode");
  if (member.role === "adult") document.body.classList.add("adult-mode");
  $("#roleChip").textContent = roleLabel(member.role);
  $("#roleChip").classList.remove("hidden");
  const reviewItems = $$('[data-section="review"]');
  reviewItems.forEach((item) => item.classList.toggle("hidden", member.role === "child"));
  if (member.role === "child" && $("#review").classList.contains("active")) navigate("dashboard");
  $("#pageTitle").textContent = member.role === "child" ? `Ciao, ${member.display_name}!` : `Ciao, ${member.display_name}`;
}

function renderTaskCard(task) {
  return `<article class="task-card">
    <div class="task-card-top"><span class="task-symbol">${task.symbol}</span><span class="pay-pill">${money(task.pay)}${task.perHour ? " / ora" : ""}</span></div>
    <h3>${safe(task.name)}</h3><p>${safe(task.rules || "Regole da concordare insieme.")}</p>
    <div class="task-footer"><span class="when-pill">${safe(task.when || "Da concordare")}</span><div>${isParent() ? `<button class="suggest-button" data-suggest="${task.id}">Suggerisci</button>` : ""} <button class="do-button" data-complete="${task.id}" aria-label="Registra ${safe(task.name)}">+</button></div></div>
  </article>`;
}

function renderTasks() {
  const query = $("#taskSearch").value.trim().toLowerCase();
  const filtered = tasks.filter((task) => (taskFilter === "all" || task.kind === taskFilter) && `${task.name} ${task.rules}`.toLowerCase().includes(query));
  $("#taskList").innerHTML = filtered.length ? filtered.map(renderTaskCard).join("") : `<div class="empty">Nessuna attivita trovata.</div>`;
  $("#suggestedTasks").innerHTML = tasks.slice(0, 4).map(renderTaskCard).join("");
}

function renderDashboard() {
  const pending = entries.filter((entry) => entry.status === "pending");
  const approved = entries.filter((entry) => entry.status === "approved");
  const paid = entries.filter((entry) => entry.status === "paid");
  const approvedValue = approved.reduce((sum, entry) => sum + entryValue(entry), 0);
  $("#approvedTotal").textContent = money(approvedValue);
  $("#paymentTotal").textContent = money(approvedValue);
  $("#pendingCount").textContent = pending.length;
  $("#completedCount").textContent = entries.length;
  $("#paidTotal").textContent = money(paid.reduce((sum, entry) => sum + entryValue(entry), 0));
  $("#payButton").disabled = !approved.length;

  const recent = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  $("#recentEntries").innerHTML = recent.length ? recent.map((entry) => {
    const task = taskById(entry.taskId);
    return `<div class="timeline-item"><span class="timeline-dot"></span><div><strong>${safe(task?.name || entry.taskName)}</strong><small>${dateText(entry.date)} &middot; ${money(entryValue(entry))}</small></div><span class="status status-${entry.status}">${statusLabel(entry.status)}</span></div>`;
  }).join("") : `<div class="empty">Qui appariranno i primi lavori registrati.</div>`;
}

function renderAssignments() {
  const visible = [...assignments]
    .filter((assignment) => assignment.date >= today() && assignment.status !== "dismissed")
    .sort((a, b) => a.date.localeCompare(b.date) || b.createdAt.localeCompare(a.createdAt));
  $("#assignmentList").innerHTML = visible.length ? visible.map((assignment) => {
    const task = taskById(assignment.taskId);
    const done = assignment.status === "done";
    return `<article class="assignment-card ${done ? "done" : ""}">
      <span class="status ${done ? "status-approved" : "status-pending"}">${done ? "Completata" : assignment.date === today() ? "Per oggi" : dateText(assignment.date)}</span>
      <h3>${safe(task?.name || assignment.taskName)}</h3>
      <p>${safe(assignment.note || "Missione suggerita dalla famiglia.")}</p>
      <small>Suggerita da ${safe(assignment.suggestedBy || "un genitore")}</small>
      <div class="assignment-actions">
        ${!done ? `<button class="primary" data-complete="${assignment.taskId}" data-assignment="${assignment.id}">Segna svolta</button>` : ""}
        ${isParent() ? `<button class="danger" data-dismiss-assignment="${assignment.id}">Rimuovi</button>` : ""}
      </div>
    </article>`;
  }).join("") : `<div class="empty">Nessuna missione suggerita per oggi. Puoi sceglierne una liberamente.</div>`;
}

function renderReview() {
  if (!isParent()) return;
  const pending = entries.filter((entry) => entry.status === "pending");
  $("#reviewPendingCount").textContent = pending.length;
  $("#reviewPendingValue").textContent = money(pending.reduce((sum, entry) => sum + entryValue(entry), 0));
  $("#reviewBadge").textContent = pending.length;
  $("#reviewBadge").classList.toggle("hidden", !pending.length);
  $("#reviewList").innerHTML = pending.length ? pending.map((entry) => {
    const task = taskById(entry.taskId);
    return `<article class="review-card">
      <div><p>${dateText(entry.date)} &middot; ${task?.perHour ? `${entry.quantity} ore` : `quantita ${entry.quantity}`}</p><h3>${safe(task?.name || entry.taskName)}</h3><p>Nota: ${safe(entry.note || "Nessuna nota.")} &middot; <strong>${money(entryValue(entry))}</strong></p></div>
      <div class="review-note"><label for="note-${entry.id}">Nota del controllo</label><input id="note-${entry.id}" placeholder="Es. Ottimo lavoro, grazie!"></div>
      <div class="review-actions"><button class="redo" data-review="${entry.id}" data-result="redo">Da sistemare</button><button class="approve" data-review="${entry.id}" data-result="approved">Approva</button></div>
    </article>`;
  }).join("") : `<div class="empty">Nessun lavoro da controllare. Tutto in ordine.</div>`;
}

function renderHistory() {
  const filtered = [...entries].filter((entry) => historyFilter === "all" || entry.status === historyFilter).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  $("#historyRows").innerHTML = filtered.length ? filtered.map((entry) => {
    const task = taskById(entry.taskId);
    const control = entry.adultNote ? `${safe(entry.adultNote)}${entry.reviewedBy ? `<br><small>di ${safe(entry.reviewedBy)}</small>` : ""}` : "-";
    const undoApproval = isParent() && entry.status === "approved"
      ? `<button class="undo-approval" data-undo-approval="${entry.id}">Annulla approvazione</button>`
      : "";
    return `<tr><td>${dateText(entry.date)}</td><td><strong>${safe(task?.name || entry.taskName)}</strong></td><td>${safe(entry.submittedBy || "-")}</td><td>${safe(entry.note || "-")}</td><td>${control}</td><td><span class="status status-${entry.status}">${statusLabel(entry.status)}</span>${undoApproval}</td><td><strong>${money(entryValue(entry))}</strong></td></tr>`;
  }).join("") : `<tr><td colspan="7"><div class="empty">Nessuna voce in questa vista.</div></td></tr>`;
}

function renderAll() {
  renderTasks();
  renderDashboard();
  renderAssignments();
  renderReview();
  renderHistory();
}

function navigate(section) {
  if (section === "review" && !isParent()) section = "dashboard";
  $$(".page").forEach((page) => page.classList.toggle("active", page.id === section));
  $$(".nav-item[data-section]").forEach((item) => item.classList.toggle("active", item.dataset.section === section));
  const greeting = member?.display_name ? `Ciao, ${member.display_name}!` : "Ciao, Gabriele!";
  const titles = { dashboard: greeting, tasks: "Le tue missioni", review: "Controllo genitori", history: "Il diario di famiglia" };
  $("#pageTitle").textContent = titles[section];
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openComplete(taskId, assignmentId = null) {
  const task = taskById(taskId);
  currentAssignmentId = assignmentId;
  $("#completeTaskId").value = task.id;
  $("#completeTitle").textContent = task.name;
  $("#completeRule").textContent = task.rules;
  $("#completeDate").value = today();
  $("#completeQuantity").value = 1;
  $("#completeNote").value = "";
  $("#quantityLabel").firstChild.textContent = task.perHour ? "Quante ore?" : "Quante volte?";
  updateCalculatedPay();
  $("#completeDialog").showModal();
}

function openSuggest(taskId = "") {
  if (!isParent()) return;
  $("#suggestTask").innerHTML = tasks.map((task) => `<option value="${task.id}" ${task.id === taskId ? "selected" : ""}>${safe(task.name)} · ${money(task.pay)}</option>`).join("");
  $("#suggestDate").value = today();
  $("#suggestNote").value = "";
  $("#suggestDialog").showModal();
}

function updateCalculatedPay() {
  const task = taskById($("#completeTaskId").value);
  $("#calculatedPay").textContent = money(task ? task.pay * Number($("#completeQuantity").value || 0) : 0);
}

function renderSyncDialog() {
  const configured = cloudConfigured();
  $("#syncUnavailable").classList.toggle("hidden", configured);
  $("#authStep").classList.toggle("hidden", !configured || Boolean(cloudUser));
  $("#familyStep").classList.toggle("hidden", !configured || !cloudUser || Boolean(family));
  $("#connectedStep").classList.toggle("hidden", !configured || !family);
  if (family) {
    $("#connectedFamilyName").textContent = family.name;
    $("#connectedUserName").textContent = `${member?.display_name || cloudUser?.email} · ${roleLabel(member?.role)} · ${cloudUser?.email || ""}`;
    $("#connectedHelp").textContent = isParent()
      ? "Ogni persona accede dal proprio smartphone tramite il link ricevuto via email ed e riconosciuta automaticamente."
      : "Sei riconosciuto come figlio. Puoi vedere e registrare le missioni, mentre i controlli restano ai genitori.";
    $("#familyMemberList").innerHTML = familyMembers.length ? familyMembers.map((person) => `<div class="family-member"><div><strong>${safe(person.display_name)}</strong><small>${safe(person.email)}${person.member_status === "invited" ? " · link inviato, accesso non ancora effettuato" : ""}</small></div><span class="member-role">${roleLabel(person.member_role)}</span></div>`).join("") : "";
  }
}

function openSyncDialog() {
  renderSyncDialog();
  $("#syncDialog").showModal();
}

document.addEventListener("click", (event) => {
  const close = event.target.closest(".dialog-close");
  if (close) close.closest("dialog").close();
  const nav = event.target.closest("[data-section], [data-go]");
  if (nav) navigate(nav.dataset.section || nav.dataset.go);
  const complete = event.target.closest("[data-complete]");
  if (complete) openComplete(complete.dataset.complete, complete.dataset.assignment || null);
  const suggest = event.target.closest("[data-suggest]");
  if (suggest) openSuggest(suggest.dataset.suggest);
  const dismiss = event.target.closest("[data-dismiss-assignment]");
  if (dismiss && isParent()) {
    const assignment = assignments.find((item) => item.id === dismiss.dataset.dismissAssignment);
    assignment.status = "dismissed";
    assignment.updatedAt = new Date().toISOString();
    save(); renderAll(); showToast("Missione rimossa dalla bacheca.");
  }
  const review = event.target.closest("[data-review]");
  if (review && isParent()) {
    const entry = entries.find((item) => item.id === review.dataset.review);
    entry.status = review.dataset.result;
    entry.adultNote = $(`#note-${entry.id}`).value.trim();
    entry.reviewedBy = member?.display_name || "Adulto";
    entry.reviewedAt = new Date().toISOString();
    save(); renderAll();
    showToast(entry.status === "approved" ? "Lavoro approvato." : "Nota inviata a Gabriele.");
  }
  const undoApproval = event.target.closest("[data-undo-approval]");
  if (undoApproval && isParent()) {
    const entry = entries.find((item) => item.id === undoApproval.dataset.undoApproval);
    if (!entry || entry.status !== "approved") return;
    if (!confirm("Annullare l'approvazione e riportare il lavoro tra quelli da controllare?")) return;
    entry.status = "pending";
    entry.adultNote = "";
    entry.reviewedBy = "";
    entry.reviewedAt = "";
    entry.updatedAt = new Date().toISOString();
    save(); renderAll(); showToast("Approvazione annullata. Il lavoro e di nuovo da controllare.");
  }
});

$("#completeQuantity").addEventListener("input", updateCalculatedPay);
$("#completeForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const task = taskById($("#completeTaskId").value);
  entries.push({
    id: crypto.randomUUID(), taskId: task.id, taskName: task.name,
    date: $("#completeDate").value, quantity: Number($("#completeQuantity").value),
    note: $("#completeNote").value.trim(), submittedBy: member?.display_name || "Gabriele",
    status: "pending", createdAt: new Date().toISOString()
  });
  if (currentAssignmentId) {
    const assignment = assignments.find((item) => item.id === currentAssignmentId);
    if (assignment) {
      assignment.status = "done";
      assignment.completedBy = member?.display_name || "Gabriele";
      assignment.updatedAt = new Date().toISOString();
    }
  }
  currentAssignmentId = null;
  save(); renderAll(); $("#completeDialog").close(); showToast("Missione inviata al controllo.");
});

$("#customTaskButton").addEventListener("click", () => { if (isParent()) $("#customDialog").showModal(); });
$("#customForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!isParent()) return;
  tasks.push({
    id: `custom-${crypto.randomUUID()}`, name: $("#customName").value.trim(), pay: Number($("#customPay").value),
    symbol: "NEW", when: $("#customWhen").value.trim() || "Da concordare", kind: "agreement",
    rules: $("#customRules").value.trim() || "Regole da concordare insieme.", addedBy: member?.display_name || "Adulto"
  });
  save(); renderAll(); $("#customDialog").close(); event.target.reset(); showToast("Nuova attivita aggiunta.");
});

$("#newSuggestionButton").addEventListener("click", () => openSuggest());
$("#suggestForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!isParent()) return;
  const task = taskById($("#suggestTask").value);
  assignments.push({
    id: crypto.randomUUID(), taskId: task.id, taskName: task.name, date: $("#suggestDate").value,
    note: $("#suggestNote").value.trim(), status: "suggested",
    suggestedBy: member?.display_name || "Genitore", createdAt: new Date().toISOString()
  });
  save(); renderAll(); $("#suggestDialog").close(); showToast("Missione aggiunta alla bacheca.");
});

$("#taskSearch").addEventListener("input", renderTasks);
$("#taskFilters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  taskFilter = button.dataset.filter;
  $$("#taskFilters .filter").forEach((item) => item.classList.toggle("active", item === button));
  renderTasks();
});
$("#historyFilters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-status]");
  if (!button) return;
  historyFilter = button.dataset.status;
  $$("#historyFilters .filter").forEach((item) => item.classList.toggle("active", item === button));
  renderHistory();
});

$("#payButton").addEventListener("click", () => {
  if (!isParent()) return;
  const approved = entries.filter((entry) => entry.status === "approved");
  if (!approved.length) return;
  approved.forEach((entry) => {
    entry.status = "paid";
    entry.paidAt = new Date().toISOString();
    entry.paidBy = member?.display_name || "Adulto";
  });
  save(); renderAll(); showToast(`${money(approved.reduce((sum, entry) => sum + entryValue(entry), 0))} segnati come pagati.`);
});

$("#exportButton").addEventListener("click", () => {
  if (!isParent()) return;
  const header = "Data,Attivita,Nota,Stato,Nota controllo,Controllato da,Compenso\n";
  const rows = entries.map((entry) => {
    const task = taskById(entry.taskId);
    return [entry.date, task?.name || entry.taskName, entry.note, statusLabel(entry.status), entry.adultNote || "", entry.reviewedBy || "", entryValue(entry)].map((value) => `"${String(value || "").replaceAll('"', '""')}"`).join(",");
  }).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([header + rows], { type: "text/csv;charset=utf-8" }));
  link.download = `diario-gabriele-${today()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
});

$("#settingsButton").addEventListener("click", () => $("#dataDialog").showModal());
$("#syncButton").addEventListener("click", openSyncDialog);
$("#manageSyncButton").addEventListener("click", () => {
  $("#dataDialog").close();
  openSyncDialog();
});
$("#sendLinkButton").addEventListener("click", async () => {
  const email = $("#authEmail").value.trim();
  if (!email) return showToast("Inserisci il tuo indirizzo email.");
  const redirectTo = location.href.split("#")[0].split("?")[0];
  const { error } = await cloud.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
  if (error) return showToast(`Accesso non riuscito: ${error.message}`);
  showToast("Link di accesso inviato. Controlla la posta.");
});
$("#createFamilyButton").addEventListener("click", async () => {
  const name = $("#memberName").value.trim();
  const familyName = $("#familyName").value.trim();
  if (!name || !familyName) return showToast("Inserisci il tuo nome e il nome della famiglia.");
  const { error } = await cloud.rpc("create_family", { requested_name: familyName, member_name: name });
  if (error) return showToast(`Creazione non riuscita: ${error.message}`);
  await loadFamily();
  showToast("Famiglia creata e dati sincronizzati.");
});
$("#inviteMemberButton").addEventListener("click", async () => {
  if (!isOwner()) return;
  const name = $("#inviteName").value.trim();
  const email = $("#inviteEmail").value.trim().toLowerCase();
  const role = $("#inviteRole").value;
  if (!name || !email) return showToast("Inserisci nome ed email del familiare.");
  const { error } = await cloud.rpc("create_family_invitation", { invited_email: email, invited_name: name, invited_role: role });
  if (error) return showToast(`Invito non riuscito: ${error.message}`);
  const redirectTo = location.href.split("#")[0].split("?")[0];
  const { error: emailError } = await inviteCloud.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
  if (emailError) return showToast(`Invito registrato, ma email non inviata: ${emailError.message}`);
  $("#inviteName").value = "";
  $("#inviteEmail").value = "";
  await loadFamily();
  showToast(`Link di accesso inviato a ${name}.`);
});
$("#refreshButton").addEventListener("click", async () => {
  await loadFamily();
  showToast("Dati aggiornati.");
});
$("#signOutButton").addEventListener("click", async () => {
  if (cloudChannel) cloud.removeChannel(cloudChannel);
  await cloud.auth.signOut();
  $("#syncDialog").close();
  showToast("Uscita completata. I dati locali restano disponibili.");
});
$("#resetButton").addEventListener("click", () => {
  if (!isParent()) return;
  if (!confirm("Cancellare tutto il diario e i pagamenti?")) return;
  entries = []; assignments = []; save(); renderAll(); $("#dataDialog").close(); showToast("Diario e bacheca cancellati.");
});
$("#demoButton").addEventListener("click", () => {
  if (!isParent()) return;
  const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  entries = [
    { id: crypto.randomUUID(), taskId: "beds", date: today(), quantity: 1, note: "Fatto prima di colazione.", status: "pending", createdAt: new Date().toISOString() },
    { id: crypto.randomUUID(), taskId: "games", date: daysAgo(1), quantity: 1, note: "Ho diviso tutto nelle scatole.", status: "approved", adultNote: "Molto ordinato.", createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: crypto.randomUUID(), taskId: "dishwasher", date: daysAgo(2), quantity: 1, note: "", status: "paid", adultNote: "Ben fatto.", createdAt: new Date(Date.now() - 172800000).toISOString() },
    { id: crypto.randomUUID(), taskId: "dust", date: daysAgo(3), quantity: 1, note: "Ho fatto la mia camera.", status: "redo", adultNote: "Controlla anche la mensola alta.", createdAt: new Date(Date.now() - 259200000).toISOString() }
  ];
  assignments = [
    { id: crypto.randomUUID(), taskId: "beds", date: today(), note: "Prima di uscire, grazie.", status: "suggested", suggestedBy: member?.display_name || "Gianluca", createdAt: new Date().toISOString() }
  ];
  save(); renderAll(); $("#dataDialog").close(); showToast("Dati di esempio caricati.");
});

$("#todayLabel").textContent = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
renderAll();
renderSyncDialog();
applyRole();
initCloud();
