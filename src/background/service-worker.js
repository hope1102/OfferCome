const PROFILE_KEY = "offercome.profile";
const SETTINGS_KEY = "offercome.settings";
const APPLICATIONS_KEY = "offercome.applications";

async function configureSidePanel() {
  if (!chrome.sidePanel?.setPanelBehavior) return;
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.error("OfferCome 侧栏配置失败", error);
  }
}

configureSidePanel();
chrome.runtime.onStartup.addListener(configureSidePanel);

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get([PROFILE_KEY, SETTINGS_KEY, APPLICATIONS_KEY]);
  const updates = {};
  if (!stored[PROFILE_KEY]) {
    updates[PROFILE_KEY] = {
      schemaVersion: 1,
      updatedAt: null,
      basics: {},
      education: [],
      experience: [],
      projects: [],
      campus: [],
      skills: [],
      languages: [],
      certificates: [],
      awards: [],
      publications: [],
      family: [],
      answers: {}
    };
  }
  if (!stored[SETTINGS_KEY]) {
    updates[SETTINGS_KEY] = {
      overwriteExisting: false,
      minimumConfidence: 0.62,
      highlightResults: true,
      fillSensitiveFields: false
    };
  }
  if (!Array.isArray(stored[APPLICATIONS_KEY])) updates[APPLICATIONS_KEY] = [];
  if (Object.keys(updates).length) await chrome.storage.local.set(updates);
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "OFFERCOME_OPEN_OPTIONS") chrome.runtime.openOptionsPage();
});
