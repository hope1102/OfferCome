(function initApplications(global) {
  const OfferCome = global.OfferCome = global.OfferCome || {};

  const ACTIVE_STAGES = [
    { id: "saved", label: "已收藏" },
    { id: "prepared", label: "已填写" },
    { id: "applied", label: "已投递" },
    { id: "screening", label: "筛选沟通" },
    { id: "assessment", label: "测评 / 笔试" },
    { id: "interview", label: "面试中" },
    { id: "offer", label: "Offer" }
  ];
  const ENDED_STAGES = [
    { id: "rejected", label: "未通过" },
    { id: "withdrawn", label: "已撤回" }
  ];
  const ALL_STAGES = [...ACTIVE_STAGES, ...ENDED_STAGES];

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function canonicalizeUrl(value) {
    try {
      const url = new URL(value);
      url.hash = "";
      [...url.searchParams.keys()].forEach((key) => {
        if (/^(utm_|from$|source$|spm$|ref$|track)/i.test(key)) url.searchParams.delete(key);
      });
      url.searchParams.sort();
      return url.toString();
    } catch (_) {
      return String(value || "");
    }
  }

  function createApplication(input = {}) {
    const now = new Date().toISOString();
    const sourceUrl = canonicalizeUrl(input.sourceUrl || "");
    const seed = sourceUrl || `${input.company || ""}|${input.position || ""}|${input.createdAt || now}`;
    const stage = ALL_STAGES.some((item) => item.id === input.stage) ? input.stage : "prepared";
    return {
      id: input.id || `app-${hashString(seed)}`,
      position: input.position || "待补充职位名称",
      company: input.company || "待补充公司名称",
      location: input.location || "",
      jobType: input.jobType || "",
      summary: input.summary || "",
      sourceUrl,
      sourceHost: input.sourceHost || (() => { try { return new URL(sourceUrl).hostname; } catch (_) { return ""; } })(),
      stage,
      createdAt: input.createdAt || now,
      updatedAt: input.updatedAt || now,
      filledAt: input.filledAt || null,
      appliedAt: input.appliedAt || null,
      nextActionAt: input.nextActionAt || "",
      notes: input.notes || "",
      archived: Boolean(input.archived),
      fillStats: input.fillStats || { filled: 0, skipped: 0, failed: 0 },
      applicationMethod: input.applicationMethod || "",
      resumeName: input.resumeName || "",
      reviewOutcome: input.reviewOutcome || "",
      reviewSummary: input.reviewSummary || "",
      timeline: Array.isArray(input.timeline) ? input.timeline : []
    };
  }

  function stageLabel(stage) {
    return ALL_STAGES.find((item) => item.id === stage)?.label || stage;
  }

  OfferCome.applications = {
    ACTIVE_STAGES,
    ENDED_STAGES,
    ALL_STAGES,
    canonicalizeUrl,
    createApplication,
    stageLabel
  };
})(globalThis);
