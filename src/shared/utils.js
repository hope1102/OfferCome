(function initUtils(global) {
  const OfferCome = global.OfferCome = global.OfferCome || {};

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\s\u00a0_*：:()（）\[\]【】<>《》\/\\|,，.。?？!！'“”\-—_]/g, "")
      .replace(/必填|required|请输入|请选择|请填写|select|enter/g, "");
  }

  function getByPath(object, path) {
    if (!path) return undefined;
    return path.split(".").reduce((value, key) => value == null ? undefined : value[key], object);
  }

  function setByPath(object, path, value) {
    const keys = path.split(".");
    let target = object;
    keys.slice(0, -1).forEach((key) => {
      if (!target[key] || typeof target[key] !== "object") target[key] = {};
      target = target[key];
    });
    target[keys[keys.length - 1]] = value;
    return object;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function mergeDefaults(defaultValue, savedValue) {
    if (Array.isArray(defaultValue)) return Array.isArray(savedValue) ? savedValue : clone(defaultValue);
    if (defaultValue && typeof defaultValue === "object") {
      const saved = savedValue && typeof savedValue === "object" ? savedValue : {};
      const result = {};
      Object.keys(defaultValue).forEach((key) => {
        result[key] = mergeDefaults(defaultValue[key], saved[key]);
      });
      Object.keys(saved).forEach((key) => {
        if (!(key in result)) result[key] = saved[key];
      });
      return result;
    }
    return savedValue === undefined || savedValue === null ? defaultValue : savedValue;
  }

  function mergePartial(currentValue, patchValue) {
    if (patchValue === undefined) return clone(currentValue);
    if (Array.isArray(patchValue)) return clone(patchValue);
    if (patchValue && typeof patchValue === "object") {
      const result = currentValue && typeof currentValue === "object" && !Array.isArray(currentValue)
        ? clone(currentValue)
        : {};
      Object.keys(patchValue).forEach((key) => {
        result[key] = mergePartial(result[key], patchValue[key]);
      });
      return result;
    }
    return patchValue;
  }

  function isBlank(value) {
    return value === undefined || value === null || String(value).trim() === "";
  }

  function formatDate(value, mode) {
    if (!value) return "";
    const match = String(value).match(/(\d{4})\D?(\d{1,2})?\D?(\d{1,2})?/);
    if (!match) return String(value);
    const year = match[1];
    const month = (match[2] || "01").padStart(2, "0");
    const day = (match[3] || "01").padStart(2, "0");
    if (mode === "month") return `${year}-${month}`;
    if (mode === "year") return year;
    if (mode === "zhMonth") return `${year}年${Number(month)}月`;
    return `${year}-${month}-${day}`;
  }

  function debounce(fn, delay) {
    let timer;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  OfferCome.utils = {
    normalizeText,
    getByPath,
    setByPath,
    clone,
    mergeDefaults,
    mergePartial,
    isBlank,
    formatDate,
    debounce
  };
})(globalThis);
