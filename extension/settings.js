// ContextLens - Personalization & Settings Module
// Handles user preferences, chrome.storage.sync with fallback, and real-time DOM styling

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ContextLensSettings = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const STORAGE_KEY = "contextlens_user_preferences";

  const DEFAULT_PREFERENCES = {
    theme: "system", // "system" | "dark" | "light"
    accentColor: "purple", // "purple" | "blue" | "teal" | "green"
    density: "comfortable", // "comfortable" | "compact"
    fontSize: "medium", // "small" | "medium" | "large"
    lineSpacing: "normal", // "normal" | "relaxed"
    showSectionDescriptions: true, // boolean
    displayOrder: "badge-first", // "badge-first" | "summary-first"
    showSectionIcons: true, // boolean
    collapsedSections: {
      summary: false,
      differences: false,
      missing: false,
      questions: false,
      sources: false
    }
  };

  let currentPreferences = JSON.parse(JSON.stringify(DEFAULT_PREFERENCES));
  let lastFocusedElement = null;
  let toastTimeout = null;

  /**
   * Deep sanitize preferences to prevent corrupt states and exclude sensitive data
   */
  function sanitizePreferences(raw) {
    if (!raw || typeof raw !== "object") {
      return JSON.parse(JSON.stringify(DEFAULT_PREFERENCES));
    }
    const p = JSON.parse(JSON.stringify(DEFAULT_PREFERENCES));

    if (["system", "dark", "light"].includes(raw.theme)) {
      p.theme = raw.theme;
    }
    if (["purple", "blue", "teal", "green"].includes(raw.accentColor)) {
      p.accentColor = raw.accentColor;
    }
    if (["comfortable", "compact"].includes(raw.density)) {
      p.density = raw.density;
    }
    if (["small", "medium", "large"].includes(raw.fontSize)) {
      p.fontSize = raw.fontSize;
    }
    if (["normal", "relaxed"].includes(raw.lineSpacing)) {
      p.lineSpacing = raw.lineSpacing;
    }
    if (typeof raw.showSectionDescriptions === "boolean") {
      p.showSectionDescriptions = raw.showSectionDescriptions;
    }
    if (["badge-first", "summary-first"].includes(raw.displayOrder)) {
      p.displayOrder = raw.displayOrder;
    }
    if (typeof raw.showSectionIcons === "boolean") {
      p.showSectionIcons = raw.showSectionIcons;
    }
    if (raw.collapsedSections && typeof raw.collapsedSections === "object") {
      p.collapsedSections = {
        summary: Boolean(raw.collapsedSections.summary),
        differences: Boolean(raw.collapsedSections.differences),
        missing: Boolean(raw.collapsedSections.missing),
        questions: Boolean(raw.collapsedSections.questions),
        sources: Boolean(raw.collapsedSections.sources)
      };
    }

    // Safety check: ensure sensitive data is NEVER part of UI preferences
    delete p.apiKey;
    delete p.backendUrl;
    delete p.current_claim;
    delete p.current_evidence;
    delete p.history;

    return p;
  }

  /**
   * Retrieve preferences from chrome.storage.sync with graceful fallback to chrome.storage.local
   */
  function loadPreferences(callback) {
    if (typeof chrome !== "undefined" && chrome.storage) {
      if (chrome.storage.sync) {
        try {
          chrome.storage.sync.get([STORAGE_KEY], (res) => {
            if (chrome.runtime.lastError || !res || !res[STORAGE_KEY]) {
              fallbackToLocal(callback);
            } else {
              currentPreferences = sanitizePreferences(res[STORAGE_KEY]);
              applyPreferencesToDOM(currentPreferences);
              if (callback) callback(currentPreferences);
            }
          });
          return;
        } catch (syncErr) {
          console.warn("ContextLens: chrome.storage.sync read error, falling back to local:", syncErr);
          fallbackToLocal(callback);
          return;
        }
      } else {
        fallbackToLocal(callback);
        return;
      }
    }

    // Fallback for standalone/mock environments
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          currentPreferences = sanitizePreferences(JSON.parse(stored));
        }
      }
    } catch (e) {
      console.warn("ContextLens: localStorage read error:", e);
    }
    applyPreferencesToDOM(currentPreferences);
    if (callback) callback(currentPreferences);
  }

  function fallbackToLocal(callback) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      try {
        chrome.storage.local.get([STORAGE_KEY], (localRes) => {
          if (!chrome.runtime.lastError && localRes && localRes[STORAGE_KEY]) {
            currentPreferences = sanitizePreferences(localRes[STORAGE_KEY]);
          } else {
            currentPreferences = JSON.parse(JSON.stringify(DEFAULT_PREFERENCES));
          }
          applyPreferencesToDOM(currentPreferences);
          if (callback) callback(currentPreferences);
        });
        return;
      } catch (localErr) {
        console.warn("ContextLens: chrome.storage.local read error:", localErr);
      }
    }
    currentPreferences = JSON.parse(JSON.stringify(DEFAULT_PREFERENCES));
    applyPreferencesToDOM(currentPreferences);
    if (callback) callback(currentPreferences);
  }

  /**
   * Save preferences to chrome.storage.sync with graceful fallback to local storage
   */
  function savePreferences(newPrefs, callback) {
    const sanitized = sanitizePreferences(newPrefs);
    currentPreferences = sanitized;
    applyPreferencesToDOM(currentPreferences);

    let saved = false;

    if (typeof chrome !== "undefined" && chrome.storage) {
      if (chrome.storage.sync) {
        try {
          chrome.storage.sync.set({ [STORAGE_KEY]: sanitized }, () => {
            if (chrome.runtime.lastError) {
              console.warn("ContextLens: sync save error, fallback to local:", chrome.runtime.lastError);
              saveToLocal(sanitized, callback);
            } else {
              saved = true;
              try {
                // Keep local storage mirror updated
                chrome.storage.local.set({ [STORAGE_KEY]: sanitized });
              } catch (_) {}
              if (callback) callback(true, sanitized);
            }
          });
          return;
        } catch (syncErr) {
          console.warn("ContextLens: sync save exception, fallback to local:", syncErr);
          saveToLocal(sanitized, callback);
          return;
        }
      } else {
        saveToLocal(sanitized, callback);
        return;
      }
    }

    // Standalone fallback
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
        saved = true;
      }
    } catch (e) {
      console.warn("ContextLens: localStorage write error:", e);
    }
    if (callback) callback(saved, sanitized);
  }

  function saveToLocal(sanitized, callback) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      try {
        chrome.storage.local.set({ [STORAGE_KEY]: sanitized }, () => {
          const success = !chrome.runtime.lastError;
          if (callback) callback(success, sanitized);
        });
        return;
      } catch (localErr) {
        console.warn("ContextLens: local storage write error:", localErr);
      }
    }
    if (callback) callback(false, sanitized);
  }

  /**
   * Apply all active preferences to DOM root attributes
   */
  function applyPreferencesToDOM(prefs) {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    // 1. Theme
    root.setAttribute("data-theme", prefs.theme);
    const isSystemDark =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolvedTheme = prefs.theme === "system" ? (isSystemDark ? "dark" : "light") : prefs.theme;
    root.setAttribute("data-resolved-theme", resolvedTheme);

    // 2. Accent Color
    root.setAttribute("data-accent", prefs.accentColor);

    // 3. Density
    root.setAttribute("data-density", prefs.density);

    // 4. Font Size
    root.setAttribute("data-font-size", prefs.fontSize);

    // 5. Line Spacing
    root.setAttribute("data-line-spacing", prefs.lineSpacing);

    // 6. Section Descriptions
    root.setAttribute("data-show-descriptions", prefs.showSectionDescriptions ? "true" : "false");

    // 7. Display Order
    root.setAttribute("data-display-order", prefs.displayOrder);

    // 8. Section Icons
    root.setAttribute("data-show-icons", prefs.showSectionIcons ? "true" : "false");

    // 9. Collapsed Sections in Results
    if (prefs.collapsedSections) {
      Object.keys(prefs.collapsedSections).forEach((sectionKey) => {
        const card = document.getElementById(`result-card-${sectionKey}`);
        const isCollapsed = Boolean(prefs.collapsedSections[sectionKey]);
        if (card) {
          card.classList.toggle("is-collapsed", isCollapsed);
          const btn = card.querySelector(".btn-collapse-section");
          if (btn) {
            btn.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
          }
        }
      });
    }
  }

  /**
   * Reset all preferences to default values
   */
  function resetPreferences(callback) {
    const defaults = JSON.parse(JSON.stringify(DEFAULT_PREFERENCES));
    savePreferences(defaults, (success, savedPrefs) => {
      syncSettingsUI(savedPrefs);
      showToast("Settings reset to defaults ✓");
      if (callback) callback(success, savedPrefs);
    });
  }

  /**
   * Display non-intrusive confirmation toast
   */
  function showToast(message) {
    let toast = document.getElementById("contextlens-settings-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "contextlens-settings-toast";
      toast.className = "settings-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("show");

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove("show");
    }, 2400);
  }

  /**
   * Synchronize the settings modal inputs/controls with current preferences
   */
  function syncSettingsUI(prefs) {
    if (typeof document === "undefined") return;

    // Theme buttons
    document.querySelectorAll("[data-setting='theme']").forEach((btn) => {
      const active = btn.dataset.value === prefs.theme;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-checked", active ? "true" : "false");
    });

    // Accent buttons
    document.querySelectorAll("[data-setting='accent']").forEach((btn) => {
      const active = btn.dataset.value === prefs.accentColor;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-checked", active ? "true" : "false");
    });

    // Density buttons
    document.querySelectorAll("[data-setting='density']").forEach((btn) => {
      const active = btn.dataset.value === prefs.density;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-checked", active ? "true" : "false");
    });

    // Font size buttons
    document.querySelectorAll("[data-setting='font-size']").forEach((btn) => {
      const active = btn.dataset.value === prefs.fontSize;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-checked", active ? "true" : "false");
    });

    // Line spacing buttons
    document.querySelectorAll("[data-setting='line-spacing']").forEach((btn) => {
      const active = btn.dataset.value === prefs.lineSpacing;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-checked", active ? "true" : "false");
    });

    // Display order buttons
    document.querySelectorAll("[data-setting='display-order']").forEach((btn) => {
      const active = btn.dataset.value === prefs.displayOrder;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-checked", active ? "true" : "false");
    });

    // Toggles
    const descToggle = document.getElementById("setting-show-descriptions");
    if (descToggle) {
      descToggle.checked = Boolean(prefs.showSectionDescriptions);
    }

    const iconsToggle = document.getElementById("setting-show-icons");
    if (iconsToggle) {
      iconsToggle.checked = Boolean(prefs.showSectionIcons);
    }

    // Section collapse checkboxes in modal
    if (prefs.collapsedSections) {
      Object.keys(prefs.collapsedSections).forEach((key) => {
        const chk = document.getElementById(`setting-collapse-${key}`);
        if (chk) {
          chk.checked = !prefs.collapsedSections[key]; // checked means visible/expanded
        }
      });
    }
  }

  /**
   * Open the dedicated Settings Modal
   */
  function openSettingsModal() {
    const modal = document.getElementById("settings-modal");
    if (!modal) return;

    lastFocusedElement = document.activeElement;
    syncSettingsUI(currentPreferences);

    // Hide any inline reset confirmation that was left open
    const resetConfirm = document.getElementById("reset-confirm-box");
    if (resetConfirm) resetConfirm.classList.add("hidden");

    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");

    // Focus close button or first interactive element
    const closeBtn = document.getElementById("btn-close-settings-modal");
    if (closeBtn) closeBtn.focus();
  }

  /**
   * Close the Settings Modal
   */
  function closeSettingsModal() {
    const modal = document.getElementById("settings-modal");
    if (!modal) return;

    modal.classList.add("hidden");
    document.body.classList.remove("modal-open");

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  /**
   * Bind event listeners for settings modal and result section headers
   */
  function initSettingsUI() {
    // Open Settings Button in header
    const btnOpenSettings = document.getElementById("btn-open-settings");
    if (btnOpenSettings) {
      btnOpenSettings.addEventListener("click", openSettingsModal);
    }

    // Also support button inside existing Settings tab
    const btnOpenPersonalization = document.getElementById("btn-open-personalization");
    if (btnOpenPersonalization) {
      btnOpenPersonalization.addEventListener("click", openSettingsModal);
    }

    // Close Settings Buttons (header X and Done button)
    const btnCloseModal = document.getElementById("btn-close-settings-modal");
    if (btnCloseModal) {
      btnCloseModal.addEventListener("click", closeSettingsModal);
    }
    const btnDoneModal = document.getElementById("btn-done-settings-modal");
    if (btnDoneModal) {
      btnDoneModal.addEventListener("click", () => {
        closeSettingsModal();
        showToast("Preferences applied ✓");
      });
    }

    // Modal backdrop click
    const modalBackdrop = document.getElementById("settings-modal-backdrop");
    if (modalBackdrop) {
      modalBackdrop.addEventListener("click", closeSettingsModal);
    }

    // Keyboard support: Escape key closes modal & focus trap
    document.addEventListener("keydown", (e) => {
      const modal = document.getElementById("settings-modal");
      if (modal && !modal.classList.contains("hidden")) {
        if (e.key === "Escape") {
          e.preventDefault();
          closeSettingsModal();
        } else if (e.key === "Tab") {
          trapFocus(modal, e);
        }
      }
    });

    // Theme options
    document.querySelectorAll("[data-setting='theme']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = btn.dataset.value;
        currentPreferences.theme = val;
        savePreferences(currentPreferences, () => {
          syncSettingsUI(currentPreferences);
          showToast(`Theme updated to ${val.charAt(0).toUpperCase() + val.slice(1)} ✓`);
        });
      });
    });

    // Accent options
    document.querySelectorAll("[data-setting='accent']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = btn.dataset.value;
        currentPreferences.accentColor = val;
        savePreferences(currentPreferences, () => {
          syncSettingsUI(currentPreferences);
          showToast(`Accent color updated to ${val.charAt(0).toUpperCase() + val.slice(1)} ✓`);
        });
      });
    });

    // Density options
    document.querySelectorAll("[data-setting='density']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = btn.dataset.value;
        currentPreferences.density = val;
        savePreferences(currentPreferences, () => {
          syncSettingsUI(currentPreferences);
          showToast(`Density set to ${val} ✓`);
        });
      });
    });

    // Font size options
    document.querySelectorAll("[data-setting='font-size']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = btn.dataset.value;
        currentPreferences.fontSize = val;
        savePreferences(currentPreferences, () => {
          syncSettingsUI(currentPreferences);
          showToast(`Font size set to ${val} ✓`);
        });
      });
    });

    // Line spacing options
    document.querySelectorAll("[data-setting='line-spacing']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = btn.dataset.value;
        currentPreferences.lineSpacing = val;
        savePreferences(currentPreferences, () => {
          syncSettingsUI(currentPreferences);
          showToast(`Line spacing set to ${val} ✓`);
        });
      });
    });

    // Display order options
    document.querySelectorAll("[data-setting='display-order']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = btn.dataset.value;
        currentPreferences.displayOrder = val;
        savePreferences(currentPreferences, () => {
          syncSettingsUI(currentPreferences);
          showToast("Comparison display order updated ✓");
        });
      });
    });

    // Explanatory descriptions toggle
    const descToggle = document.getElementById("setting-show-descriptions");
    if (descToggle) {
      descToggle.addEventListener("change", (e) => {
        currentPreferences.showSectionDescriptions = e.target.checked;
        savePreferences(currentPreferences, () => {
          syncSettingsUI(currentPreferences);
          showToast(e.target.checked ? "Descriptions visible ✓" : "Descriptions hidden ✓");
        });
      });
    }

    // Section icons toggle
    const iconsToggle = document.getElementById("setting-show-icons");
    if (iconsToggle) {
      iconsToggle.addEventListener("change", (e) => {
        currentPreferences.showSectionIcons = e.target.checked;
        savePreferences(currentPreferences, () => {
          syncSettingsUI(currentPreferences);
          showToast(e.target.checked ? "Section icons visible ✓" : "Section icons hidden ✓");
        });
      });
    }

    // Section collapse checkboxes in modal
    const sectionKeys = ["summary", "differences", "missing", "questions", "sources"];
    sectionKeys.forEach((key) => {
      const chk = document.getElementById(`setting-collapse-${key}`);
      if (chk) {
        chk.addEventListener("change", (e) => {
          currentPreferences.collapsedSections[key] = !e.target.checked; // unchecked = collapsed
          savePreferences(currentPreferences, () => {
            syncSettingsUI(currentPreferences);
          });
        });
      }
    });

    // Expand all / Collapse all quick buttons
    const btnExpandAll = document.getElementById("btn-expand-all-sections");
    if (btnExpandAll) {
      btnExpandAll.addEventListener("click", () => {
        sectionKeys.forEach((k) => (currentPreferences.collapsedSections[k] = false));
        savePreferences(currentPreferences, () => {
          syncSettingsUI(currentPreferences);
          showToast("All sections expanded ✓");
        });
      });
    }

    const btnCollapseAll = document.getElementById("btn-collapse-all-sections");
    if (btnCollapseAll) {
      btnCollapseAll.addEventListener("click", () => {
        sectionKeys.forEach((k) => (currentPreferences.collapsedSections[k] = true));
        savePreferences(currentPreferences, () => {
          syncSettingsUI(currentPreferences);
          showToast("All sections collapsed ✓");
        });
      });
    }

    // Reset to defaults confirmation flow
    const btnTriggerReset = document.getElementById("btn-trigger-reset");
    const resetConfirmBox = document.getElementById("reset-confirm-box");
    const btnCancelReset = document.getElementById("btn-cancel-reset");
    const btnConfirmReset = document.getElementById("btn-confirm-reset");

    if (btnTriggerReset && resetConfirmBox) {
      btnTriggerReset.addEventListener("click", () => {
        resetConfirmBox.classList.remove("hidden");
        if (btnCancelReset) btnCancelReset.focus();
      });
    }

    if (btnCancelReset && resetConfirmBox) {
      btnCancelReset.addEventListener("click", () => {
        resetConfirmBox.classList.add("hidden");
        if (btnTriggerReset) btnTriggerReset.focus();
      });
    }

    if (btnConfirmReset && resetConfirmBox) {
      btnConfirmReset.addEventListener("click", () => {
        resetConfirmBox.classList.add("hidden");
        resetPreferences();
      });
    }

    // Collapsible Result Section click & keydown handlers
    setupCollapsibleResultSections();

    // System theme listener
    initSystemThemeWatcher();

    // Chrome storage sync listener across tabs/windows
    initStorageListener((updatedPrefs) => {
      syncSettingsUI(updatedPrefs);
    });
  }

  /**
   * Make each result card collapsible directly by clicking header or pressing Enter/Space
   */
  function setupCollapsibleResultSections() {
    const collapsibleHeaders = document.querySelectorAll(".collapsible-header");
    collapsibleHeaders.forEach((header) => {
      const card = header.closest(".result-card");
      if (!card) return;

      const sectionKey = card.dataset.section;
      if (!sectionKey) return;

      const toggleAction = () => {
        const isCollapsed = card.classList.contains("is-collapsed");
        const nextCollapsed = !isCollapsed;
        card.classList.toggle("is-collapsed", nextCollapsed);

        const btn = card.querySelector(".btn-collapse-section");
        if (btn) {
          btn.setAttribute("aria-expanded", nextCollapsed ? "false" : "true");
        }

        if (!currentPreferences.collapsedSections) {
          currentPreferences.collapsedSections = {};
        }
        currentPreferences.collapsedSections[sectionKey] = nextCollapsed;

        // Persist silently without disrupting current view
        savePreferences(currentPreferences);
        syncSettingsUI(currentPreferences);
      };

      header.addEventListener("click", (e) => {
        // Do not toggle if clicking an interactive link inside header
        if (e.target.tagName === "A") return;
        toggleAction();
      });

      header.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleAction();
        }
      });
    });
  }

  /**
   * Listen for system theme changes and apply when theme === "system"
   */
  function initSystemThemeWatcher() {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e) => {
        if (currentPreferences.theme === "system") {
          document.documentElement.setAttribute("data-resolved-theme", e.matches ? "dark" : "light");
        }
      };
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", handler);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handler);
      }
    }
  }

  /**
   * Listen for real-time storage changes (cross-profile sync or popup-to-panel sync)
   */
  function initStorageListener(callback) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if ((area === "sync" || area === "local") && changes[STORAGE_KEY]) {
          const newPrefs = changes[STORAGE_KEY].newValue;
          if (newPrefs) {
            currentPreferences = sanitizePreferences(newPrefs);
            applyPreferencesToDOM(currentPreferences);
            if (callback) callback(currentPreferences);
          }
        }
      });
    }
  }

  /**
   * Accessible focus trap for modal dialogs
   */
  function trapFocus(container, event) {
    const focusable = container.querySelectorAll(
      'button:not([disabled]):not(.hidden), [href], input:not([disabled]):not(.hidden), select:not([disabled]):not(.hidden), textarea:not([disabled]):not(.hidden), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  // Public API
  return {
    DEFAULT_PREFERENCES,
    loadPreferences,
    savePreferences,
    resetPreferences,
    applyPreferencesToDOM,
    getPreferences: () => JSON.parse(JSON.stringify(currentPreferences)),
    openSettingsModal,
    closeSettingsModal,
    showToast,
    initSettingsUI,
    initStorageListener,
    setupCollapsibleResultSections
  };
});
