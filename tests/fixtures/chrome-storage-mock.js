(function createChromeMock() {
  const listeners = [];
  const now = new Date().toISOString();
  const data = {
    "offercome.applications": [
      {
        id: "app-demo-1", position: "终端定位算法工程师", company: "北斗星通示例公司", location: "北京市",
        jobType: "全职", summary: "负责终端定位算法相关研发。", sourceUrl: "https://jobs.example.com/1024",
        sourceHost: "jobs.example.com", stage: "prepared", createdAt: now, updatedAt: now, filledAt: now,
        appliedAt: null, nextActionAt: "", notes: "检查附件后提交", archived: false,
        fillStats: { filled: 18, skipped: 2, failed: 0 },
        applicationMethod: "OfferCome 一键填写", resumeName: "测试用户", reviewOutcome: "", reviewSummary: "",
        timeline: [{ stage: "prepared", at: now, note: "OfferCome 一键填写后自动记录" }]
      },
      {
        id: "app-demo-2", position: "GNSS 算法实习生", company: "示例导航科技", location: "上海市",
        jobType: "实习", summary: "", sourceUrl: "https://career.example.org/88", sourceHost: "career.example.org",
        stage: "interview", createdAt: now, updatedAt: now, filledAt: now, appliedAt: now,
        nextActionAt: "2026-09-20", notes: "准备项目介绍", archived: false,
        fillStats: { filled: 12, skipped: 0, failed: 0 },
        applicationMethod: "OfferCome 一键填写", resumeName: "测试用户", reviewOutcome: "继续重点跟进", reviewSummary: "准备项目介绍和算法细节。",
        timeline: [{ stage: "prepared", at: now }, { stage: "applied", at: now }, { stage: "interview", at: now }]
      }
    ]
  };
  globalThis.chrome = {
    storage: {
      local: {
        async get(keys) {
          const list = Array.isArray(keys) ? keys : [keys];
          return Object.fromEntries(list.filter((key) => key in data).map((key) => [key, structuredClone(data[key])]));
        },
        async set(values) {
          const changes = {};
          Object.entries(values).forEach(([key, value]) => {
            changes[key] = { oldValue: data[key], newValue: structuredClone(value) };
            data[key] = structuredClone(value);
          });
          listeners.forEach((listener) => listener(changes, "local"));
        }
      },
      onChanged: { addListener(listener) { listeners.push(listener); } }
    },
    runtime: { openOptionsPage() {} }
  };
})();
