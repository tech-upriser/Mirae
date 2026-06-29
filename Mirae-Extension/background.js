const inflightSaveRequests = new Map();

// --- Shared helper: make sure content.js is present on the current tab ---
async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'pingMiraeContentScript' });
    return;
  } catch (_error) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
  }
}

async function triggerScrapeOnTab(tab) {
  if (!tab?.id) {
    throw new Error('No active tab found.');
  }

  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
    throw new Error('Mirae cannot save browser internal pages.');
  }

  await ensureContentScript(tab.id);
  return chrome.tabs.sendMessage(tab.id, { action: 'triggerScrape' });
}

// --- 🖱️ RIGHT CLICK MENU SETUP ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-mirae',
    title: 'Save to Mirae',
    contexts: ['page', 'selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'save-to-mirae') return;

  triggerScrapeOnTab(tab).catch((error) => {
    console.warn('Mirae: Failed to trigger scrape from context menu.', error);
  });
});

// --- 🌐 LISTEN TO YOUR REACT DASHBOARD ---
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.message === 'ping') {
    sendResponse({ status: 'online', version: '1.1' });
    return true;
  }

  if (request.message === 'syncToken') {
    chrome.storage.local.set({ token: request.token }, () => {
      sendResponse({ success: true, message: 'Token synced to extension!' });
    });
    return true;
  }

  return false;
});

// --- 🔄 RELAY FOR THE CONTENT SCRIPT + POPUP ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'pingMiraeBackground') {
    sendResponse({ success: true });
    return false;
  }

  if (request.action === 'syncToken') {
    chrome.storage.local.set({ token: request.token }, () => {
      sendResponse({ success: true, message: 'Token synced to extension via content script!' });
    });
    return true;
  }

  if (request.action === 'triggerScrapeFromPopup') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      try {
        const [tab] = tabs;
        const response = await triggerScrapeOnTab(tab);
        sendResponse({ success: true, response });
      } catch (error) {
        sendResponse({ success: false, error: error.message || 'Unable to start scraping.' });
      }
    });
    return true;
  }

  if (request.action === 'saveJob') {
    chrome.storage.local.get(['token'], (result) => {
      const token = result.token;
      const url = request?.data?.url || 'unknown-url';
      const saveKey = `${sender?.tab?.id || 'popup'}:${url}`;

      if (!token) {
        sendResponse({ error: 'You are not logged in! Please open your Mirae dashboard and log in again.' });
        return;
      }

      if (inflightSaveRequests.has(saveKey)) {
        sendResponse({ error: 'This page is already being saved. Please wait a moment.' });
        return;
      }

      inflightSaveRequests.set(saveKey, Date.now());

      fetch('http://localhost:5000/api/tracker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request.data)
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));

          if (res.status === 401) {
            throw new Error(data.error || 'Session expired. Please log in to your Mirae dashboard again.');
          }

          if (!res.ok) {
            throw new Error(data.error || 'Server rejected request. Check backend terminal.');
          }

          return data;
        })
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) => {
          sendResponse({ error: err.message || 'Could not connect to Mirae Backend.' });
        })
        .finally(() => {
          inflightSaveRequests.delete(saveKey);
        });
    });

    return true;
  }

  return false;
});
