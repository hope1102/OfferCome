(function initTracker() {
  const OC = globalThis.OfferCome;
  const A = OC.applications;
  const elements = Object.fromEntries([
    "board", "empty", "stats", "search", "stage-filter", "active-count", "ended-count", "archived-count",
    "drawer", "backdrop", "drawer-title", "auto-tag", "position", "company", "location", "job-type", "stage",
    "source-url", "summary", "next-action", "notes", "review-outcome", "review-summary", "record-meta", "timeline", "open-source", "archive", "delete"
  ].map((id) => [id, document.getElementById(id)]));
  let applications = [];
  let currentView = "active";
  let selectedId = null;
  let isNew = false;

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  }

  function dateText(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  }

  function daysSince(value) {
    if (!value) return "";
    const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
    return days === 0 ? "今天更新" : `${days} 天前更新`;
  }

  function stageOptions() {
    return A.ALL_STAGES.map((item) => `<option value="${item.id}">${escapeHtml(item.label)}</option>`).join("");
  }

  function updateCounts() {
    const active = applications.filter((item) => !item.archived && A.ACTIVE_STAGES.some((stage) => stage.id === item.stage)).length;
    const ended = applications.filter((item) => !item.archived && A.ENDED_STAGES.some((stage) => stage.id === item.stage)).length;
    const archived = applications.filter((item) => item.archived).length;
    elements["active-count"].textContent = active;
    elements["ended-count"].textContent = ended;
    elements["archived-count"].textContent = archived;
    elements.stats.innerHTML = [
      [applications.length, "全部申请"],
      [applications.filter((item) => item.stage === "applied").length, "已投递"],
      [applications.filter((item) => item.stage === "interview").length, "面试中"],
      [applications.filter((item) => item.stage === "offer").length, "Offer"]
    ].map(([value, label]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join("");
  }

  function currentItems() {
    const query = elements.search.value.trim().toLowerCase();
    const selectedStage = elements["stage-filter"].value;
    return applications.filter((item) => {
      const inView = currentView === "archived"
        ? item.archived
        : !item.archived && (currentView === "active" ? A.ACTIVE_STAGES : A.ENDED_STAGES).some((stage) => stage.id === item.stage);
      const matchesStage = !selectedStage || item.stage === selectedStage;
      const haystack = `${item.position} ${item.company} ${item.location} ${item.sourceHost}`.toLowerCase();
      return inView && matchesStage && (!query || haystack.includes(query));
    });
  }

  function cardHtml(item) {
    const meta = [item.location, item.jobType, item.sourceHost].filter(Boolean);
    return `<article class="job-card" draggable="true" data-id="${escapeHtml(item.id)}">
      <h3>${escapeHtml(item.position)}</h3>
      <div class="company">${escapeHtml(item.company)}</div>
      <div class="card-meta">${meta.map((value) => `<span class="pill">${escapeHtml(value)}</span>`).join("")}</div>
      <div class="card-foot"><span>${dateText(item.appliedAt || item.filledAt || item.createdAt)}</span><span>${daysSince(item.updatedAt)}</span></div>
    </article>`;
  }

  function columnsForView() {
    if (currentView === "active") return A.ACTIVE_STAGES;
    if (currentView === "ended") return A.ENDED_STAGES;
    return [{ id: "archived", label: "已归档" }];
  }

  function renderBoard() {
    updateCounts();
    const items = currentItems();
    elements.board.hidden = items.length === 0;
    elements.empty.hidden = items.length !== 0;
    const columns = columnsForView();
    elements.board.innerHTML = columns.map((column) => {
      const cards = currentView === "archived" ? items : items.filter((item) => item.stage === column.id);
      return `<section class="column" data-stage="${column.id}">
        <header class="column-head">${escapeHtml(column.label)} <span>${cards.length}</span></header>
        <div class="card-list">${cards.map(cardHtml).join("")}</div>
      </section>`;
    }).join("");
    bindBoardEvents();
  }

  function bindBoardEvents() {
    elements.board.querySelectorAll(".job-card").forEach((card) => {
      card.addEventListener("click", () => openDrawer(card.dataset.id));
      card.addEventListener("dragstart", (event) => {
        card.classList.add("dragging");
        event.dataTransfer.setData("text/plain", card.dataset.id);
      });
      card.addEventListener("dragend", () => card.classList.remove("dragging"));
    });
    elements.board.querySelectorAll(".column").forEach((column) => {
      column.addEventListener("dragover", (event) => {
        if (currentView === "archived") return;
        event.preventDefault();
        column.classList.add("drag-over");
      });
      column.addEventListener("dragleave", () => column.classList.remove("drag-over"));
      column.addEventListener("drop", async (event) => {
        event.preventDefault();
        column.classList.remove("drag-over");
        if (currentView === "archived") return;
        await moveToStage(event.dataTransfer.getData("text/plain"), column.dataset.stage);
      });
    });
  }

  async function moveToStage(id, stage) {
    const item = applications.find((entry) => entry.id === id);
    if (!item || item.stage === stage) return;
    const now = new Date().toISOString();
    item.stage = stage;
    item.appliedAt = stage === "applied" && !item.appliedAt ? now : item.appliedAt;
    item.timeline = [...(item.timeline || []), { stage, at: now, note: `状态调整为${A.stageLabel(stage)}` }];
    await OC.storage.upsertApplication(item);
    await reload();
  }

  function setValue(id, value) {
    elements[id].value = value || "";
  }

  function renderTimeline(item) {
    const timeline = [...(item.timeline || [])].reverse();
    elements.timeline.innerHTML = timeline.length
      ? timeline.map((event) => `<div class="timeline-item"><strong>${escapeHtml(A.stageLabel(event.stage))}</strong><span>${dateText(event.at)}${event.note ? ` · ${escapeHtml(event.note)}` : ""}</span></div>`).join("")
      : '<div class="timeline-empty">保存后将开始记录状态变化。</div>';
  }

  function renderRecordMeta(item) {
    const stats = item.fillStats || {};
    const values = [
      ["记录方式", item.applicationMethod || "手动添加"],
      ["使用资料", item.resumeName || "未记录"],
      ["最近填写", item.filledAt ? `${stats.filled || 0} 成功 / ${stats.failed || 0} 失败` : "未使用自动填写"]
    ];
    elements["record-meta"].innerHTML = values.map(([label, value]) => `<div><strong>${escapeHtml(label)}</strong><span title="${escapeHtml(value)}">${escapeHtml(value)}</span></div>`).join("");
  }

  function openDrawer(id = null) {
    const item = id ? applications.find((entry) => entry.id === id) : null;
    isNew = !item;
    selectedId = item?.id || null;
    const draft = item || { position: "", company: "", location: "", jobType: "", stage: "saved", sourceUrl: "", summary: "", nextActionAt: "", notes: "", reviewOutcome: "", reviewSummary: "", timeline: [], archived: false };
    elements["drawer-title"].textContent = draft.position || "新申请";
    elements["auto-tag"].textContent = item?.filledAt ? "自动记录" : "手动记录";
    setValue("position", draft.position);
    setValue("company", draft.company);
    setValue("location", draft.location);
    setValue("job-type", draft.jobType);
    setValue("stage", draft.stage);
    setValue("source-url", draft.sourceUrl);
    setValue("summary", draft.summary);
    setValue("next-action", draft.nextActionAt ? String(draft.nextActionAt).slice(0, 10) : "");
    setValue("notes", draft.notes);
    setValue("review-outcome", draft.reviewOutcome);
    setValue("review-summary", draft.reviewSummary);
    elements.archive.textContent = draft.archived ? "取消归档" : "归档";
    elements.archive.hidden = isNew;
    elements.delete.hidden = isNew;
    elements["open-source"].disabled = !draft.sourceUrl;
    renderTimeline(draft);
    renderRecordMeta(draft);
    elements.backdrop.hidden = false;
    elements.drawer.classList.add("open");
    elements.drawer.setAttribute("aria-hidden", "false");
    setTimeout(() => elements.position.focus(), 100);
  }

  function closeDrawer() {
    elements.drawer.classList.remove("open");
    elements.drawer.setAttribute("aria-hidden", "true");
    elements.backdrop.hidden = true;
    selectedId = null;
    isNew = false;
  }

  async function saveDrawer() {
    const old = selectedId ? applications.find((item) => item.id === selectedId) : null;
    const position = elements.position.value.trim();
    const company = elements.company.value.trim();
    if (!position || !company) {
      alert("请至少填写职位名称和公司名称。");
      return;
    }
    const now = new Date().toISOString();
    const stage = elements.stage.value;
    const timeline = [...(old?.timeline || [])];
    if (!old) timeline.push({ stage, at: now, note: "手动创建申请记录" });
    else if (old.stage !== stage) timeline.push({ stage, at: now, note: `状态调整为${A.stageLabel(stage)}` });
    const saved = await OC.storage.upsertApplication({
      ...(old || {}),
      position,
      company,
      location: elements.location.value.trim(),
      jobType: elements["job-type"].value.trim(),
      stage,
      sourceUrl: elements["source-url"].value.trim(),
      summary: elements.summary.value.trim(),
      nextActionAt: elements["next-action"].value,
      notes: elements.notes.value.trim(),
      reviewOutcome: elements["review-outcome"].value,
      reviewSummary: elements["review-summary"].value.trim(),
      appliedAt: stage === "applied" ? (old?.appliedAt || now) : old?.appliedAt,
      timeline
    });
    selectedId = saved.id;
    await reload();
    closeDrawer();
  }

  async function archiveSelected() {
    const item = applications.find((entry) => entry.id === selectedId);
    if (!item) return;
    item.archived = !item.archived;
    item.timeline = [...(item.timeline || []), { stage: item.stage, at: new Date().toISOString(), note: item.archived ? "已归档" : "取消归档" }];
    await OC.storage.upsertApplication(item);
    await reload();
    closeDrawer();
  }

  async function deleteSelected() {
    const item = applications.find((entry) => entry.id === selectedId);
    if (!item || !confirm(`确定删除“${item.position}”的申请记录吗？此操作无法撤销。`)) return;
    await OC.storage.deleteApplication(item.id);
    await reload();
    closeDrawer();
  }

  function exportRecords() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), applications }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `offercome-applications-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function reload() {
    applications = await OC.storage.loadApplications();
    renderBoard();
  }

  elements.stage.innerHTML = stageOptions();
  elements["stage-filter"].innerHTML += A.ALL_STAGES.map((item) => `<option value="${item.id}">${escapeHtml(item.label)}</option>`).join("");
  document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => {
    currentView = tab.dataset.view;
    document.querySelectorAll(".tab").forEach((item) => item.classList.toggle("active", item === tab));
    elements["stage-filter"].value = "";
    renderBoard();
  }));
  elements.search.addEventListener("input", renderBoard);
  elements["stage-filter"].addEventListener("change", renderBoard);
  document.getElementById("add").addEventListener("click", () => openDrawer());
  document.getElementById("empty-add").addEventListener("click", () => openDrawer());
  document.getElementById("close").addEventListener("click", closeDrawer);
  elements.backdrop.addEventListener("click", closeDrawer);
  document.getElementById("save").addEventListener("click", () => saveDrawer().catch((error) => alert(error.message)));
  elements.archive.addEventListener("click", () => archiveSelected().catch((error) => alert(error.message)));
  elements.delete.addEventListener("click", () => deleteSelected().catch((error) => alert(error.message)));
  elements["open-source"].addEventListener("click", () => {
    const url = elements["source-url"].value.trim();
    if (url) globalThis.open(url, "_blank", "noopener");
  });
  elements["source-url"].addEventListener("input", () => { elements["open-source"].disabled = !elements["source-url"].value.trim(); });
  document.getElementById("export").addEventListener("click", exportRecords);
  document.getElementById("resume").addEventListener("click", () => chrome.runtime.openOptionsPage());
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeDrawer(); });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[OC.STORAGE_KEYS.applications]) reload();
  });
  reload().catch((error) => {
    elements.empty.hidden = false;
    elements.empty.querySelector("div").textContent = `加载失败：${error.message}`;
  });
})();
