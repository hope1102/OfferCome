const assert = require("node:assert/strict");
const manifest = require("../manifest.json");

assert.ok(manifest.permissions.includes("sidePanel"), "常驻侧栏必须声明 sidePanel 权限");
assert.equal(manifest.side_panel?.default_path, "src/popup/popup.html");
assert.equal(manifest.action?.default_popup, undefined, "工具栏图标必须打开侧栏而不是易失焦弹窗");

require("../src/shared/defaults.js");
require("../src/shared/utils.js");
require("../src/shared/fields.js");
require("../src/shared/manual-fields.js");
require("../src/shared/applications.js");
require("../src/content/matcher.js");
require("../src/content/filler.js");

const OC = globalThis.OfferCome;

assert.equal(
  OC.applications.canonicalizeUrl("https://jobs.example.com/apply?jobId=1024&utm_source=test&ref=home#form"),
  "https://jobs.example.com/apply?jobId=1024",
  "申请记录应保留职位标识并去掉追踪参数与锚点"
);
const trackedA = OC.applications.createApplication({ sourceUrl: "https://jobs.example.com/apply?jobId=1024", position: "算法工程师", company: "示例公司" });
const trackedB = OC.applications.createApplication({ sourceUrl: "https://jobs.example.com/apply?jobId=1024", position: "算法工程师", company: "示例公司" });
assert.equal(trackedA.id, trackedB.id, "同一职位链接必须生成稳定记录 ID，避免重复记录");
assert.equal(trackedA.stage, "prepared", "一键填写后的默认状态应为已填写而不是已投递");
assert.equal(OC.applications.stageLabel("interview"), "面试中");
assert.equal(OC.filler.choiceMatches("男女不限", "男"), false, "不得把“男女不限”误认为“男”选项");
assert.equal(OC.filler.choiceMatches("是否", "是"), false, "不得把字段提示“是否”误认为“是”选项");
assert.equal(OC.filler.choiceMatches("是", "是"), true);
assert.equal(OC.filler.choiceMatches("全日制", "全日制统分统招"), true);

function control(rawText, overrides = {}) {
  return {
    rawText,
    normalizedText: OC.utils.normalizeText(rawText),
    section: null,
    sectionIndex: 0,
    autocomplete: "",
    type: "text",
    required: false,
    existingValue: "",
    ...overrides
  };
}

assert.equal(OC.utils.normalizeText(" 请输入：手机号码 * "), "手机号码");
assert.equal(OC.utils.formatDate("2026年9月7日", "date"), "2026-09-07");
assert.equal(OC.utils.formatDate("2026/9", "month"), "2026-09");
assert.deepEqual(
  OC.utils.mergePartial({ basics: { name: "保留", phone: "123" }, campus: [{ old: true }] }, { campus: [{ updated: true }] }),
  { basics: { name: "保留", phone: "123" }, campus: [{ updated: true }] },
  "合并导入应替换指定数组并保留未提供的资料"
);

const profile = OC.createDefaultProfile();
profile.basics.fullName = "测试用户";
profile.basics.email = "test@example.com";
profile.basics.idNumber = "000000000000000000";
profile.basics.targetCity = "北京市";
profile.basics.summary = "脱敏个人简介";
profile.education = [
  { school: "示例大学", major: "计算机科学" },
  { school: "示例学院", major: "软件工程" }
];

