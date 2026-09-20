(function initFiller(global) {
  const OfferCome = global.OfferCome = global.OfferCome || {};
  const { normalizeText, formatDate, isBlank } = OfferCome.utils;

  function emit(element, name) {
    element.dispatchEvent(new Event(name, { bubbles: true, composed: true }));
  }

  function emitMouse(element, name) {
    element.dispatchEvent(new MouseEvent(name, { bubbles: true, composed: true, cancelable: true, view: window }));
  }

  function setNativeValue(element, value) {
    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (setter) setter.call(element, value);
    else element.value = value;
  }

  function normalizedBoolean(value) {
    const text = normalizeText(value);
    if (["是", "有", "接受", "愿意", "yes", "true", "1"].some((word) => text === normalizeText(word))) return true;
    if (["否", "无", "不接受", "不愿意", "no", "false", "0"].some((word) => text === normalizeText(word))) return false;
    return null;
  }

  function choiceScore(optionText, value) {
    const option = normalizeText(optionText);
    const wanted = normalizeText(value);
    if (!option || !wanted) return 0;
    if (option === wanted) return 4;
    const boolean = normalizedBoolean(value);
    const optionBoolean = normalizedBoolean(optionText);
    if (boolean !== null) return optionBoolean === boolean ? 3.5 : 0;
    if (/不限|皆可|均可|任意|any|all/.test(option) && !/不限|皆可|均可|任意|any|all/.test(wanted)) return 0;
    if (option.includes(wanted)) return wanted.length >= 2 ? 3 : 0;
    if (wanted.includes(option)) return option.length >= 2 ? 2 : 0;
    return 0;
  }

  function choiceMatches(optionText, value) {
    return choiceScore(optionText, value) > 0;
  }

  function bestChoice(items, value, textForItem) {
    const ranked = items.map((item) => ({ item, score: textForItem(item) })).filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score);
    if (!ranked.length) return null;
    if (ranked[1] && ranked[0].score === ranked[1].score) return null;
    return ranked[0].item;
  }

  function valueForInput(control, value) {
    if (control.type === "date") return formatDate(value, "date");
    if (control.type === "month") return formatDate(value, "month");
    if (control.type === "number") {
      const number = String(value).match(/-?\d+(?:\.\d+)?/);
      return number ? number[0] : String(value);
    }
    return String(value);
  }

  function waitForUi(delay = 60) {
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  const DROPDOWN_ROOT_SELECTOR = [
    "[role='listbox']", ".ant-select-dropdown", ".el-select-dropdown", ".semi-select-option-list",
    "[class*='select-dropdown']", "[class*='selectDropdown']",
    "[class*='option-list']", "[class*='optionList']", "[class*='dropdown-menu']",
    "[class*='picker-panel']", "[class*='PickerPanel']",
    "[class*='popover']", "[class*='Popover']", "[class*='popup']", "[class*='Popup']"
  ].join(",");

  const DROPDOWN_OPTION_SELECTOR = [
    "[role='option']", ".ant-select-item-option", ".el-select-dropdown__item", ".semi-select-option",
    "[class*='option-item']", "[class*='optionItem']", "[class*='select-option']",
    "[class*='Option']", "[class*='dropdown-item']", "[class*='menu-item']",
    "[class*='MenuItem']", "[data-value]", "[data-key]", "li"
  ].join(",");

  function valuesEquivalent(actual, expected, control) {
    if (control.type === "number") return Number(actual) === Number(expected);
    if (control.type === "date") return String(actual) === formatDate(expected, "date");
    if (control.type === "month") return String(actual) === formatDate(expected, "month");
    const actualText = normalizeText(actual);
    const expectedText = normalizeText(expected);
    return Boolean(actualText && expectedText && (actualText === expectedText || actualText.includes(expectedText) || expectedText.includes(actualText)));
  }

  async function fillText(control, value) {
    const element = control.element;
    if (element.readOnly) return false;
    const expected = valueForInput(control, value);
    element.focus({ preventScroll: true });
    setNativeValue(element, expected);
    emit(element, "input");
    emit(element, "change");
    element.blur();
    await waitForUi();
    return valuesEquivalent(element.value, expected, control);
  }

  async function fillContentEditable(control, value) {
    const element = control.element;
    element.focus({ preventScroll: true });
    element.textContent = String(value);
    emit(element, "input");
    emit(element, "change");
    element.blur();
    await waitForUi();
    return valuesEquivalent(element.innerText || element.textContent, value, control);
  }

  function fillSelect(control, value) {
    const element = control.element;
    const option = bestChoice(Array.from(element.options), value, (item) => Math.max(choiceScore(item.text, value), choiceScore(item.value, value)));
    if (!option) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    if (setter) setter.call(element, option.value);
    else element.value = option.value;
    emit(element, "input");
    emit(element, "change");
    return element.value === option.value;
  }

  function fillCheckable(control, value) {
    const element = control.element;
    const adjacentText = element.nextSibling?.textContent || "";
    const label = `${element.value || ""} ${adjacentText} ${element.labels?.[0]?.innerText || control.rawText}`;
    const boolean = normalizedBoolean(value);
    const optionBoolean = normalizedBoolean(element.value || adjacentText);
    if (control.type === "checkbox" && boolean !== null) {
      if (element.checked !== boolean) element.click();
      emit(element, "change");
      return element.checked === boolean;
    }
    const shouldCheck = boolean !== null && optionBoolean !== null ? boolean === optionBoolean : choiceMatches(label, value);
    if (!shouldCheck) return control.type === "radio" ? "not-target" : false;
    if (!element.checked) element.click();
    emit(element, "change");
    return element.checked;
  }

  async function fillCombobox(control, value) {
    const element = control.element;
    const beforeRoots = new Set(Array.from(document.querySelectorAll(DROPDOWN_ROOT_SELECTOR)).filter(OfferCome.formAnalyzer.visible));
    const beforeCandidates = new Set(Array.from(document.querySelectorAll(DROPDOWN_OPTION_SELECTOR)).filter(OfferCome.formAnalyzer.visible));
    element.focus?.({ preventScroll: true });
    emitMouse(element, "pointerdown");
    emitMouse(element, "mousedown");
    element.click();
    await new Promise((resolve) => setTimeout(resolve, 220));
    const controlledId = String(element.getAttribute("aria-controls") || "").split(/\s+/).find(Boolean);
    const controlledRoot = controlledId ? document.getElementById(controlledId) : null;
    const visibleListboxes = Array.from(document.querySelectorAll(DROPDOWN_ROOT_SELECTOR))
      .filter((item) => OfferCome.formAnalyzer.visible(item));
    const newlyVisibleRoot = visibleListboxes.filter((item) => !beforeRoots.has(item)).at(-1);
    const optionRoot = (controlledRoot && OfferCome.formAnalyzer.visible(controlledRoot) ? controlledRoot : null) || newlyVisibleRoot || visibleListboxes.at(-1) || document;
    let candidates = Array.from(optionRoot.querySelectorAll(DROPDOWN_OPTION_SELECTOR))
      .filter((item) => OfferCome.formAnalyzer.visible(item));
    if (optionRoot === document || !candidates.length) {
      candidates = Array.from(document.querySelectorAll(DROPDOWN_OPTION_SELECTOR))
        .filter((item) => OfferCome.formAnalyzer.visible(item) && !beforeCandidates.has(item));
    }
    if (!candidates.length && optionRoot !== document) {
      candidates = Array.from(optionRoot.querySelectorAll("*"))
        .filter((item) => OfferCome.formAnalyzer.visible(item) && item.childElementCount === 0);
    }
    candidates = candidates.filter((item) => {
      const text = (item.innerText || item.textContent || "").trim();
      if (!text || text.length > 100) return false;
      return !Array.from(item.children).some((child) => choiceScore(child.innerText || child.textContent, value) > 0);
    });
    const option = bestChoice(candidates, value, (item) => choiceScore(item.innerText || item.textContent, value));
    if (!option) {
      emit(element, "blur");
      return false;
    }
    option.click();
    await waitForUi(100);
    const input = element.matches("input") ? element : element.querySelector("input");
    const displayed = input?.value || element.getAttribute("aria-valuetext") || element.textContent || "";
    return choiceMatches(displayed, value) || option.getAttribute("aria-selected") === "true";
  }

  function dateParts(value) {
    const parts = String(value || "").match(/\d+/g) || [];
    if (parts.length < 2) return null;
    return {
      year: parts[0].padStart(4, "0"),
      month: parts[1].padStart(2, "0"),
      day: (parts[2] || "01").padStart(2, "0")
    };
  }

  function dateValuesEquivalent(actual, expected, includeDay) {
    const left = dateParts(actual);
    const right = dateParts(expected);
    if (!left || !right) return false;
    return left.year === right.year && left.month === right.month && (!includeDay || left.day === right.day);
  }

  async function fillDateControl(control, value) {
    const element = control.element;
    const input = element.matches("input") ? element : element.querySelector("input");
    if (!input) return false;
    const parts = dateParts(value);
    if (!parts) return false;
    const includeDay = control.type !== "month";
    const candidates = includeDay
      ? [parts.year + "-" + parts.month + "-" + parts.day, parts.year + "/" + parts.month + "/" + parts.day, parts.year + "年" + parts.month + "月" + parts.day + "日"]
      : [parts.year + "-" + parts.month, parts.year + "/" + parts.month, parts.year + "年" + parts.month + "月"];
    const wasReadOnly = input.readOnly;
    if (wasReadOnly) input.removeAttribute("readonly");
    try {
      for (const candidate of candidates) {
        input.focus({ preventScroll: true });
        setNativeValue(input, candidate);
        emit(input, "input");
        emit(input, "change");
        input.blur();
        await waitForUi(100);
        if (dateValuesEquivalent(input.value, candidate, includeDay)) return true;
      }
    } finally {
      if (wasReadOnly) input.setAttribute("readonly", "");
    }
    return false;
  }

  function highlight(element, state) {
    element.classList.remove("offercome-filled", "offercome-failed", "offercome-unmatched");
    element.classList.add(`offercome-${state}`);
    setTimeout(() => element.classList.remove(`offercome-${state}`), 5000);
  }

  async function fillOne(control, match, settings) {
    const { element, type } = control;
    if (!settings.overwriteExisting && !isBlank(control.existingValue)) return { status: "skipped", reason: "已有内容" };
    if (type === "file") return { status: "skipped", reason: "附件需手动选择" };
    let success = false;
    try {
      if (match.definition.kind === "date") {
        success = await fillDateControl(control, match.value);
        if (!success && type === "combobox") success = await fillCombobox(control, match.value);
      }
      else if (["text", "email", "tel", "number", "url", "date", "month", "search"].includes(type)) success = await fillText(control, match.value);
      else if (type === "textarea") success = await fillText(control, match.value);
      else if (type === "contenteditable") success = await fillContentEditable(control, match.value);
      else if (type === "select") success = fillSelect(control, match.value);
      else if (type === "radio" || type === "checkbox") {
        const outcome = fillCheckable(control, match.value);
        if (outcome === "not-target") return { status: "skipped", reason: "同组中的其他选项" };
        success = outcome;
      }
      else if (type === "combobox") success = await fillCombobox(control, match.value);
    } catch (_) {
      success = false;
    }
    if (settings.highlightResults) highlight(element, success ? "filled" : "failed");
    return { status: success ? "filled" : "failed", reason: success ? "" : "控件拒绝该值或没有匹配选项" };
  }

  async function fillAll(pairs, settings) {
    const results = [];
    for (const pair of pairs) {
      if (!pair.match) continue;
      const result = await fillOne(pair.control, pair.match, settings);
      results.push({ pair, ...result });
    }
    pairs.filter((pair) => !pair.match && pair.control.required).forEach((pair) => {
      if (settings.highlightResults) highlight(pair.control.element, "unmatched");
    });
    return results;
  }

  OfferCome.filler = { fillAll, fillOne, choiceMatches, choiceScore, bestChoice, valueForInput, valuesEquivalent };
})(globalThis);
