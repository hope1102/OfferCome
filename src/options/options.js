(function initOptions() {
  const OC = globalThis.OfferCome;
  const { setByPath, getByPath, mergeDefaults, mergePartial } = OC.utils;
  let profile;
  let settings;

  const BASIC_FIELDS = [
    ["basics.fullName", "中文姓名", "text"], ["basics.englishName", "英文名", "text"], ["basics.gender", "性别", "text"],
    ["basics.birthDate", "出生日期", "date"], ["basics.nationality", "国籍", "text"], ["basics.ethnicity", "民族", "text"],
    ["basics.politicalStatus", "政治面貌", "text"], ["basics.maritalStatus", "婚姻状况", "text"], ["basics.phone", "手机号", "tel"],
    ["basics.healthStatus", "健康状况", "text"], ["basics.preCollegeHukou", "入学前户口所在地", "text"],
    ["basics.alternatePhone", "备用电话", "tel"], ["basics.email", "邮箱", "email"], ["basics.alternateEmail", "备用邮箱", "email"],
    ["basics.idType", "证件类型（敏感）", "text"], ["basics.idNumber", "证件号码（敏感）", "text"], ["basics.nativePlace", "籍贯", "text"],
    ["basics.sourcePlace", "生源地", "text"],
    ["basics.birthPlace", "出生地", "text"], ["basics.hukou", "户口所在地", "text"], ["basics.currentProvince", "现居省份", "text"],
    ["basics.currentCity", "现居城市", "text"], ["basics.currentDistrict", "现居区县", "text"], ["basics.postalCode", "邮编", "text"],
    ["basics.address", "详细地址", "text", true], ["basics.wechat", "微信", "text"], ["basics.qq", "QQ", "text"],
    ["basics.website", "个人网站", "url"], ["basics.github", "GitHub", "url"], ["basics.linkedin", "LinkedIn", "url"],
    ["basics.portfolio", "作品集", "url"], ["basics.targetCity", "期望城市", "text"], ["basics.targetPosition", "期望职位", "text"],
    ["basics.expectedSalary", "期望薪资", "text"], ["basics.availableDate", "可入职日期", "date"],
    ["basics.summary", "个人简介 / 自我评价", "textarea", true], ["basics.strengths", "个人优势", "textarea", true],
    ["basics.hobbies", "兴趣爱好", "textarea", true]
    ,["basics.domesticGraduate", "是否境内毕业生", "text"]
    ,["basics.hongKongMacaoUniversityStudent", "是否港澳籍大学生", "text"]
    ,["basics.taiwanRegisteredUniversityStudent", "是否台湾籍大学生", "text"]
    ,["basics.scienceEngineeringMajor", "是否理工类专业", "text"]
    ,["basics.engineeringMasterDoctorProgram", "是否工程硕博联合培养专项", "text"]
  ];

  const ANSWER_FIELDS = [
    ["answers.careerPlan", "职业规划"], ["answers.whyCompany", "申请公司/岗位的通用原因"],
    ["answers.strengthsAndWeaknesses", "优势与不足"], ["answers.acceptOvertime", "是否接受加班"],
    ["answers.acceptTravel", "是否接受出差"], ["answers.acceptRelocation", "是否接受调剂/异地"],
    ["answers.relativesInCompany", "是否有亲属在公司"], ["answers.source", "招聘信息来源"]
  ];

  const REPEAT_SECTIONS = [
    {
      key: "education", id: "education", title: "教育经历", description: "按最近经历在前的顺序维护。", itemName: "教育经历",
      fields: [["school", "学校"], ["college", "学院/院系"], ["schoolLocation", "学校所在地"], ["major", "专业"], ["majorCategory", "专业类别"], ["degreeLevel", "学历"], ["degree", "学位"], ["enrollmentType", "培养方式/受教育类型"], ["fullTime", "是否全日制"], ["startDate", "入学日期", "month"], ["endDate", "毕业日期", "month"], ["gpa", "GPA"], ["gpaScale", "GPA 满分"], ["rank", "排名"], ["advisor", "导师"], ["overseasStudy", "海外学习经历"], ["courses", "主修课程", "textarea", true], ["research", "研究方向", "textarea", true], ["description", "教育经历描述", "textarea", true]]
    },
    {
      key: "experience", id: "experience", title: "工作 / 实习经历", description: "全职、兼职和实习均可录入。", itemName: "经历",
      fields: [["company", "公司名称"], ["department", "部门"], ["position", "职位"], ["type", "类型（全职/实习/兼职）"], ["city", "工作城市"], ["startDate", "开始日期", "month"], ["endDate", "结束日期", "month"], ["monthlySalary", "月薪"], ["description", "工作职责", "textarea", true], ["achievements", "主要成果", "textarea", true], ["reasonForLeaving", "离职原因", "textarea", true], ["verifier.name", "证明人姓名"], ["verifier.relationship", "证明人关系"], ["verifier.position", "证明人职务"], ["verifier.company", "证明人单位"], ["verifier.phone", "证明人联系方式", "tel"]]
    },
    {
      key: "projects", id: "projects", title: "项目经历", description: "课程、科研、竞赛和工作项目均可录入。", itemName: "项目",
      fields: [["name", "项目名称"], ["role", "项目角色"], ["startDate", "开始日期", "month"], ["endDate", "结束日期", "month"], ["url", "项目链接", "url"], ["techStack", "技术栈"], ["description", "项目描述", "textarea", true], ["responsibilities", "项目职责", "textarea", true], ["achievements", "项目成果", "textarea", true]]
    },
    {
      key: "campus", id: "campus", title: "学生会 / 社团活动", description: "按照网申常见的学生干部字段维护，不需要填写组织名称。", itemName: "学生干部经历",
      fields: [["hasCadreExperience", "是否有担任学生干部经历"], ["cadreLevel", "干部级别"], ["cadrePosition", "干部职级"], ["startDate", "开始时间", "month"], ["endDate", "结束时间", "month"], ["description", "工作描述", "textarea", true]]
    },
    {
      key: "skills", id: "skills", title: "专业技能", description: "工具、技术和其他能力。", itemName: "技能",
      fields: [["name", "技能名称"], ["level", "熟练程度"], ["description", "说明", "textarea", true]]
    },
    {
      key: "languages", id: "languages", title: "语言能力", description: "英语、普通话及其他语言。", itemName: "语言",
      fields: [["name", "语言"], ["level", "等级/熟练程度"], ["score", "考试分数"], ["listeningSpeaking", "听说能力"], ["readingWriting", "读写能力"], ["description", "听说读写说明", "textarea", true]]
    },
    {
      key: "certificates", id: "achievements", title: "证书", description: "职业、语言和技能证书。", itemName: "证书",
      fields: [["name", "证书名称"], ["issuer", "颁发机构"], ["date", "取得日期", "month"], ["number", "证书编号"], ["score", "成绩/分数"], ["description", "说明", "textarea", true]]
    },
    {
      key: "awards", id: "awards", title: "奖项", description: "竞赛、奖学金及其他荣誉。", itemName: "奖项",
      fields: [["name", "奖项名称"], ["type", "奖项类型"], ["level", "级别"], ["issuer", "评选单位"], ["date", "获奖日期", "month"], ["description", "说明", "textarea", true]]
    },
    {
      key: "publications", id: "publications", title: "论文 / 专利", description: "论文、专利、软件著作权及其他科研成果。", itemName: "论文 / 专利",
      fields: [
        ["type", "类型", "select", false, ["论文", "发明专利", "实用新型专利", "外观专利", "软著", "其他"]],
        ["title", "论文 / 专利名称"], ["channel", "发表 / 授权渠道"],
        ["authorOrder", "作者顺序", "select", false, ["第一作者", "共同第一作者", "第二作者", "第三作者", "通讯作者", "其他"]],
        ["impactFactor", "影响因子"], ["patentNumber", "专利号"], ["date", "发表 / 授权时间", "month"],
        ["url", "论文 / 专利链接", "url"], ["details", "详情", "textarea", true]
      ]
    },
    {
      key: "family", id: "family", title: "家庭成员", description: "敏感资料；仅在确有需要时填写。", itemName: "家庭成员",
      fields: [["name", "姓名"], ["relationship", "关系"], ["company", "工作单位"], ["position", "职务"], ["phone", "联系电话", "tel"]]
    }
  ];

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  }

  function fieldHtml(path, label, type = "text", wide = false, arrayData = "", choices = [], explicitValue) {
    const value = explicitValue === undefined ? (arrayData ? "" : getByPath(profile, path) || "") : explicitValue;
    const data = arrayData || `data-path="${escapeHtml(path)}"`;
    const className = `field${wide ? " wide" : ""}`;
    if (type === "textarea") return `<label class="${className}">${escapeHtml(label)}<textarea ${data}>${escapeHtml(value)}</textarea></label>`;
    if (type === "select") {
      const options = ['<option value="">请选择</option>', ...choices.map((choice) => `<option value="${escapeHtml(choice)}"${String(value) === choice ? " selected" : ""}>${escapeHtml(choice)}</option>`)].join("");
      return `<label class="${className}">${escapeHtml(label)}<select ${data}>${options}</select></label>`;
    }
    return `<label class="${className}">${escapeHtml(label)}<input type="${type}" ${data} value="${escapeHtml(value)}"></label>`;
  }

  function renderBasics() {
    document.getElementById("basics-fields").innerHTML = BASIC_FIELDS.map((item) => fieldHtml(...item)).join("");
    document.getElementById("answer-fields").innerHTML = ANSWER_FIELDS.map(([path, label]) => fieldHtml(path, label, "textarea", true)).join("");
  }

  function repeatCardHtml(config, item, index) {
    const fields = config.fields.map(([key, label, type = "text", wide = false, choices = []]) => {
      const data = `data-array="${config.key}" data-index="${index}" data-key="${key}"`;
      return fieldHtml("", label, type, wide, data, choices, getByPath(item, key) || "");
    }).join("");
    return `<article class="repeat-card"><div class="card-head"><strong>${escapeHtml(config.itemName)} ${index + 1}</strong><button class="remove-button" type="button" data-remove="${config.key}" data-index="${index}">删除</button></div><div class="form-grid">${fields}</div></article>`;
  }

  function renderRepeatSection(config) {
    const items = profile[config.key] || [];
    return `<section id="${config.id}" class="panel"><div class="section-title"><div><h2>${config.title}</h2><p>${config.description}</p></div><button class="add-button" type="button" data-add="${config.key}">+ 新增</button></div><div class="repeat-list">${items.length ? items.map((item, index) => repeatCardHtml(config, item, index)).join("") : '<div class="empty">暂无内容，点击右上角“新增”开始填写。</div>'}</div></section>`;
  }

  function renderRepeats() {
    document.getElementById("repeat-sections").innerHTML = REPEAT_SECTIONS.map(renderRepeatSection).join("");
  }

  function renderSettings() {
    document.getElementById("setting-overwrite").checked = settings.overwriteExisting;
    document.getElementById("setting-highlight").checked = settings.highlightResults;
    document.getElementById("setting-sensitive").checked = settings.fillSensitiveFields;
    document.getElementById("setting-confidence").value = String(settings.minimumConfidence);
  }

  function showNotice(message, error = false) {
    const notice = document.getElementById("notice");
    notice.textContent = message;
    notice.className = `notice${error ? " error" : ""}`;
    notice.hidden = false;
    clearTimeout(showNotice.timer);
    showNotice.timer = setTimeout(() => { notice.hidden = true; }, 3500);
  }

  function updateStateFromInput(target) {
    if (target.dataset.path) setByPath(profile, target.dataset.path, target.value);
    if (target.dataset.array) {
      const item = profile[target.dataset.array]?.[Number(target.dataset.index)];
      if (item) setByPath(item, target.dataset.key, target.value);
    }
  }

  function emptyItem(config) {
    const item = {};
    config.fields.forEach(([key]) => setByPath(item, key, ""));
    return item;
  }

  async function save() {
    settings.overwriteExisting = document.getElementById("setting-overwrite").checked;
    settings.highlightResults = document.getElementById("setting-highlight").checked;
    settings.fillSensitiveFields = document.getElementById("setting-sensitive").checked;
    settings.minimumConfidence = Number(document.getElementById("setting-confidence").value);
    await Promise.all([OC.storage.saveProfile(profile), OC.storage.saveSettings(settings)]);
    showNotice("资料已安全保存到浏览器本地。");
  }

  async function importJson(file) {
    if (!file || file.size > 2 * 1024 * 1024) throw new Error("请选择小于 2 MB 的 JSON 文件");
    const parsed = JSON.parse(await file.text());
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("JSON 顶层必须是对象");
    const importedProfile = parsed.profile || parsed;
    const mergeMode = parsed.importMode === "merge";
    profile = mergeMode
      ? mergeDefaults(OC.createDefaultProfile(), mergePartial(profile, importedProfile))
      : mergeDefaults(OC.createDefaultProfile(), importedProfile);
    if (parsed.settings) {
      settings = mergeMode
        ? mergeDefaults(OC.createDefaultSettings(), mergePartial(settings, parsed.settings))
        : mergeDefaults(OC.createDefaultSettings(), parsed.settings);
    }
    renderBasics();
    renderRepeats();
    renderSettings();
    await save();
    showNotice(mergeMode ? "合并导入成功，未包含的现有资料保持不变。" : "导入成功，资料已保存。");
  }

  function exportJson() {
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), profile, settings }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `offercome-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showNotice("备份文件已导出。请妥善保管其中的个人信息。");
  }

  document.addEventListener("input", (event) => updateStateFromInput(event.target));
  document.addEventListener("click", (event) => {
    const add = event.target.closest("[data-add]");
    if (add) {
      const config = REPEAT_SECTIONS.find((item) => item.key === add.dataset.add);
      profile[config.key].push(emptyItem(config));
      renderRepeats();
      document.getElementById(config.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const remove = event.target.closest("[data-remove]");
    if (remove) {
      profile[remove.dataset.remove].splice(Number(remove.dataset.index), 1);
      renderRepeats();
    }
  });

  document.getElementById("save-button").addEventListener("click", () => save().catch((error) => showNotice(error.message, true)));
  document.getElementById("tracker-button").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("src/tracker/tracker.html") });
  });
  document.getElementById("export-button").addEventListener("click", exportJson);
  document.getElementById("import-button").addEventListener("click", () => document.getElementById("import-file").click());
  document.getElementById("import-file").addEventListener("change", (event) => {
    importJson(event.target.files[0]).catch((error) => showNotice(`导入失败：${error.message}`, true));
    event.target.value = "";
  });

  (async () => {
    [profile, settings] = await Promise.all([OC.storage.loadProfile(), OC.storage.loadSettings()]);
    renderBasics();
    renderRepeats();
    renderSettings();
  })().catch((error) => showNotice(`加载失败：${error.message}`, true));
})();
