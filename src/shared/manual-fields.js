(function initManualFields(global) {
  const OfferCome = global.OfferCome = global.OfferCome || {};
  const { getByPath, isBlank } = OfferCome.utils;

  const GROUP_LABELS = {
    basics: "基本信息",
    education: "教育经历",
    experience: "工作/实习经历",
    projects: "项目经历",
    campus: "校园经历",
    skills: "专业技能",
    languages: "语言能力",
    certificates: "证书",
    awards: "奖项",
    publications: "论文/专利",
    family: "家庭成员",
    answers: "常见问答"
  };

  const CATEGORIES = [
    { key: "basics", label: "基本信息" },
    { key: "jobIntent", label: "求职期望" },
    { key: "education", label: "教育背景" },
    { key: "experience", label: "实习/工作经历" },
    { key: "projects", label: "项目经验" },
    { key: "campus", label: "校园经历" },
    { key: "family", label: "家庭成员" },
    { key: "awards", label: "获奖经历" },
    { key: "skills", label: "专业技能" },
    { key: "languages", label: "语言能力" },
    { key: "certificates", label: "证书信息" },
    { key: "publications", label: "论文/专利" },
    { key: "selfIntro", label: "自我介绍" },
    { key: "answers", label: "常见问答" }
  ];

  const JOB_INTENT_PATHS = new Set([
    "basics.targetCity", "basics.targetPosition", "basics.expectedSalary", "basics.availableDate"
  ]);
  const SELF_INTRO_PATHS = new Set(["basics.summary", "basics.strengths", "basics.hobbies"]);

  const ITEM_TITLES = {
    education: ["school", "major"],
    experience: ["company", "position"],
    projects: ["name", "role"],
    campus: ["cadrePosition", "cadreLevel"],
    skills: ["name", "level"],
    languages: ["name", "level"],
    certificates: ["name", "issuer"],
    awards: ["name", "level"],
    publications: ["title", "channel"],
    family: ["relationship"]
  };

  function valueFor(profile, definition, sectionIndex = 0) {
    if (!definition?.section) return getByPath(profile, definition?.path);
    const items = profile?.[definition.section];
    if (!Array.isArray(items) || sectionIndex < 0 || sectionIndex >= items.length) return undefined;
    const relativePath = definition.path.split(".").slice(1).join(".");
    return getByPath(items[sectionIndex], relativePath);
  }

  function itemTitle(section, item) {
    const parts = (ITEM_TITLES[section] || [])
      .map((path) => getByPath(item, path))
      .filter((value) => !isBlank(value))
      .map(String);
    return parts.slice(0, 2).join(" · ");
  }

  function categoryFor(definition) {
    if (JOB_INTENT_PATHS.has(definition.path)) return CATEGORIES.find((item) => item.key === "jobIntent");
    if (SELF_INTRO_PATHS.has(definition.path)) return CATEGORIES.find((item) => item.key === "selfIntro");
    const key = definition.section || definition.path.split(".")[0];
    return CATEGORIES.find((item) => item.key === key) || { key, label: GROUP_LABELS[key] || key };
  }

  function buildEntries(profile) {
    const entries = [];
    OfferCome.FIELD_DEFINITIONS.forEach((definition) => {
      if (definition.section) {
        const items = Array.isArray(profile?.[definition.section]) ? profile[definition.section] : [];
        items.forEach((item, sectionIndex) => {
          const value = valueFor(profile, definition, sectionIndex);
          if (isBlank(value)) return;
          const title = itemTitle(definition.section, item);
          const category = categoryFor(definition);
          entries.push({
            key: `${definition.path}:${sectionIndex}`,
            path: definition.path,
            label: definition.label,
            value: String(value),
            kind: definition.kind || "text",
            sensitive: Boolean(definition.sensitive),
            section: definition.section,
            sectionIndex,
            categoryKey: category.key,
            categoryLabel: category.label,
            groupLabel: `${GROUP_LABELS[definition.section] || definition.section} ${sectionIndex + 1}${title ? ` · ${title}` : ""}`
          });
        });
        return;
      }

      const value = valueFor(profile, definition);
      if (isBlank(value)) return;
      const root = definition.path.split(".")[0];
      const category = categoryFor(definition);
      entries.push({
        key: definition.path,
        path: definition.path,
        label: definition.label,
        value: String(value),
        kind: definition.kind || "text",
        sensitive: Boolean(definition.sensitive),
        section: null,
        sectionIndex: 0,
        categoryKey: category.key,
        categoryLabel: category.label,
        groupLabel: category.label
      });
    });
    return entries;
  }

  OfferCome.manualFields = { CATEGORIES, buildEntries, valueFor };
})(globalThis);