const settings = OC.createDefaultSettings();
const manualEntries = OC.manualFields.buildEntries(profile);
assert.ok(manualEntries.some((entry) => entry.path === "basics.fullName" && entry.value === "测试用户" && entry.groupLabel === "基本信息"));
assert.ok(manualEntries.some((entry) => entry.path === "basics.targetCity" && entry.categoryKey === "jobIntent" && entry.categoryLabel === "求职期望" && entry.groupLabel === "求职期望"));
assert.ok(manualEntries.some((entry) => entry.path === "basics.summary" && entry.categoryKey === "selfIntro" && entry.categoryLabel === "自我介绍" && entry.groupLabel === "自我介绍"));
assert.ok(manualEntries.some((entry) => entry.path === "education.school" && entry.sectionIndex === 1 && entry.value === "示例学院"));
assert.equal(OC.manualFields.CATEGORIES[0].key, "basics");
assert.equal(OC.manualFields.valueFor(profile, OC.FIELD_DEFINITIONS.find((item) => item.path === "education.major"), 1), "软件工程");
assert.equal(OC.manualFields.valueFor(profile, OC.FIELD_DEFINITIONS.find((item) => item.path === "education.major"), 2), undefined);
let result = OC.matcher.matchControl(control("中文姓名"), profile, settings);
assert.equal(result.definition.path, "basics.fullName");
assert.equal(result.value, "测试用户");
assert.ok(result.confidence >= 0.82);

result = OC.matcher.matchControl(control("Email Address", { autocomplete: "email", type: "email" }), profile, settings);
assert.equal(result.definition.path, "basics.email");
assert.equal(result.value, "test@example.com");

result = OC.matcher.matchControl(control("登录账号", { autocomplete: "username" }), profile, settings);
assert.equal(result, null, "autocomplete=username 不得因包含 name 而误填候选人姓名");

result = OC.matcher.matchControl(control("学校名称", { section: "education", sectionIndex: 1 }), profile, settings);
assert.equal(result.definition.path, "education.school");
assert.equal(result.value, "示例学院");

result = OC.matcher.matchControl(control("学校名称", { section: "education", sectionIndex: 2 }), profile, settings);
assert.equal(result, null, "页面多出的第三段教育经历不得重复使用最后一条简历资料");

result = OC.matcher.matchControl(control("身份证号码"), profile, settings);
assert.equal(result, null, "敏感字段默认必须禁用");

settings.fillSensitiveFields = true;
result = OC.matcher.matchControl(control("身份证号码"), profile, settings);
assert.equal(result.definition.path, "basics.idNumber");

profile.experience = [{ company: "错误的实习单位", position: "错误的实习职位" }];
profile.family = [{ name: "", relationship: "父子", company: "", position: "" }];

result = OC.matcher.matchControl(control("公司 工作单位 请填写亲属工作单位"), profile, settings);
assert.equal(result, null, "家属单位为空时不得回退到实习单位");

result = OC.matcher.matchControl(control("姓名 请填写家属姓名"), profile, settings);
assert.equal(result, null, "家属姓名为空时不得回退到本人姓名");

profile.family[0].company = "正确的家属单位";
profile.family[0].name = "测试家属";
result = OC.matcher.matchControl(control("公司 工作单位 请填写亲属工作单位"), profile, settings);
assert.equal(result.definition.path, "family.company");
assert.equal(result.value, "正确的家属单位");

result = OC.matcher.matchControl(control("姓名 请填写家属姓名"), profile, settings);
assert.equal(result.definition.path, "family.name");
assert.equal(result.value, "测试家属");

result = OC.matcher.matchControl(control("公司名称", { section: "family" }), profile, settings);
assert.equal(result.definition.path, "family.company");

profile.experience[0].company = "正确的实习单位";
profile.family[0].company = "错误的家属单位";
result = OC.matcher.matchControl(control("实习/工作单位 请填写您的实习/工作所在单位名称", { section: "family" }), profile, settings);
assert.equal(result.definition.path, "experience.company", "明确的实习标签必须覆盖外围家庭章节误判");
assert.equal(result.value, "正确的实习单位");

result = OC.matcher.matchControl(control("家庭成员 工作单位 实习/工作单位", {
  localText: "实习/工作单位 请填写您的实习/工作所在单位名称",
  section: "family"
}), profile, settings);
assert.equal(result.definition.path, "experience.company", "局部字段语义必须优先于被父级容器污染的文本");

profile.experience[0].type = "实习";
result = OC.matcher.matchControl(control("工作类型", { section: "experience", type: "select" }), profile, settings);
assert.equal(result.definition.path, "experience.type");
assert.equal(result.value, "实习");

