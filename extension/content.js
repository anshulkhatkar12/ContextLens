// ContextLens Content Script
// Handles on-page text selection, floating capture pill, and communication

(function () {
  let floatingPill = null;
  let toastContainer = null;
  let lastSelectionText = "";

  // Listen for text selection
  document.addEventListener("mouseup", handleSelectionChange);
  document.addEventListener("keyup", handleSelectionChange);

  // Dismiss pill on click outside
  document.addEventListener("mousedown", (e) => {
    if (floatingPill && !floatingPill.contains(e.target)) {
      removePill();
    }
  });

  // Listen for messages from extension popup/sidepanel or background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_SELECTION") {
      const selection = window.getSelection().toString().trim();
      sendResponse({
        text: selection,
        title: document.title || "Untitled Webpage",
        url: window.location.href,
        timestamp: new Date().toISOString()
      });
      return true;
    }

    if (message.type === "SHOW_TOAST") {
      showToast(message.message);
      sendResponse({ status: "ok" });
      return true;
    }
  });

  function handleSelectionChange(e) {
    // Avoid re-triggering if clicking inside the pill itself
    if (floatingPill && floatingPill.contains(e.target)) return;

    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : "";

    if (!text || text.length < 5) {
      removePill();
      return;
    }

    lastSelectionText = text;

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        removePill();
        return;
      }

      showFloatingPill(rect, text);
    } catch (err) {
      console.warn("ContextLens selection error:", err);
    }
  }

  function showFloatingPill(rect, text) {
    removePill();

    floatingPill = document.createElement("div");
    floatingPill.id = "contextlens-floating-pill";

    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    // Position above selection if space permits, else below
    let top = rect.top + scrollY - 42;
    if (top < scrollY + 10) {
      top = rect.bottom + scrollY + 8;
    }
    const left = Math.max(10, rect.left + scrollX + (rect.width / 2) - 110);

    floatingPill.style.top = `${top}px`;
    floatingPill.style.left = `${left}px`;

    floatingPill.innerHTML = `
      <span class="contextlens-pill-brand">🔍 ContextLens</span>
      <button class="contextlens-pill-btn btn-claim" title="Save as Claim (Source A)">+ Claim A</button>
      <button class="contextlens-pill-btn btn-evidence" title="Save as Evidence (Source B)">+ Evidence B</button>
    `;

    const claimBtn = floatingPill.querySelector(".btn-claim");
    const evidenceBtn = floatingPill.querySelector(".btn-evidence");

    const payload = {
      id: "item_" + Date.now(),
      text: text,
      title: document.title || "Untitled Webpage",
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    claimBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ current_claim: payload }, () => {
          showToast("Claim saved as Source A ✓");
          removePill();
        });
      } else if (typeof chrome !== "undefined" && chrome.runtime) {
        chrome.runtime.sendMessage({ type: "CAPTURE_CLAIM", payload }, () => {
          showToast("Claim saved as Source A ✓");
          removePill();
        });
      }
    });

    evidenceBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ current_evidence: payload }, () => {
          showToast("Evidence saved as Source B ✓");
          removePill();
        });
      } else if (typeof chrome !== "undefined" && chrome.runtime) {
        chrome.runtime.sendMessage({ type: "CAPTURE_EVIDENCE", payload }, () => {
          showToast("Evidence saved as Source B ✓");
          removePill();
        });
      }
    });

    document.body.appendChild(floatingPill);
  }

  function removePill() {
    if (floatingPill && floatingPill.parentNode) {
      floatingPill.parentNode.removeChild(floatingPill);
    }
    floatingPill = null;
  }

  function showToast(message) {
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "contextlens-toast-container";
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement("div");
    toast.className = "contextlens-toast";
    toast.innerHTML = `<span>🔍</span><span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast && toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3200);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
})();
