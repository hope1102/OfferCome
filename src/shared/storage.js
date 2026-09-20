(function initStorage(global) {
  const OfferCome = global.OfferCome = global.OfferCome || {};
  const { STORAGE_KEYS, utils } = OfferCome;

  async function loadProfile() {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.profile);
    return utils.mergeDefaults(OfferCome.createDefaultProfile(), stored[STORAGE_KEYS.profile]);
  }

  async function saveProfile(profile) {
    const value = utils.mergeDefaults(OfferCome.createDefaultProfile(), profile);
    value.schemaVersion = 1;
    value.updatedAt = new Date().toISOString();
    await chrome.storage.local.set({ [STORAGE_KEYS.profile]: value });
    return value;
  }

  async function loadSettings() {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.settings);
    return utils.mergeDefaults(OfferCome.createDefaultSettings(), stored[STORAGE_KEYS.settings]);
  }

  async function saveSettings(settings) {
    const value = utils.mergeDefaults(OfferCome.createDefaultSettings(), settings);
    await chrome.storage.local.set({ [STORAGE_KEYS.settings]: value });
    return value;
  }

  async function loadApplications() {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.applications);
    const list = stored[STORAGE_KEYS.applications];
    return Array.isArray(list) ? list.map((item) => OfferCome.applications.createApplication(item)) : [];
  }

  async function saveApplications(applications) {
    const value = Array.isArray(applications)
      ? applications.map((item) => OfferCome.applications.createApplication(item))
      : [];
    await chrome.storage.local.set({ [STORAGE_KEYS.applications]: value });
    return value;
  }

  async function upsertApplication(application) {
    const list = await loadApplications();
    const index = list.findIndex((item) => item.id === application.id || (application.sourceUrl && item.sourceUrl === application.sourceUrl));
    const existing = index >= 0 ? list[index] : null;
    const value = OfferCome.applications.createApplication({
      ...existing,
      ...application,
      id: existing?.id || application.id,
      createdAt: existing?.createdAt || application.createdAt,
      timeline: application.timeline || existing?.timeline || [],
      updatedAt: new Date().toISOString()
    });
    if (index >= 0) list[index] = value;
    else list.unshift(value);
    await saveApplications(list);
    return value;
  }

  async function deleteApplication(id) {
    const list = await loadApplications();
    await saveApplications(list.filter((item) => item.id !== id));
  }

  OfferCome.storage = {
    loadProfile, saveProfile, loadSettings, saveSettings,
    loadApplications, saveApplications, upsertApplication, deleteApplication
  };
})(globalThis);