result = OC.matcher.matchControl(control("实习/工作单位 请填写您的实习/工作所在单位名称"), profile, settings);
assert.equal(result.definition.path, "experience.company");
assert.equal(result.value, "正确的实习单位");

profile.experience[0].description = "错误的实习工作描述";
profile.awards = [{ level: "错误的奖项级别" }];
profile.campus = [{
  hasCadreExperience: "是",
  cadreLevel: "院学生会",
  cadrePosition: "干事",
  startDate: "2020-12-01",
  endDate: "2022-03-01",
  description: "正确的学生干部工作描述"
}];

result = OC.matcher.matchControl(control("干部级别 请选择您担任学生干部的级别", { section: "experience", type: "select" }), profile, settings);
assert.equal(result.definition.path, "campus.cadreLevel", "干部级别不得匹配成奖项级别");
assert.equal(result.value, "院学生会");

result = OC.matcher.matchControl(control("工作描述 请描述您在担任学生干部期间的主要职责、取得的工作成果或亮点", { section: "experience", type: "textarea" }), profile, settings);
assert.equal(result.definition.path, "campus.description", "学生干部工作描述不得匹配成实习描述");
assert.equal(result.value, "正确的学生干部工作描述");

profile.campus[0].description = "";
result = OC.matcher.matchControl(control("工作描述 请描述您在担任学生干部期间的主要职责", { section: "experience", type: "textarea" }), profile, settings);
assert.equal(result, null, "校园描述为空时不得回退到实习描述");

profile.publications = [{
  type: "论文", title: "组合导航算法研究", channel: "示例期刊", authorOrder: "第一作者",
  impactFactor: "8.9", patentNumber: "", date: "2026-06", url: "https://example.com/paper", details: "脱敏论文摘要"
}];
result = OC.matcher.matchControl(control("论文/专利名称", { section: "publications" }), profile, settings);
assert.equal(result.definition.path, "publications.title");
assert.equal(result.value, "组合导航算法研究");
result = OC.matcher.matchControl(control("作者顺序", { section: "publications", type: "select" }), profile, settings);
assert.equal(result.definition.path, "publications.authorOrder");
assert.equal(result.value, "第一作者");
profile.projects = [{ name: "脱敏项目名称" }];
result = OC.matcher.matchControl(control("项目名称", { section: "projects" }), profile, settings);
assert.equal(result.definition.path, "projects.name", "论文名称不得串填到项目名称");
assert.equal(result.value, "脱敏项目名称");

profile.basics.phone = "13800000000";
result = OC.matcher.matchControl(control("手机号码 中国大陆", { type: "combobox" }), profile, settings);
assert.equal(result, null, "手机号复合控件中的国家区号下拉不得匹配手机号文本值");

profile.basics.sourcePlace = "山东-临沂";
result = OC.matcher.matchControl(control("生源地", { type: "combobox" }), profile, settings);
assert.equal(result.definition.path, "basics.sourcePlace");
assert.equal(result.value, "山东-临沂");

profile.education[0].enrollmentType = "全日制统分统招";
result = OC.matcher.matchControl(control("学习形式", { type: "combobox" }), profile, settings);
assert.equal(result.definition.path, "education.enrollmentType");
assert.equal(result.value, "全日制统分统招");

result = OC.matcher.matchControl(control("姓名", {
  localText: "姓名",
  rawText: "姓名 姓名 证件号码 身份证",
  normalizedText: OC.utils.normalizeText("姓名")
}), profile, settings);
assert.equal(result.definition.path, "basics.fullName", "局部姓名标题必须压过同一行相邻的证件号码文本");

result = OC.matcher.matchControl(control("姓名 证件号码", {
  localText: "姓名 证件号码",
  normalizedText: OC.utils.normalizeText("姓名 证件号码")
}), profile, settings);
assert.equal(result, null, "无法分离姓名与证件号码时必须安全跳过，绝不能把身份证号写入姓名");

console.log("OfferCome core tests: PASS");
