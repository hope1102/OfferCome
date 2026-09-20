(function initContentScript(global) {
  const OfferCome = global.OfferCome;
  let lastManualTarget = null;

  const MANUAL_TARGET_SELECTOR = [
    "input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='password']):not([disabled]):not([readonly])",
    "textarea:not([disabled]):not([readonly])",
    "select:not([disabled])",
    "[contenteditable='true']",
    "[role='combobox']:not([aria-disabled='true'])",
    "[aria-haspopup='listbox']:not([aria-disabled='true'])"
  ].join(",");
  let targetNotificationTimer;

  function notifyManualTargetChanged() {
    if (!chrome.runtime.sendMessage) return;
    try {
      const analysis = OfferCome.formAnalyzer.analyze();
      const delivery = chrome.runtime.sendMessage({
        type: "OFFERCOME_MANUAL_TARGET_CHANGED",
        target: manualTargetSummary(resolveManualControl(analysis))
      });
      delivery?.catch?.(() => undefined);
    } catch (_) { /* side panel may be closed */ }
  }

  function rememberManualTarget(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target];
    const target = path.find((node) => node instanceof Element && node.matches?.(MANUAL_TARGET_SELECTOR));
    if (target) {
      lastManualTarget = target;
      clearTimeout(targetNotificationTimer);
      targetNotificationTimer = setTimeout(notifyManualTargetChanged, 40);
    }
  }

  document.addEventListener("focusin", rememberManualTarget, true);
  document.addEventListener("pointerdown", rememberManualTarget, true);
  if (document.activeElement instanceof Element && document.activeElement.matches(MANUAL_TARGET_SELECTOR)) {
    lastManualTarget = document.activeElement;
  }

  function resolveManualControl(analysis) {
    if (!lastManualTarget?.isConnected) return null;
    return analysis.controls.find((control) => control.element === lastManualTarget) || null;
  }

  function manualTargetSummary(control) {
    if (!control) return null;
    const rawLabel = control.labelText || control.rawText.slice(0, 80) || control.name || control.id || "输入框";
    const label = [...new Set(String(rawLabel).trim().split(/\s+/).filter(Boolean))].join(" ");
    return {
      label,
      type: control.type,
      hasExistingValue: Boolean(control.existingValue)
    };
  }

  async function getContext() {
    const keys = [OfferCome.STORAGE_KEYS.profile, OfferCome.STORAGE_KEYS.settings];
    const stored = await chrome.storage.local.get(keys);
    const profile = OfferCome.utils.mergeDefaults(OfferCome.createDefaultProfile(), stored[keys[0]]);
    const settings = OfferCome.utils.mergeDefaults(OfferCome.createDefaultSettings(), stored[keys[1]]);
    const analysis = OfferCome.formAnalyzer.analyze();
    const pairs = OfferCome.matcher.matchAll(analysis.controls, profile, settings);
    return { profile, settings, analysis, pairs };
  }

  function confidenceLevel(value) {
    if (value >= 0.82) return "high";
    if (value >= 0.62) return "medium";
    return "low";
  }

  function summary(context) {
    const matched = context.pairs.filter((pair) => pair.match);
    const levels = { high: 0, medium: 0, low: 0 };
    matched.forEach((pair) => { levels[confidenceLevel(pair.match.confidence)] += 1; });
    return {
      site: location.hostname,
      title: document.title,
      adapter: context.analysis.adapter.name,
      totalControls: context.analysis.controls.length,
      matched: matched.length,
      requiredUnmatched: context.pairs.filter((pair) => pair.control.required && !pair.match).length,
      levels,
      preview: matched.slice(0, 12).map((pair) => ({
        field: pair.match.definition.label,
        target: pair.control.rawText.slice(0, 80),
        confidence: pair.match.confidence,
        hasExistingValue: Boolean(pair.control.existingValue)
      }))
    };
  }

  function visibleText(element) {
    if (!element || element.closest("[hidden], [aria-hidden='true']")) return "";
    const style = global.getComputedStyle?.(element);
    if (style && (style.display === "none" || style.visibility === "hidden")) return "";
    return String(element.textContent || element.getAttribute?.("content") || "").replace(/\s+/g, " ").trim();
  }

  function pickPageText(selectors, rejectPattern) {
    for (const selector of selectors) {
      for (const element of document.querySelectorAll(selector)) {
        const text = visibleText(element);
        if (text && text.length <= 120 && (!rejectPattern || !rejectPattern.test(text))) return text;
      }
    }
    return "";
  }

  function cleanTitle(value) {
    return String(value || "")
      .replace(/[|｜_-]\s*(校园招聘|社会招聘|招聘官网|招聘|网申|职位申请|申请职位).*$/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function pickLabeledValue(labels, rejectPattern) {
    const labelPattern = new RegExp(`^(${labels.join("|")})[：:]?$`);
    for (const element of document.querySelectorAll("label, dt, th, [class*='label'], [class*='title']")) {
      const label = visibleText(element);
      if (!labelPattern.test(label)) continue;
      const candidates = [element.nextElementSibling, element.parentElement?.querySelector("[class*='value'], dd, td")];
      for (const candidate of candidates) {
        const text = visibleText(candidate);
        if (text && text !== label && text.length <= 120 && (!rejectPattern || !rejectPattern.test(text))) return text;
      }
    }
    return "";
  }

  function extractJobMetadata() {
    const formHeading = /填写简历|个人信息|基本信息|教育经历|工作经历|实习经历|家庭成员|学生会|社团活动|申请信息|简历投递/;
    const position = pickLabeledValue(["应聘职位", "申请职位", "职位名称", "应聘岗位", "申请岗位"], formHeading) || pickPageText([
      "[class*='job-title']", "[class*='jobTitle']", "[class*='job-name']", "[class*='jobName']",
      "[class*='position-name']", "[class*='positionName']", "[data-testid*='job-title']", "main h1", "h1"
    ], formHeading) || cleanTitle(document.title) || "待补充职位名称";
    const company = pickLabeledValue(["公司名称", "招聘单位", "应聘公司"], /工作单位|实习单位|家庭成员|请填写/) || pickPageText([
      "[class*='company-name']", "[class*='companyName']", "[class*='corp-name']", "[class*='corpName']",
      "[class*='enterprise-name']", "[data-testid*='company']"
    ], /工作单位|实习单位|家庭成员|请填写/) || location.hostname;
    const jobLocation = pickLabeledValue(["工作地点", "工作城市", "职位地点"], /户籍|籍贯|家庭住址|现居住|请填写/) || pickPageText([
      "[class*='job-location']", "[class*='jobLocation']", "[class*='work-place']", "[class*='workPlace']",
      "[class*='position-location']", "[data-testid*='location']"
    ], /户籍|籍贯|家庭住址|现居住|请填写/);
    const description = document.querySelector("meta[name='description']")?.content || "";
    return {
      position,
      company,
      location: jobLocation,
      summary: description.slice(0, 500),
      sourceUrl: location.href,
      sourceHost: location.hostname
    };
  }

  async function recordApplication(counts, matchSummary, contextProfileName) {
    if (!matchSummary.matched || counts.filled === 0) return null;
    const now = new Date().toISOString();
    const candidate = OfferCome.applications.createApplication({
      ...extractJobMetadata(),
      stage: "prepared",
      filledAt: now,
      fillStats: counts,
      applicationMethod: "OfferCome 一键填写",
      resumeName: contextProfileName
    });
    const existing = (await OfferCome.storage.loadApplications()).find((item) =>
      item.id === candidate.id || (candidate.sourceUrl && item.sourceUrl === candidate.sourceUrl)
    );
    const timeline = Array.isArray(existing?.timeline) ? [...existing.timeline] : [];
    if (!existing) timeline.push({ stage: "prepared", at: now, note: "OfferCome 一键填写后自动记录" });
    else if (!existing.filledAt || Date.now() - new Date(existing.filledAt).getTime() > 5 * 60 * 1000) {
      timeline.push({ stage: existing.stage, at: now, note: `再次一键填写 ${counts.filled} 项` });
    }
    return OfferCome.storage.upsertApplication({
      ...candidate,
      ...existing,
      position: existing?.position?.startsWith("待补充") ? candidate.position : (existing?.position || candidate.position),
      company: existing?.company?.startsWith("待补充") ? candidate.company : (existing?.company || candidate.company),
      location: existing?.location || candidate.location,
      summary: existing?.summary || candidate.summary,
      sourceUrl: candidate.sourceUrl,
      sourceHost: candidate.sourceHost,
      stage: existing?.stage || "prepared",
      filledAt: now,
      fillStats: counts,
      timeline
    });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message?.type?.startsWith("OFFERCOME_")) return undefined;
    (async () => {
      if (message.type === "OFFERCOME_PING") {
        sendResponse({ ok: true, site: location.hostname });
        return;
      }
      const context = await getContext();
      if (message.type === "OFFERCOME_MANUAL_STATE") {
        const control = resolveManualControl(context.analysis);
        sendResponse({ ok: true, target: manualTargetSummary(control) });
        return;
      }
      if (message.type === "OFFERCOME_MANUAL_FILL") {
        const control = resolveManualControl(context.analysis);
        if (!control) {
          sendResponse({ ok: false, error: "未找到刚才选中的输入框，请回到网页重新点击目标框" });
          return;
        }
        const definition = OfferCome.FIELD_DEFINITIONS.find((item) => item.path === message.path);
        if (!definition) {
          sendResponse({ ok: false, error: "找不到对应的简历字段" });
          return;
        }
        const sectionIndex = Number.isInteger(message.sectionIndex) ? message.sectionIndex : 0;
        const value = OfferCome.manualFields.valueFor(context.profile, definition, sectionIndex);
        if (OfferCome.utils.isBlank(value)) {
          sendResponse({ ok: false, error: "该项简历资料为空或已被删除" });
          return;
        }
        if (typeof message.overwriteExisting === "boolean") context.settings.overwriteExisting = message.overwriteExisting;
        const result = await OfferCome.filler.fillOne(control, { definition, value }, context.settings);
        const refreshed = OfferCome.formAnalyzer.analyze();
        sendResponse({
          ok: true,
          status: result.status,
          reason: result.reason,
          field: definition.label,
          target: manualTargetSummary(resolveManualControl(refreshed)) || manualTargetSummary(control)
        });
        return;
      }
      if (message.type === "OFFERCOME_SCAN") {
        sendResponse({ ok: true, summary: summary(context) });
        return;
      }
      if (message.type === "OFFERCOME_FILL") {
        if (typeof message.overwriteExisting === "boolean") context.settings.overwriteExisting = message.overwriteExisting;
        const results = await OfferCome.filler.fillAll(context.pairs, context.settings);
        const counts = { filled: 0, skipped: 0, failed: 0 };
        results.forEach((result) => { counts[result.status] += 1; });
        const failures = results.filter((result) => result.status === "failed").map((result) => ({
          field: result.pair.match.definition.label,
          target: result.pair.control.rawText.slice(0, 120),
          reason: result.reason
        }));
        const currentSummary = summary(context);
        let application = null;
        let recordingError = "";
        try {
          application = await recordApplication(counts, currentSummary, context.profile.basics.fullName);
        } catch (error) {
          recordingError = error.message || "申请记录保存失败";
        }
        sendResponse({ ok: true, summary: currentSummary, counts, failures, application, recordingError });
      }
    })().catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  });
})(globalThis);
