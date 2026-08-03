'use strict';

importScripts('shared/constants.js');

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    try {
      await chrome.storage.local.set(DEFAULT_SETTINGS);
    } catch (error) {
      console.warn('Virtual Ring Light: failed to set default settings', error);
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
  if (changeInfo.status !== 'complete' || !tab.url) return;

  try {
    const data = await chrome.storage.local.get(DEFAULT_SETTINGS);
    if (!data.autoTrigger || data.enabled) return;

    const isWebinarTab = WEBINAR_DOMAINS.some((domain) => tab.url.includes(domain));
    if (isWebinarTab) {
      await chrome.storage.local.set({ enabled: true });
    }
  } catch (error) {
    console.warn('Virtual Ring Light: auto-trigger check failed', error);
  }
});

async function toggleRingLightState() {
  try {
    const data = await chrome.storage.local.get(DEFAULT_SETTINGS);
    await chrome.storage.local.set({ enabled: !data.enabled });
  } catch (error) {
    console.warn('Virtual Ring Light: failed to toggle state', error);
  }
}
