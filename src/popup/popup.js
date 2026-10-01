(function initPopup() {
  const elements = {
    site: document.getElementById("site"),
    status: document.getElementById("status"),
    metrics: document.getElementById("metrics"),
    matched: document.getElementById("matched"),
    high: document.getElementById("high"),
    required: document.getElementById("required"),
    preview: document.getElementById("preview"),
    previewList: document.getElementById("preview-list"),
    toggleSelection: document.getElementById("toggle-selection"),
    manualTarget: document.getElementById("manual-target"),
    manualNav: document.getElementById("manual-nav"),
    manualNavToggle: document.getElementById("manual-nav-toggle"),
    manualNavLabel: document.getElementById("manual-nav-label"),
    manualNavMenu: document.getElementById("manual-nav-menu"),
    manualSearch: document.getElementById("manual-search"),
    manualList: document.getElementById("manual-list"),
    manualEmpty: document.getElementById("manual-empty"),
    overwrite: document.getElementById("overwrite"),
    scan: document.getElementById("scan"),
    fill: document.getElementById("fill"),
    options: document.getElementById("options"),
    tracker: document.getElementById("tracker")
  };
  let activeTab;
  const CONTENT_SCRIPT_FILES = [
    "src/shared/defaults.js",
    "src/shared/utils.js",
    "src/shared/fields.js",
    "src/shared/manual-fields.js",
    "src/shared/applications.js",
    "src/shared/storage.js",
    "src/content/site-adapters.js",
    "src/content/form-analyzer.js",
    "src/content/matcher.js",
    "src/content/filler.js",
    "src/content/content-script.js"
  ];
  let manualEntries = [];
  let manualCategory = "all";
  let busy = false;

  function setStatus(text, type = "info") {
    elements.status.textContent = text;
    elements.status.className = `status ${type}`;
  }

  function setBusy(value) {
    busy = value;
    elements.scan.disabled = value;
    elements.overwrite.disabled = value;
    elements.toggleSelection.disabled = value;
    elements.previewList.classList.toggle("busy", value);
    elements.previewList.setAttribute("aria-busy", String(value));
    updateFillButton();
  }

  function tabSite(tab) {
    try {
      return tab?.url ? new URL(tab.url).hostname || new URL(tab.url).protocol.replace(":", "") : "未知页面";
    } catch (_) {
      return "未知页面";
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  }

  function reviewRows() {
    return Array.from(elements.previewList.querySelectorAll(".review-row")).map((row) => ({
      row,
      check: row.querySelector(".review-check-input"),
      input: row.querySelector(".review-value")
    }));
  }

  function updateFillButton() {
    const rows = reviewRows().filter(({ check, input }) => check.checked && !check.disabled && input.value.trim());
    elements.fill.textContent = `填写所选 ${rows.length} 项`;
    elements.fill.disabled = busy || rows.length === 0;
    const selectable = reviewRows().filter(({ check, input }) => !check.disabled && input.value.trim());
    const allSelected = selectable.length > 0 && selectable.every(({ check }) => check.checked);
    elements.toggleSelection.textContent = allSelected ? "取消全选" : "全选可填写";
    elements.toggleSelection.disabled = busy || selectable.length === 0;
  }

  function syncOverwriteState() {
    reviewRows().forEach(({ row, check }) => {
      const hasExistingValue = row.dataset.hasExisting === "true";
      check.disabled = hasExistingValue && !elements.overwrite.checked;
      if (check.disabled) check.checked = false;
    });
    updateFillButton();
  }

  function reviewValueControl(item) {
    const value = String(item.value ?? "");
    if (value.includes("\n") || value.length > 80 || item.type === "textarea" || item.type === "contenteditable") {
      return `<textarea class="review-value" maxlength="50000" aria-label="${escapeHtml(item.field)}本次填写值">${escapeHtml(value)}</textarea>`;
    }
    return `<input class="review-value" type="text" maxlength="50000" value="${escapeHtml(value)}" aria-label="${escapeHtml(item.field)}本次填写值">`;
  }

  function renderSummary(summary) {
    const fields = Array.isArray(summary.fields) ? summary.fields : [];
    elements.site.textContent = `${summary.adapter} · ${summary.site}`;
    elements.metrics.hidden = false;
    elements.matched.textContent = summary.matched;
    elements.high.textContent = summary.levels.high;
    elements.required.textContent = summary.requiredUnmatched;
    elements.preview.hidden = fields.length === 0;
    elements.previewList.innerHTML = fields.map((item) => {
      const confidence = Math.round(item.confidence * 100);
      const confidenceLevel = item.confidence >= 0.82 ? "high" : item.confidence >= 0.62 ? "medium" : "low";
      const existing = item.hasExistingValue
        ? `<p class="review-existing" title="${escapeHtml(item.existingValue)}">网页已有：${escapeHtml(String(item.existingValue).replace(/\s+/g, " ").slice(0, 120))}</p>`
        : "";
      return `
        <article class="review-row${item.hasExistingValue ? " has-existing" : ""}"
          data-review-id="${escapeHtml(item.id)}" data-field-label="${escapeHtml(item.field)}"
          data-review-signature="${escapeHtml(item.signature)}"
          data-has-existing="${item.hasExistingValue}">
          <div class="review-top">
            <label class="review-check">
              <input class="review-check-input" type="checkbox" ${item.hasExistingValue ? "" : "checked"}>
              <span>${escapeHtml(item.field)}${item.required ? " *" : ""}</span>
            </label>
            <span class="confidence ${confidenceLevel}">${confidence}%</span>
          </div>
          <p class="review-target" title="${escapeHtml(item.target)}">网页字段：${escapeHtml(item.target || item.field)}</p>
          <label class="review-value-label">
            <span>本次填写值${item.sensitive ? " · 敏感资料" : ""}</span>
            ${reviewValueControl(item)}
          </label>
          ${existing}
        </article>`;
    }).join("");
    syncOverwriteState();
  }

  function previewValue(entry) {
    if (entry.sensitive) return "敏感资料 · 点击填写";
    return entry.value.replace(/\s+/g, " ").slice(0, 80);
  }

  function manualCategories() {
    const counts = manualEntries.reduce((result, entry) => {
      result[entry.categoryKey] = (result[entry.categoryKey] || 0) + 1;
      return result;
    }, {});
    return globalThis.OfferCome.manualFields.CATEGORIES
      .filter((category) => counts[category.key])
      .map((category) => ({ ...category, count: counts[category.key] }));
  }

  function renderManualNavigation() {
    const categories = manualCategories();
    if (manualCategory !== "all" && !categories.some((category) => category.key === manualCategory)) manualCategory = "all";
    const selected = categories.find((category) => category.key === manualCategory);
    elements.manualNavLabel.textContent = `导航 · ${selected?.label || "全部资料"}`;
    const options = [{ key: "all", label: "全部资料", count: manualEntries.length }, ...categories];
    elements.manualNavMenu.innerHTML = options.map((category) => `
      <button class="manual-nav-option${category.key === manualCategory ? " selected" : ""}" type="button"
        role="option" aria-selected="${category.key === manualCategory}" data-manual-category="${escapeHtml(category.key)}">
        <span>${escapeHtml(category.label)}</span><span class="manual-nav-count">${category.count}</span>
      </button>`).join("");
  }

  function setManualNavigationOpen(open) {
    elements.manualNavMenu.hidden = !open;
    elements.manualNavToggle.setAttribute("aria-expanded", String(open));
  }

  function renderManualEntries(query = "") {
    const normalizedQuery = String(query).trim().toLowerCase();
    const filtered = manualEntries.filter((entry) => {
      if (manualCategory !== "all" && entry.categoryKey !== manualCategory) return false;
      return !normalizedQuery || [entry.label, entry.value, entry.groupLabel, entry.categoryLabel]
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
    const groups = new Map();
    filtered.forEach((entry) => {
      if (!groups.has(entry.groupLabel)) groups.set(entry.groupLabel, []);
      groups.get(entry.groupLabel).push(entry);
    });
    elements.manualList.innerHTML = Array.from(groups.entries()).map(([groupLabel, entries]) => `
      <section class="manual-group">
        <h3 class="manual-group-title">${escapeHtml(groupLabel)}</h3>
        ${entries.map((entry) => `
          <button class="manual-field" type="button" data-manual-key="${escapeHtml(entry.key)}" title="填写 ${escapeHtml(entry.label)}">
            <span class="manual-field-label">${escapeHtml(entry.label)}</span>
            <span class="manual-field-value">${escapeHtml(previewValue(entry))}</span>
          </button>`).join("")}
      </section>`).join("");
    elements.manualEmpty.hidden = filtered.length > 0;
  }

  function renderManualTarget(target) {
    if (!target) {
      elements.manualTarget.textContent = "先点击网页中要填写的框，再点下方资料。";
      elements.manualTarget.classList.remove("ready");
      return;
    }
    elements.manualTarget.textContent = `当前目标：${target.label || target.type || "输入框"}`;
    elements.manualTarget.classList.add("ready");
  }

  async function loadManualEntries() {
    const OfferCome = globalThis.OfferCome;
    const key = OfferCome.STORAGE_KEYS.profile;
    const stored = await chrome.storage.local.get(key);
    const profile = OfferCome.utils.mergeDefaults(OfferCome.createDefaultProfile(), stored[key]);
    manualEntries = OfferCome.manualFields.buildEntries(profile);
    renderManualNavigation();
    renderManualEntries(elements.manualSearch.value);
  }

  async function refreshManualTarget() {
    try {
      const response = await send("OFFERCOME_MANUAL_STATE");
      renderManualTarget(response?.ok ? response.target : null);
    } catch (_) {
      renderManualTarget(null);
    }
  }

  async function manualFill(entry, button) {
    button.disabled = true;
    setStatus(`正在把“${entry.label}”填写到选中的框…`);
    try {
      const response = await send("OFFERCOME_MANUAL_FILL", {
        path: entry.path,
        sectionIndex: entry.sectionIndex,
        overwriteExisting: elements.overwrite.checked
      });
      if (!response?.ok) throw new Error(response?.error || "定点填写失败");
      renderManualTarget(response.target);
      if (response.status === "filled") setStatus(`已将“${entry.label}”填入选中的框。请检查结果。`, "success");
      else setStatus(`未填写“${entry.label}”：${response.reason || "目标控件未接受该值"}。`, "info");
    } catch (error) {
      setStatus(`定点填写失败：${error.message}`, "error");
      await refreshManualTarget();
    } finally {
      button.disabled = false;
    }
  }

  async function injectContentScripts() {
    if (!activeTab?.id) throw new Error("没有可用的活动页面");
    await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: CONTENT_SCRIPT_FILES
    });
    await chrome.scripting.insertCSS({
      target: { tabId: activeTab.id },
      files: ["src/content/content.css"]
    }).catch(() => undefined);
  }

  async function send(type, extra = {}) {
    if (!activeTab?.id) throw new Error("没有可用的活动页面");
    try {
      return await chrome.tabs.sendMessage(activeTab.id, { type, ...extra });
    } catch (error) {
      const message = String(error?.message || error);
      const missingReceiver = /receiving end does not exist|could not establish connection|message port closed/i.test(message);
      if (!missingReceiver) throw error;
      await injectContentScripts();
      return chrome.tabs.sendMessage(activeTab.id, { type, ...extra });
    }
  }

  async function activateTab(tabId, { scanPage = true } = {}) {
    try {
      activeTab = tabId
        ? await chrome.tabs.get(tabId)
        : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
      elements.site.textContent = tabSite(activeTab);
      renderManualTarget(null);
      await refreshManualTarget();
      if (scanPage) await scan();
    } catch (error) {
      renderManualTarget(null);
      setStatus(`无法连接当前页面：${error.message}`, "error");
    }
  }

  async function scan() {
    setBusy(true);
    setStatus("正在分析当前页面…");
    try {
      const response = await send("OFFERCOME_SCAN");
      if (!response?.ok) throw new Error(response?.error || "扫描失败");
      renderSummary(response.summary);
      if (response.summary.matched && !Array.isArray(response.summary.fields)) {
        setStatus("当前页面仍在使用旧版脚本，请刷新招聘网页后重新扫描。", "error");
        return;
      }
      setStatus(`找到 ${response.summary.totalControls} 个控件，匹配 ${response.summary.matched} 个字段。`, response.summary.matched ? "success" : "info");
    } catch (error) {
      setStatus("无法连接当前页面。扩展已尝试重新加载脚本；若仍失败，请刷新普通网页后重试。", "error");
    } finally {
      setBusy(false);
    }
  }

  async function fill() {
    const items = reviewRows()
      .filter(({ check, input }) => check.checked && !check.disabled && input.value.trim())
      .map(({ row, input }) => ({
        id: row.dataset.reviewId,
        signature: row.dataset.reviewSignature,
        field: row.dataset.fieldLabel,
        value: input.value
      }));
    if (!items.length) {
      setStatus("请先勾选至少一个有填写值的字段。", "info");
      return;
    }
    setBusy(true);
    setStatus(`正在填写所选 ${items.length} 项，请不要切换页面…`);
    try {
      const response = await send("OFFERCOME_FILL", { items, overwriteExisting: elements.overwrite.checked });
      if (!response?.ok) throw new Error(response?.error || "填写失败");
      renderSummary(response.summary);
      const { filled, skipped, failed } = response.counts;
      const recorded = response.application
        ? " 已记录到求职工作台。"
        : response.recordingError
          ? " 填写已完成，但申请记录保存失败。"
          : "";
      const failedFields = (response.failures || []).slice(0, 6).map((item) => item.field).join("、");
      const failureHint = failedFields
        ? " 失败字段：" + failedFields + ((response.failures || []).length > 6 ? "等" : "") + "。"
        : "";
      setStatus("已填写 " + filled + " 项，跳过 " + skipped + " 项，失败 " + failed + " 项。" + failureHint + recorded + "请检查高亮字段后自行提交。", failed || response.recordingError ? "info" : "success");
    } catch (error) {
      setStatus(`填写失败：${error.message}`, "error");
    } finally {
      setBusy(false);
    }
  }

  elements.scan.addEventListener("click", scan);
  elements.fill.addEventListener("click", fill);
  elements.previewList.addEventListener("input", updateFillButton);
  elements.previewList.addEventListener("change", updateFillButton);
  elements.overwrite.addEventListener("change", syncOverwriteState);
  elements.toggleSelection.addEventListener("click", () => {
    const selectable = reviewRows().filter(({ check, input }) => !check.disabled && input.value.trim());
    const shouldSelect = selectable.some(({ check }) => !check.checked);
    selectable.forEach(({ check }) => { check.checked = shouldSelect; });
    updateFillButton();
  });
  elements.manualNavToggle.addEventListener("click", () => {
    setManualNavigationOpen(elements.manualNavMenu.hidden);
  });
  elements.manualNavMenu.addEventListener("click", (event) => {
    const option = event.target.closest("[data-manual-category]");
    if (!option) return;
    manualCategory = option.dataset.manualCategory;
    renderManualNavigation();
    renderManualEntries(elements.manualSearch.value);
    setManualNavigationOpen(false);
  });
  elements.manualSearch.addEventListener("input", () => renderManualEntries(elements.manualSearch.value));
  elements.manualList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-manual-key]");
    if (!button) return;
    const entry = manualEntries.find((item) => item.key === button.dataset.manualKey);
    if (entry) manualFill(entry, button);
  });
  elements.options.addEventListener("click", () => chrome.runtime.openOptionsPage());
  elements.tracker.addEventListener("click", () => chrome.tabs.create({ url: chrome.runtime.getURL("src/tracker/tracker.html") }));
  document.addEventListener("click", (event) => {
    if (!elements.manualNav.contains(event.target)) setManualNavigationOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setManualNavigationOpen(false);
  });

  chrome.runtime.onMessage.addListener((message, sender) => {
    if (message?.type !== "OFFERCOME_MANUAL_TARGET_CHANGED") return;
    if (sender.tab?.id && activeTab?.id && sender.tab.id !== activeTab.id) return;
    if (sender.tab) {
      activeTab = sender.tab;
      elements.site.textContent = tabSite(activeTab);
    }
    renderManualTarget(message.target || null);
  });

  chrome.tabs.onActivated.addListener(({ tabId }) => { void activateTab(tabId); });
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tabId === activeTab?.id && changeInfo.status === "complete") {
      activeTab = tab;
      void activateTab(tabId);
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (changes[globalThis.OfferCome.STORAGE_KEYS.profile]) void loadManualEntries();
    if (changes[globalThis.OfferCome.STORAGE_KEYS.settings]) {
      elements.overwrite.checked = Boolean(changes[globalThis.OfferCome.STORAGE_KEYS.settings].newValue?.overwriteExisting);
      syncOverwriteState();
    }
  });

  (async () => {
    const stored = await chrome.storage.local.get("offercome.settings");
    elements.overwrite.checked = Boolean(stored["offercome.settings"]?.overwriteExisting);
    syncOverwriteState();
    await loadManualEntries();
    await activateTab();
  })();
})();
