(function initAdapters(global) {
  const OfferCome = global.OfferCome = global.OfferCome || {};

  const adapters = [
    {
      id: "moka",
      name: "Moka",
      detect: () => /moka|mokahr/i.test(location.hostname + document.documentElement.innerHTML.slice(0, 2000)),
      itemContainers: [".form-item", ".ant-form-item", "[class*='formItem']"]
    },
    {
      id: "beisen",
      name: "北森",
      detect: () => /beisen|italent/i.test(location.hostname + document.documentElement.innerHTML.slice(0, 2000)),
      itemContainers: [
        ".ant-form-item", ".resume-form-item", ".form-item", ".form-group",
        "[class*='formItem']", "[class*='form-item']", "[class*='fieldItem']",
        "[class*='field-item']", "[class*='resumeItem']", "[class*='resume-item']",
        "[data-field]", "[data-field-name]"
      ],
      controlSelectors: [
        "[aria-haspopup='listbox']:not([aria-disabled='true'])",
        ".ant-select:not(.ant-select-disabled) .ant-select-selector",
        "[class*='selectControl']", "[class*='select-control']"
      ]
    },
    {
      id: "feishu",
      name: "飞书招聘",
      detect: () => /feishu|lark|jobs\.bytedance/i.test(location.hostname),
      itemContainers: [".atsx-form-item", ".semi-form-field", "[class*='form-item']"]
    },
    {
      id: "dayee",
      name: "用友大易",
      detect: () => /dayee|hotjob/i.test(location.hostname),
      itemContainers: [".form-group", ".el-form-item", "[class*='form-item']"]
    },
    {
      id: "generic",
      name: "通用表单",
      detect: () => true,
      itemContainers: [
        ".ant-form-item", ".el-form-item", ".form-item", ".form-group",
        ".semi-form-field", "[class*='FormItem']", "[class*='form-item']",
        "[class*='formItem']", "[class*='fieldItem']", "[class*='field-item']",
        "[data-field]", "[data-field-name]", "fieldset", "li", "tr"
      ],
      controlSelectors: ["[aria-haspopup='listbox']:not([aria-disabled='true'])"]
    }
  ];

  OfferCome.siteAdapters = {
    current() {
      return adapters.find((adapter) => {
        try { return adapter.detect(); } catch (_) { return false; }
      }) || adapters[adapters.length - 1];
    },
    all: adapters
  };
})(globalThis);
