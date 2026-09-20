(function initMatcher(global) {
  const OfferCome = global.OfferCome = global.OfferCome || {};
  const { normalizeText, getByPath, isBlank } = OfferCome.utils;

  const NEGATIVE_PAIRS = [
    ["email", "phone"], ["姓名", "公司名称"], ["姓名", "学校名称"],
    ["开始", "结束"], ["入学", "毕业"], ["省", "市"]
  ];

  function valueForDefinition(profile, definition, control) {
    if (!definition.section) return getByPath(profile, definition.path);
    const array = profile[definition.section];
    if (!Array.isArray(array) || !array.length) return undefined;
    const key = definition.path.split(".").slice(1).join(".");
    const index = control.sectionIndex || 0;
    if (index >= array.length) return undefined;
    return getByPath(array[index], key);
  }

  function scoreAlias(control, alias) {
    const target = control.normalizedText;
    const word = normalizeText(alias);
    if (!target || !word) return 0;
    if (target === word) return 0.96;
    if (target.startsWith(word) || target.endsWith(word)) return word.length >= 3 ? 0.88 : 0.7;
    if (target.includes(word)) return word.length >= 4 ? 0.84 : word.length >= 2 ? 0.7 : 0;
    if (word.includes(target) && target.length >= 4) return 0.72;
    return 0;
  }

  function inferSectionFromText(rawText) {
    const text = normalizeText(rawText);
    let best = null;
    Object.entries(OfferCome.SECTION_ALIASES).forEach(([section, aliases]) => {
      aliases.forEach((alias) => {
        const word = normalizeText(alias);
        if (word && text.includes(word) && (!best || word.length > best.length)) {
          best = { section, length: word.length };
        }
      });
    });
    return best?.section || null;
  }

  function scoreDefinition(control, definition) {
    let score = 0;
    const autocompleteTokens = String(control.autocomplete || "").split(/\s+/).filter(Boolean);
    if (definition.autocomplete?.some((token) => autocompleteTokens.includes(token))) score = 0.99;
    definition.aliases.forEach((alias) => { score = Math.max(score, scoreAlias(control, alias)); });

    if (definition.section) {
      if (control.section === definition.section) score += 0.08;
      else if (control.section && control.section !== definition.section) return 0;
      else score -= 0.06;
    } else if (control.section) {
      score += definition.allowedSections?.includes(control.section) ? 0.03 : -0.45;
    }

    if (definition.dateRole === "start" && /结束|毕业|离职|end|to/.test(control.rawText.toLowerCase())) score -= 0.45;
    if (definition.dateRole === "end" && /开始|入学|入职|start|from/.test(control.rawText.toLowerCase())) score -= 0.45;
    if (definition.kind === "date" && ["date", "month"].includes(control.type)) score += 0.04;
    if (definition.kind === "choice" && ["select", "radio", "checkbox", "combobox"].includes(control.type)) score += 0.03;
    if (["select", "radio", "checkbox", "combobox"].includes(control.type) && !["choice", "date"].includes(definition.kind)) score -= 0.3;

    for (const [left, right] of NEGATIVE_PAIRS) {
      const label = normalizeText(definition.label);
      const raw = control.rawText.toLowerCase();
      if (label.includes(normalizeText(left)) && raw.includes(right)) score -= 0.25;
    }
    return Math.max(0, Math.min(1, score));
  }

  function matchControl(control, profile, settings) {
    const localSemanticText = normalizeText(control.localText || "");
    const hasNameIdentityConflict = /姓名|name/.test(localSemanticText) && /证件号|身份证|identitynumber|nationalid/.test(localSemanticText);
    if (hasNameIdentityConflict) return null;
    const localSection = inferSectionFromText(control.localText || control.rawText);
    const scopedControl = localSection && localSection !== control.section
      ? { ...control, section: localSection }
      : control.section
        ? control
        : { ...control, section: localSection };
    const candidates = [];
    OfferCome.FIELD_DEFINITIONS.forEach((definition) => {
      const value = valueForDefinition(profile, definition, scopedControl);
      if (isBlank(value)) return;
      if (definition.sensitive && !settings.fillSensitiveFields) return;
      const score = scoreDefinition(scopedControl, definition);
      if (score > 0) candidates.push({ definition, value, confidence: score });
    });
    candidates.sort((left, right) => right.confidence - left.confidence);
    const best = candidates[0];
    if (!best || best.confidence < settings.minimumConfidence) return null;
    const second = candidates[1];
    if (second && best.confidence < 0.9 && second.confidence >= settings.minimumConfidence && best.confidence - second.confidence < 0.06) return null;
    return best;
  }

  function matchAll(controls, profile, settings) {
    return controls.map((control) => ({ control, match: matchControl(control, profile, settings) }));
  }

  OfferCome.matcher = { matchAll, matchControl, scoreDefinition, inferSectionFromText };
})(globalThis);
