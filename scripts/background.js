const DEFAULT_SETTINGS = Object.freeze({
  enabled: false,
  color: '#ffffff',
  brightness: 90,
  thickness: 100,
  preset: 'daylight',
  shape: 'frame',
  autoTrigger: false
});

const WEBINAR_DOMAINS = [
  'meet.google.com',
  'teams.microsoft.com',
  'teams.live.com',
  'zoom.us'
];

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    try {
      await chrome.storage.local.set(DEFAULT_SETTINGS);
    } catch (error) {
      console.error(error);
    }
  }

  chrome.contextMenus.create({
    id: 'vrl-toggle',
    title: 'Toggle Virtual Ring Light',
    contexts: ['all']
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === 'vrl-toggle') {
    await toggleRingLightState();
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-light') {
    await toggleRingLightState();
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      const data = await chrome.storage.local.get(DEFAULT_SETTINGS);
      if (data.autoTrigger) {
        const isWebinarTab = WEBINAR_DOMAINS.some(domain => tab.url.includes(domain));
        if (isWebinarTab && !data.enabled) {
          await chrome.storage.local.set({ enabled: true });
          await broadcastState({ ...data, enabled: true });
        }
      }
    } catch (err) {
      console.error(err);
    }
  }
});

async function toggleRingLightState() {
  try {
    const data = await chrome.storage.local.get(DEFAULT_SETTINGS);
    const newEnabledState = !data.enabled;
    await chrome.storage.local.set({ enabled: newEnabledState });
    await broadcastState({ ...data, enabled: newEnabledState });
  } catch (error) {
    console.error(error);
  }
}

async function broadcastState(payload) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  for (const tab of tabs) {
    if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://')) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'VIRTUAL_RINGLIGHT_STATE_CHANGE',
          payload
        });
      } catch {
      }
    }
  }
}
