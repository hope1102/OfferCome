(function createContentScriptMock() {
  const listeners = [];
  const data = {
    "offercome.profile": {
      schemaVersion: 1,
      basics: { fullName: "测试用户", email: "test@example.com", phone: "13800000000" },
      education: [], experience: [], projects: [], campus: [], skills: [], languages: [], certificates: [], awards: [], family: [], answers: {}
    },
    "offercome.settings": { overwriteExisting: false, minimumConfidence: 0.62, highlightResults: false, fillSensitiveFields: false },
    "offercome.applications": []
  };
  globalThis.chrome = {
    storage: {
      local: {
        async get(keys) {
          const list = Array.isArray(keys) ? keys : [keys];
          return Object.fromEntries(list.filter((key) => key in data).map((key) => [key, structuredClone(data[key])]));
        },
        async set(values) { Object.entries(values).forEach(([key, value]) => { data[key] = structuredClone(value); }); }
      }
    },
    runtime: { onMessage: { addListener(listener) { listeners.push(listener); } } }
  };
  globalThis.sendOfferComeMessage = (message) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("消息响应超时")), 3000);
    const sendResponse = (response) => { clearTimeout(timer); resolve(response); };
    const handled = listeners.some((listener) => listener(message, {}, sendResponse) === true);
    if (!handled) { clearTimeout(timer); reject(new Error("没有内容脚本监听器")); }
  });
  globalThis.getMockApplications = () => structuredClone(data["offercome.applications"]);
})();
