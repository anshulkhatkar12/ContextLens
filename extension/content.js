// ContextLens Content Script
// Handles on-page text selection, draggable floating pill, persistent floating badge,
// and in-page draggable floating comparison window.

(function () {
  let floatingPill = null;
  let floatingBadge = null;
  let floatingWindow = null;
  let toastContainer = null;
  let lastSelectionText = "";
  let isPillDragging = false;
  let isWindowDragging = false;

  // Initialize on load
  initFloatingBadge();

  // Listen for text selection
  document.addEventListener("mouseup", handleSelectionChange);
  document.addEventListener("keyup", handleSelectionChange);

  // Dismiss selection pill on click outside (unless currently dragging or clicking floating window)
  document.addEventListener("mousedown", (e) => {
    if (isPillDragging || isWindowDragging) return;
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

    if (message.type === "TOGGLE_FLOATING_WINDOW") {
      toggleFloatingComparisonWindow();
      sendResponse({ status: "ok" });
      return true;
    }
  });

  // ---------------------------------------------------------------------------
  // 1. Text Selection Handler & Floating Pill (Draggable)
  // ---------------------------------------------------------------------------
  function handleSelectionChange(e) {
    if (isPillDragging || isWindowDragging) return;
    if (floatingPill && floatingPill.contains(e.target)) return;
    if (floatingBadge && floatingBadge.contains(e.target)) return;
    if (floatingWindow && floatingWindow.contains(e.target)) return;

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

    // Viewport-based positioning
    let top = rect.top - 46;
    if (top < 12) {
      top = rect.bottom + 10;
    }
    let left = Math.max(12, Math.min(rect.left + (rect.width / 2) - 150, window.innerWidth - 320));

    floatingPill.style.top = `${top}px`;
    floatingPill.style.left = `${left}px`;

    floatingPill.innerHTML = `
      <span class="contextlens-drag-handle" title="Drag to hover anywhere on page">
        <svg width="10" height="14" viewBox="0 0 10 16" fill="currentColor">
          <circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/>
          <circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
          <circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/>
        </svg>
      </span>
      <span class="contextlens-pill-brand">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block; vertical-align:middle; margin-right:3px;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>ContextLens
      </span>
      <button type="button" class="contextlens-pill-btn btn-claim" title="Save as Claim (Source A)">+ Claim A</button>
      <button type="button" class="contextlens-pill-btn btn-evidence" title="Save as Evidence (Source B)">+ Evidence B</button>
      <button type="button" class="contextlens-pill-btn btn-open-compare" title="Open Draggable Comparison Window">Compare</button>
      <button type="button" class="contextlens-pill-close" title="Dismiss">&times;</button>
    `;

    const claimBtn = floatingPill.querySelector(".btn-claim");
    const evidenceBtn = floatingPill.querySelector(".btn-evidence");
    const openCompareBtn = floatingPill.querySelector(".btn-open-compare");
    const closeBtn = floatingPill.querySelector(".contextlens-pill-close");

    const payload = {
      id: "item_" + Date.now(),
      text: text,
      title: document.title || "Untitled Webpage",
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    claimBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      saveCapture("current_claim", "CAPTURE_CLAIM", payload, "Claim saved as Source A");
    });

    evidenceBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      saveCapture("current_evidence", "CAPTURE_EVIDENCE", payload, "Evidence saved as Source B");
    });

    openCompareBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      toggleFloatingComparisonWindow(true);
    });

    closeBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      removePill();
    });

    // Make the pill draggable all around the webpage
    makeElementDraggable(floatingPill, floatingPill.querySelector(".contextlens-drag-handle"), (dragging) => {
      isPillDragging = dragging;
    });

    document.body.appendChild(floatingPill);
  }

  function saveCapture(storageKey, messageType, payload, successMsg) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [storageKey]: payload }, () => {
        showToast(successMsg);
        removePill();
      });
    } else if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage({ type: messageType, payload }, () => {
        showToast(successMsg);
        removePill();
      });
    }
  }

  function removePill() {
    if (floatingPill && floatingPill.parentNode) {
      floatingPill.parentNode.removeChild(floatingPill);
    }
    floatingPill = null;
    isPillDragging = false;
  }

  // ---------------------------------------------------------------------------
  // 2. Persistent Floating Badge (Draggable all around the page)
  // ---------------------------------------------------------------------------
  function initFloatingBadge() {
    if (document.getElementById("contextlens-floating-badge")) return;

    floatingBadge = document.createElement("div");
    floatingBadge.id = "contextlens-floating-badge";

    // Restore saved position if moved earlier in this session
    const savedPos = sessionStorage.getItem("contextlens_badge_pos");
    if (savedPos) {
      try {
        const { left, top } = JSON.parse(savedPos);
        floatingBadge.style.left = `${left}px`;
        floatingBadge.style.top = `${top}px`;
        floatingBadge.style.bottom = "auto";
        floatingBadge.style.right = "auto";
      } catch (_) {}
    }

    floatingBadge.innerHTML = `
      <div class="contextlens-badge-icon" title="ContextLens (Drag to move anywhere, click to open comparison window)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </div>
      <div class="contextlens-badge-content">
        <span class="contextlens-badge-title">ContextLens</span>
        <button type="button" class="contextlens-badge-btn btn-badge-claim" title="Capture selected text as Claim A">+ Claim</button>
        <button type="button" class="contextlens-badge-btn btn-badge-evidence" title="Capture selected text as Evidence B">+ Evidence</button>
        <button type="button" class="contextlens-badge-btn btn-badge-open" title="Open Draggable Comparison Window">Compare Window</button>
      </div>
    `;

    const badgeIcon = floatingBadge.querySelector(".contextlens-badge-icon");
    const badgeClaim = floatingBadge.querySelector(".btn-badge-claim");
    const badgeEvidence = floatingBadge.querySelector(".btn-badge-evidence");
    const badgeOpen = floatingBadge.querySelector(".btn-badge-open");

    // Click on icon directly opens the comparison window
    badgeIcon.addEventListener("click", (evt) => {
      evt.stopPropagation();
      toggleFloatingComparisonWindow();
    });

    badgeClaim.addEventListener("click", (evt) => {
      evt.stopPropagation();
      const sel = window.getSelection().toString().trim();
      if (!sel) {
        showToast("Please highlight text on the webpage first!");
        return;
      }
      const payload = {
        id: "item_" + Date.now(),
        text: sel,
        title: document.title || "Untitled Webpage",
        url: window.location.href,
        timestamp: new Date().toISOString()
      };
      saveCapture("current_claim", "CAPTURE_CLAIM", payload, "Claim saved as Source A");
    });

    badgeEvidence.addEventListener("click", (evt) => {
      evt.stopPropagation();
      const sel = window.getSelection().toString().trim();
      if (!sel) {
        showToast("Please highlight text on the webpage first!");
        return;
      }
      const payload = {
        id: "item_" + Date.now(),
        text: sel,
        title: document.title || "Untitled Webpage",
        url: window.location.href,
        timestamp: new Date().toISOString()
      };
      saveCapture("current_evidence", "CAPTURE_EVIDENCE", payload, "Evidence saved as Source B");
    });

    badgeOpen.addEventListener("click", (evt) => {
      evt.stopPropagation();
      toggleFloatingComparisonWindow(true);
    });

    // Make the floating badge draggable all around the webpage
    makeElementDraggable(floatingBadge, badgeIcon, null, (pos) => {
      sessionStorage.setItem("contextlens_badge_pos", JSON.stringify(pos));
    });

    document.body.appendChild(floatingBadge);
  }

  // ---------------------------------------------------------------------------
  // 3. In-Page Draggable Floating Comparison Window (Movable All Around Webpage)
  // ---------------------------------------------------------------------------
  function toggleFloatingComparisonWindow(forceOpen) {
    if (floatingWindow) {
      if (forceOpen === true) {
        floatingWindow.style.display = "flex";
        floatingWindow.classList.remove("is-minimized");
        return;
      }
      if (floatingWindow.style.display === "none") {
        floatingWindow.style.display = "flex";
      } else {
        floatingWindow.style.display = "none";
      }
      return;
    }

    // Create the floating comparison window
    floatingWindow = document.createElement("div");
    floatingWindow.id = "contextlens-floating-window";

    // Restore saved window position/size if available
    const savedWinPos = sessionStorage.getItem("contextlens_win_pos");
    if (savedWinPos) {
      try {
        const { left, top, width, height } = JSON.parse(savedWinPos);
        if (left) floatingWindow.style.left = `${left}px`;
        if (top) floatingWindow.style.top = `${top}px`;
        if (width) floatingWindow.style.width = `${width}px`;
        if (height) floatingWindow.style.height = `${height}px`;
        floatingWindow.style.right = "auto";
      } catch (_) {}
    }

    const sidepanelUrl = chrome.runtime.getURL("sidepanel.html");

    floatingWindow.innerHTML = `
      <div class="contextlens-window-header" title="Drag to hover and move comparison window anywhere">
        <div class="contextlens-window-title">
          <svg width="12" height="14" viewBox="0 0 10 16" fill="currentColor" style="opacity:0.6; margin-right:2px;">
            <circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/>
            <circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
            <circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/>
          </svg>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <span>ContextLens Comparative Analysis</span>
        </div>
        <div class="contextlens-window-controls">
          <button type="button" class="contextlens-win-btn btn-minimize" title="Minimize / Restore">_</button>
          <button type="button" class="contextlens-win-btn btn-close" title="Close Window">&times;</button>
        </div>
      </div>
      <div class="contextlens-window-body">
        <iframe class="contextlens-window-iframe" src="${sidepanelUrl}" allow="clipboard-read; clipboard-write"></iframe>
      </div>
    `;

    const winHeader = floatingWindow.querySelector(".contextlens-window-header");
    const minBtn = floatingWindow.querySelector(".btn-minimize");
    const closeBtn = floatingWindow.querySelector(".btn-close");

    minBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      floatingWindow.classList.toggle("is-minimized");
    });

    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      floatingWindow.style.display = "none";
    });

    // Make the entire comparison window draggable via its top header
    makeElementDraggable(floatingWindow, winHeader, (dragging) => {
      isWindowDragging = dragging;
    }, (pos) => {
      const rect = floatingWindow.getBoundingClientRect();
      sessionStorage.setItem("contextlens_win_pos", JSON.stringify({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      }));
    });

    document.body.appendChild(floatingWindow);
  }

  // ---------------------------------------------------------------------------
  // 4. Generic Drag & Hover Controller for Webpage Elements
  // ---------------------------------------------------------------------------
  function makeElementDraggable(element, dragHandle, onDragStateChange, onDragEnd) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    const targetHandle = dragHandle || element;

    targetHandle.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return; // Only left click
      if (e.target.closest("button") && !e.target.closest(".contextlens-drag-handle") && !e.target.closest(".contextlens-badge-icon")) {
        return;
      }

      isDragging = true;
      if (onDragStateChange) onDragStateChange(true);

      startX = e.clientX;
      startY = e.clientY;

      const rect = element.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      element.style.position = "fixed";
      element.style.left = `${initialLeft}px`;
      element.style.top = `${initialTop}px`;
      element.style.bottom = "auto";
      element.style.right = "auto";
      element.classList.add("is-dragging");

      document.addEventListener("mousemove", onMouseMove, { passive: false });
      document.addEventListener("mouseup", onMouseUp);
      e.preventDefault();
      e.stopPropagation();
    });

    function onMouseMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      // Clamp within viewport
      const pad = 8;
      const maxLeft = window.innerWidth - element.offsetWidth - pad;
      const maxTop = window.innerHeight - element.offsetHeight - pad;

      newLeft = Math.max(pad, Math.min(newLeft, maxLeft));
      newTop = Math.max(pad, Math.min(newTop, maxTop));

      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;
      e.preventDefault();
    }

    function onMouseUp(e) {
      if (!isDragging) return;
      isDragging = false;
      element.classList.remove("is-dragging");

      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);

      setTimeout(() => {
        if (onDragStateChange) onDragStateChange(false);
      }, 50);

      if (onDragEnd) {
        const rect = element.getBoundingClientRect();
        onDragEnd({ left: rect.left, top: rect.top });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 5. On-Page Toast Notification
  // ---------------------------------------------------------------------------
  function showToast(message) {
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "contextlens-toast-container";
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement("div");
    toast.className = "contextlens-toast";
    toast.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>${escapeHtml(message)}</span>`;
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
