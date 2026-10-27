// ContextLens - Service Worker (background.js)
// Manifest V3 compliant

chrome.runtime.onInstalled.addListener(() => {
  console.log("ContextLens extension installed.");

  // Create context menu items for seamless text selection
  chrome.contextMenus.create({
    id: "contextlens-parent",
    title: "ContextLens",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "contextlens-auto-corroborate",
    parentId: "contextlens-parent",
    title: "Find Corroborating & Opposing Evidence (1-Click)",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "contextlens-save-claim",
    parentId: "contextlens-parent",
    title: "Save as Claim (Source A)",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "contextlens-save-evidence",
    parentId: "contextlens-parent",
    title: "Save as Evidence (Source B)",
    contexts: ["selection"]
  });

  // Initialize storage defaults if empty
  chrome.storage.local.get(["history", "settings"], (result) => {
    if (!result.history) {
      chrome.storage.local.set({ history: [] });
    }
    if (!result.settings) {
      chrome.storage.local.set({
        settings: {
          backendUrl: "http://localhost:8000",
          useDemoFallback: true
        }
      });
    }
    chrome.storage.local.get(["appearance"], (appRes) => {
      if (!appRes.appearance) {
        chrome.storage.local.set({
          appearance: {
            activeThemeId: "dark",
            customThemes: [],
            typography: { fontFamily: "system", fontSize: 13, lineHeight: 1.5, fontWeight: "normal" },
            density: "comfortable",
            radiusPreset: "rounded",
            reducedMotion: false,
            borderStrength: "subtle"
          }
        });
      }
    });
  });
});

// Handle Context Menu Clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const selectedText = (info.selectionText || "").trim();
  if (!selectedText) return;

  const pageTitle = tab ? tab.title : "Captured Webpage";
  const pageUrl = tab ? tab.url : "";
  const timestamp = new Date().toISOString();

  const item = {
    id: "item_" + Date.now(),
    text: selectedText,
    title: pageTitle,
    url: pageUrl,
    timestamp: timestamp
  };

  if (info.menuItemId === "contextlens-auto-corroborate") {
    await chrome.storage.local.set({
      current_claim: item,
      auto_corroborate_trigger: Date.now()
    });
    notifyTab(tab?.id, "One-Click Corroborator launched! Discovering evidence...");
    if (chrome.sidePanel && tab?.id) {
      chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
    }
  } else if (info.menuItemId === "contextlens-save-claim") {
    await chrome.storage.local.set({ current_claim: item });
    notifyTab(tab?.id, "Claim saved to ContextLens (Source A)");
  } else if (info.menuItemId === "contextlens-save-evidence") {
    await chrome.storage.local.set({ current_evidence: item });
    notifyTab(tab?.id, "Evidence saved to ContextLens (Source B)");
  }
});

// Listen for messages from content scripts or sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CORROBORATE_CLAIM") {
    chrome.storage.local.set({
      current_claim: message.payload,
      auto_corroborate_trigger: Date.now()
    }, () => {
      sendResponse({ status: "success" });
    });
    return true;
  }

  if (message.type === "CAPTURE_CLAIM") {
    chrome.storage.local.set({ current_claim: message.payload }, () => {
      sendResponse({ status: "success" });
    });
    return true;
  }

  if (message.type === "CAPTURE_EVIDENCE") {
    chrome.storage.local.set({ current_evidence: message.payload }, () => {
      sendResponse({ status: "success" });
    });
    return true;
  }

  if (message.type === "OPEN_SIDEPANEL" && chrome.sidePanel && sender.tab) {
    chrome.sidePanel.open({ tabId: sender.tab.id }).catch((err) => {
      console.warn("Could not open sidePanel:", err);
    });
    sendResponse({ status: "ok" });
    return true;
  }

  if (message.type === "OPEN_APPEARANCE") {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL("appearance.html") });
    }
    sendResponse({ status: "ok" });
    return true;
  }
});

function notifyTab(tabId, message) {
  if (!tabId) return;
  chrome.tabs.sendMessage(tabId, {
    type: "SHOW_TOAST",
    message: message
  }).catch(() => {
    // Ignore error if content script isn't active on tab
  });
}
