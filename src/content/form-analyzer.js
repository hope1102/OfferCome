(function initAnalyzer(global) {
  const OfferCome = global.OfferCome = global.OfferCome || {};
  const { normalizeText } = OfferCome.utils;

  const CONTROL_SELECTOR = [
    "input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='password']):not([disabled]):not([readonly])",
    "textarea:not([disabled]):not([readonly])",
    "select:not([disabled])",
    "[contenteditable='true']",
    "[role='combobox']:not(input):not([aria-disabled='true'])"
  ].join(",");

  function visible(element) {
    if (!element || !element.isConnected) return false;
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function labelledByText(element) {
    const ids = (element.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean);
    return ids.map((id) => document.getElementById(id)?.innerText || "").join(" ");
  }

  function directLabel(element) {
    const values = [];
    if (element.labels) values.push(...Array.from(element.labels).map((label) => label.innerText));
    if (element.id) {
      try {
        const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
        if (label) values.push(label.innerText);
      } catch (_) { /* invalid legacy id */ }
    }
    const parentLabel = element.closest("label");
    if (parentLabel) values.push(parentLabel.innerText);
    return values.join(" ");
  }

  function nearbyText(element, adapter) {
    const parts = [];
    const wrappingLabel = element.closest("label");
    if (wrappingLabel) return wrappingLabel.innerText || "";
    for (const selector of adapter.itemContainers) {
      const container = element.closest(selector);
      if (container && container !== document.body) {
        const legend = container.matches("fieldset") ? container.querySelector(":scope > legend") : null;
        if (legend) parts.push(legend.innerText);
        const labelNodes = Array.from(container.querySelectorAll([
          "label", "dt", "th", "[class*='label']", "[class*='Label']",
          "[class*='fieldName']", "[class*='field-name']",
          "[class*='controlName']", "[class*='control-name']"
        ].join(",")));
        const ownLabel = labelNodes.find((node) => node.contains(element));
        if (ownLabel) parts.push(ownLabel.innerText);
        else if (labelNodes.length === 1) parts.push(labelNodes[0].innerText);
        const containerControls = container.querySelectorAll([
          "input", "textarea", "select", "[contenteditable='true']",
          "[role='combobox']", "[aria-haspopup='listbox']"
        ].join(","));
        if (!legend && !labelNodes.length && containerControls.length <= 1) {
          parts.push((container.innerText || "").slice(0, 120));
        }
        break;
      }
    }
    let sibling = element.previousElementSibling;
    let count = 0;
    while (sibling && count < 2) {
      parts.push((sibling.innerText || sibling.textContent || "").slice(0, 100));
      sibling = sibling.previousElementSibling;
      count += 1;
    }
    return parts.join(" ");
  }

  function structuralLabelText(element) {
    const fieldControlSelector = [
      "input", "textarea", "select", "[contenteditable='true']",
      "[role='combobox']", "[aria-haspopup='listbox']"
    ].join(",");
    let node = element;
    let depth = 0;
    while (node?.parentElement && node.parentElement !== document.body && depth < 7) {
      const siblingParts = [];
      let sibling = node.previousElementSibling;
      let siblingCount = 0;
      while (sibling && siblingCount < 3) {
        const siblingText = (sibling.innerText || sibling.textContent || "").trim();
        if (siblingText && siblingText.length <= 100 && !sibling.querySelector(fieldControlSelector)) {
          siblingParts.push(siblingText);
        }
        sibling = sibling.previousElementSibling;
        siblingCount += 1;
      }
      if (siblingParts.length) return [...new Set(siblingParts)].join(" ").slice(0, 180);

      const parent = node.parentElement;
      const controls = parent.querySelectorAll(fieldControlSelector);
      const parentText = (parent.innerText || parent.textContent || "").trim();
      if (controls.length === 1 && parentText && parentText.length <= 120) return parentText;
      node = parent;
      depth += 1;
    }
    return "";
  }

  function detectSection(element) {
    const aliases = OfferCome.SECTION_ALIASES;
    const fromText = (value) => {
      const text = normalizeText(value || "");
      let best = null;
      for (const [section, words] of Object.entries(aliases)) {
        for (const word of words) {
          const normalizedWord = normalizeText(word);
          if (normalizedWord && text.includes(normalizedWord) && (!best || normalizedWord.length > best.length)) {
            best = { section, length: normalizedWord.length };
          }
        }
      }
      return best?.section || null;
    };
    let node = element.parentElement;
    let depth = 0;
    while (node && node !== document.body && depth < 12) {
      const heading = node.querySelector(":scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > legend, :scope > [class*='title'], :scope > [class*='Title']");
      const ownSection = fromText([
        heading?.innerText,
        node.getAttribute("aria-label"),
        node.getAttribute("data-title"),
        node.getAttribute("data-section")
      ].filter(Boolean).join(" "));
      if (ownSection) return ownSection;

      let sibling = node.previousElementSibling;
      let siblingCount = 0;
      while (sibling && siblingCount < 3) {
        const isHeadingLike = sibling.matches("h1, h2, h3, h4, h5, h6, legend, [role='heading'], [class*='title'], [class*='Title'], [class*='header'], [class*='Header']");
        const siblingText = isHeadingLike ? (sibling.innerText || sibling.textContent || "").trim() : "";
        if (siblingText && siblingText.length <= 100) {
          const siblingSection = fromText(siblingText);
          if (siblingSection) return siblingSection;
        }
        sibling = sibling.previousElementSibling;
        siblingCount += 1;
      }
      node = node.parentElement;
      depth += 1;
    }
    return null;
  }

  function controlType(element) {
    const placeholder = element.getAttribute("placeholder") || "";
    const inputType = (element.getAttribute("type") || "text").toLowerCase();
    if (element.matches("input") && ["text", "search"].includes(inputType) && /^(请选择|请选|选择)/.test(placeholder.trim())) return "combobox";
    if (
      element.getAttribute("role") === "combobox" ||
      element.getAttribute("aria-haspopup") === "listbox" ||
      element.matches(".ant-select-selector, [class*='selectControl'], [class*='select-control']")
    ) return "combobox";
    if (element.matches("select")) return "select";
    if (element.matches("textarea")) return "textarea";
    if (element.matches("[contenteditable='true']")) return "contenteditable";
    if (element.matches("[role='combobox']:not(input)")) return "combobox";
    return (element.getAttribute("type") || "text").toLowerCase();
  }

  function currentValue(element, type) {
    if (type === "checkbox" || type === "radio") return element.checked ? element.value || "true" : "";
    if (type === "contenteditable") return element.innerText || "";
    if (type === "select") {
      const option = element.selectedOptions?.[0];
      const text = normalizeText(option?.textContent || "");
      if (!option || option.disabled || !text || /^(请选择|选择|select|pleaseselect)$/.test(text)) return "";
    }
    return element.value || "";
  }

  function isRequired(element, contextText = "") {
    return element.required || element.getAttribute("aria-required") === "true" || /\*|必填|required/i.test(directLabel(element) + " " + contextText);
  }

  function analyze() {
    const adapter = OfferCome.siteAdapters.current();
    const selectors = [CONTROL_SELECTOR, ...(adapter.controlSelectors || [])].join(",");
    const elements = Array.from(document.querySelectorAll(selectors)).filter(visible);
    const controls = [];
    const seen = new Set();

    elements.forEach((element, domIndex) => {
      if (seen.has(element)) return;
      const type = controlType(element);
      if (type === "combobox") {
        const childInput = element.querySelector("input");
        if (childInput && visible(childInput) && elements.includes(childInput)) return;
      }
      seen.add(element);
      const labelText = directLabel(element);
      const structuralText = structuralLabelText(element);
      const contextualText = nearbyText(element, adapter);
      const textParts = [
        labelText,
        labelledByText(element),
        element.getAttribute("aria-label"),
        element.getAttribute("placeholder"),
        element.getAttribute("name"),
        element.id,
        element.getAttribute("title"),
        structuralText,
        contextualText
      ].filter(Boolean);
      const localTextParts = [
        labelText,
        labelledByText(element),
        element.getAttribute("aria-label"),
        element.getAttribute("placeholder"),
        element.getAttribute("name"),
        element.id,
        element.getAttribute("title"),
        structuralText
      ].filter(Boolean);
      const rawText = [...new Set(textParts)].join(" ").slice(0, 500);
      controls.push({
        element,
        domIndex,
        type,
        rawText,
        normalizedText: normalizeText(rawText),
        localText: [...new Set(localTextParts)].join(" ").slice(0, 300),
        section: detectSection(element) || (() => {
          const text = normalizeText(rawText);
          let best = null;
          Object.entries(OfferCome.SECTION_ALIASES).forEach(([section, words]) => {
            words.forEach((word) => {
              const normalizedWord = normalizeText(word);
              if (normalizedWord && text.includes(normalizedWord) && (!best || normalizedWord.length > best.length)) best = { section, length: normalizedWord.length };
            });
          });
          return best?.section || null;
        })(),
        autocomplete: (element.getAttribute("autocomplete") || "").toLowerCase(),
        required: isRequired(element, structuralText + " " + contextualText),
        existingValue: currentValue(element, type),
        name: element.getAttribute("name") || "",
        id: element.id || "",
        labelText
      });
    });

    assignRepeatedIndexes(controls);
    return { adapter, controls };
  }

  function assignRepeatedIndexes(controls) {
    const sectionCounters = {};
    controls.forEach((control) => {
      if (!control.section) {
        control.sectionIndex = 0;
        return;
      }
      const signatureText = normalizeText(control.labelText || control.element.getAttribute("placeholder") || control.type);
      const signature = `${control.section}:${signatureText}`;
      const count = sectionCounters[signature] || 0;
      control.sectionIndex = count;
      sectionCounters[signature] = count + 1;
    });
  }

  OfferCome.formAnalyzer = { analyze, visible, currentValue, structuralLabelText };
})(globalThis);
