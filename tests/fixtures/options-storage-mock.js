(function createOptionsStorageMock() {
  const data = {
    "offercome.profile": {
      schemaVersion: 1,
      basics: {}, education: [], experience: [], projects: [], campus: [], skills: [], languages: [], certificates: [], awards: [], family: [], answers: {},
      publications: [{
        type: "论文", title: "组合导航算法研究", channel: "示例期刊", authorOrder: "第一作者",
        impactFactor: "8.9", patentNumber: "", date: "2026-06", url: "https://example.com/paper", details: "脱敏论文摘要"
      }]
    },
    "offercome.settings": { overwriteExisting: false, minimumConfidence: 0.62, highlightResults: true, fillSensitiveFields: false }
  };
  globalThis.chrome = {
    storage: { local: {
      async get(keys) { const list = Array.isArray(keys) ? keys : [keys]; return Object.fromEntries(list.filter((key) => key in data).map((key) => [key, structuredClone(data[key])])); },
      async set(values) { Object.assign(data, structuredClone(values)); }
    } },
    tabs: { create() {} },
    runtime: { getURL(path) { return path; } }
  };
})();
