// ContextLens - Side Panel & Popup Application Logic

document.addEventListener("DOMContentLoaded", () => {
  // Application State
  let state = {
    claimA: { text: "", title: "", url: "", timestamp: null },
    claimB: { text: "", title: "", url: "", timestamp: null },
    lastResult: null,
    history: [],
    historyFilter: "all",
    selectedProvider: "groq",
    settings: {
      backendUrl: "http://localhost:8000",
      apiKey: "",
      defaultProvider: "groq"
    },
    appearanceState: {
      activeThemeId: "dark",
      customThemes: [],
      typography: { fontFamily: "system", fontSize: 13, lineHeight: 1.5, fontWeight: "normal" },
      density: "comfortable",
      radiusPreset: "rounded",
      reducedMotion: false,
      borderStrength: "subtle"
    }
  };

  // DOM Elements - Navigation
  const navTabs = document.querySelectorAll(".nav-tab");
  const tabContents = document.querySelectorAll(".tab-content");
  const historyBadge = document.getElementById("history-badge");
  const btnOpenTab = document.getElementById("btn-open-tab");

  // DOM Elements - Compare Workspace
  const textA = document.getElementById("text-a");
  const textB = document.getElementById("text-b");
  const metaA = document.getElementById("meta-a");
  const metaB = document.getElementById("meta-b");
  const titleA = document.getElementById("title-a");
  const titleB = document.getElementById("title-b");
  const linkA = document.getElementById("link-a");
  const linkB = document.getElementById("link-b");
  const btnCaptureA = document.getElementById("btn-capture-a");
  const btnCaptureB = document.getElementById("btn-capture-b");
  const btnClearA = document.getElementById("btn-clear-a");
  const btnClearB = document.getElementById("btn-clear-b");
  const btnSwap = document.getElementById("btn-swap");
  const btnCompare = document.getElementById("btn-compare");
  const compareSpinner = document.getElementById("compare-spinner");
  const compareBtnText = document.getElementById("compare-btn-text");
  const btnResetAll = document.getElementById("btn-reset-all");
  const compareError = document.getElementById("compare-error");
  const errorMsg = document.getElementById("error-msg");
  const btnErrorRetry = document.getElementById("btn-error-retry");
  const quickHint = document.getElementById("quick-hint");
  const btnDismissHint = document.getElementById("btn-dismiss-hint");

  // DOM Elements - Results
  const resultsSection = document.getElementById("results-section");
  const classificationBadge = document.getElementById("classification-badge");
  const badgeIcon = document.getElementById("badge-icon");
  const badgeLabel = document.getElementById("badge-label");
  const badgeSub = document.getElementById("badge-sub");
  const engineBadge = document.getElementById("engine-badge");
  const resultExplanation = document.getElementById("result-explanation");
  const resultDifferences = document.getElementById("result-differences");
  const resultMissing = document.getElementById("result-missing");
  const resultQuestions = document.getElementById("result-questions");
  const resultSourceA = document.getElementById("result-source-a");
  const resultSourceB = document.getElementById("result-source-b");
  const resultDomainA = document.getElementById("result-domain-a");
  const resultDomainB = document.getElementById("result-domain-b");
  // New v2 elements
  const confidenceCard = document.getElementById("confidence-card");
  const confidenceFill = document.getElementById("confidence-fill");
  const confidencePct = document.getElementById("confidence-pct");
  const confidenceReason = document.getElementById("confidence-reason");
  const supportingCard = document.getElementById("supporting-card");
  const resultSupporting = document.getElementById("result-supporting");
  const contradictingCard = document.getElementById("contradicting-card");
  const resultContradicting = document.getElementById("result-contradicting");
  const additionalSourcesCard = document.getElementById("additional-sources-card");
  const additionalSourcesList = document.getElementById("additional-sources-list");
  const limitationsCard = document.getElementById("limitations-card");
  const resultLimitations = document.getElementById("result-limitations");
  const btnCopyReport = document.getElementById("btn-copy-report");
  const btnDownloadMd = document.getElementById("btn-download-md");
  const btnDownloadJson = document.getElementById("btn-download-json");
  const btnSaveHistory = document.getElementById("btn-save-history");
  const btnNewComparison = document.getElementById("btn-new-comparison");

  // DOM Elements - Evidence First Cards
  const resTitleA = document.getElementById("res-title-a");
  const resQuoteA = document.getElementById("res-quote-a");
  const resOpenA = document.getElementById("res-open-a");
  const resTitleB = document.getElementById("res-title-b");
  const resQuoteB = document.getElementById("res-quote-b");
  const resOpenB = document.getElementById("res-open-b");

  // DOM Elements - Quick Chips
  const exampleChipBtns = document.querySelectorAll(".chip-btn");

  // DOM Elements - History
  const historyList = document.getElementById("history-list");
  const historyEmpty = document.getElementById("history-empty");
  const historySearch = document.getElementById("history-search");
  const btnClearHistory = document.getElementById("btn-clear-history");
  const btnExportAllHistory = document.getElementById("btn-export-all-history");
  const historyFilterPills = document.querySelectorAll(".history-pill");

  // DOM Elements - Settings & Provider Selection
  const providerToggleBtns = document.querySelectorAll(".provider-toggle-btn");
  const settingDefaultProvider = document.getElementById("setting-default-provider");
  const settingBackendUrl = document.getElementById("setting-backend-url");
  const settingApiKey = document.getElementById("setting-api-key");
  const btnTestBackend = document.getElementById("btn-test-backend");
  const backendStatusMsg = document.getElementById("backend-status-msg");
  const btnSaveSettings = document.getElementById("btn-save-settings");

  // DOM Elements - Appearance & Themes
  const quickThemeChips = document.getElementById("quick-theme-chips");
  const quickPresetChips = document.getElementById("quick-preset-chips");
  const quickDensityControl = document.getElementById("quick-density-control");
  const quickRadiusControl = document.getElementById("quick-radius-control");
  const quickReducedMotion = document.getElementById("quick-reduced-motion");
  const quickStrongBorders = document.getElementById("quick-strong-borders");
  const btnOpenAppearanceStudio = document.getElementById("btn-open-appearance-studio");
  const btnOpenStudioBottom = document.getElementById("btn-open-studio-bottom");
  const btnGotoAppearance = document.getElementById("btn-goto-appearance");

  // ----------------------------------------------------------------
  // INITIALIZATION
  // ----------------------------------------------------------------
  loadStoredData();
  setupEventListeners();
  checkBackendHealth();

  // ----------------------------------------------------------------
  // STORAGE & STATE
  // ----------------------------------------------------------------
  function loadStoredData() {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(
        ["current_claim", "current_evidence", "history", "settings", "dismiss_hint", "selected_provider"],
        (res) => {
          if (res.current_claim) {
            state.claimA = res.current_claim;
            updateCardA();
          }
          if (res.current_evidence) {
            state.claimB = res.current_evidence;
            updateCardB();
          }
          if (Array.isArray(res.history)) {
            state.history = res.history;
            renderHistory();
          }
          if (res.selected_provider) {
            state.selectedProvider = res.selected_provider;
            updateProviderUI(state.selectedProvider);
          }
          if (res.settings) {
            state.settings = { ...state.settings, ...res.settings };
            settingBackendUrl.value = state.settings.backendUrl || "http://localhost:8000";
            settingApiKey.value = state.settings.apiKey || "";
            if (settingDefaultProvider) {
              settingDefaultProvider.value = state.settings.defaultProvider || state.selectedProvider || "groq";
            }
          }
          if (res.dismiss_hint && quickHint) {
            quickHint.classList.add("hidden");
          }
        }
      );

      // Initialize themes and appearance
      if (window.ContextLensThemes) {
        window.ContextLensThemes.loadAppearance((app) => {
          state.appearanceState = app || { ...window.ContextLensThemes.APPEARANCE_DEFAULTS };
          window.ContextLensThemes.applyFullAppearance(state.appearanceState);
          renderQuickAppearanceControls();
        });
      }

      // Listen for real-time changes from background script or appearance studio
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local") {
          if (changes.current_claim) {
            state.claimA = changes.current_claim.newValue || { text: "", title: "", url: "" };
            updateCardA();
          }
          if (changes.current_evidence) {
            state.claimB = changes.current_evidence.newValue || { text: "", title: "", url: "" };
            updateCardB();
          }
          if (changes.history) {
            state.history = changes.history.newValue || [];
            renderHistory();
          }
        }
        if ((area === "local" || area === "sync") && changes.appearance && changes.appearance.newValue && window.ContextLensThemes) {
          window.ContextLensThemes.loadAppearance((app) => {
            state.appearanceState = app;
            window.ContextLensThemes.applyFullAppearance(state.appearanceState);
            renderQuickAppearanceControls();
          });
        }
      });
    } else if (window.ContextLensThemes) {
      window.ContextLensThemes.loadAppearance((app) => {
        state.appearanceState = app;
        window.ContextLensThemes.applyFullAppearance(state.appearanceState);
        renderQuickAppearanceControls();
      });
    }
  }

  function saveCurrentInputs() {
    state.claimA.text = textA.value;
    state.claimB.text = textB.value;
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        current_claim: state.claimA,
        current_evidence: state.claimB
      });
    }
  }

  function updateCardA() {
    textA.value = state.claimA.text || "";
    if (state.claimA.title || state.claimA.url) {
      metaA.classList.remove("hidden");
      titleA.textContent = state.claimA.title || "Untitled Webpage";
      linkA.textContent = formatUrlDomain(state.claimA.url);
      linkA.href = state.claimA.url || "#";
    } else {
      metaA.classList.add("hidden");
    }
  }

  function updateCardB() {
    textB.value = state.claimB.text || "";
    if (state.claimB.title || state.claimB.url) {
      metaB.classList.remove("hidden");
      titleB.textContent = state.claimB.title || "Untitled Webpage";
      linkB.textContent = formatUrlDomain(state.claimB.url);
      linkB.href = state.claimB.url || "#";
    } else {
      metaB.classList.add("hidden");
    }
  }

  // ----------------------------------------------------------------
  // EVENT LISTENERS
  // ----------------------------------------------------------------
  function setupEventListeners() {
    // Nav Tabs
    navTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.tab;
        switchTab(target);
      });
    });

    // Open in full browser tab
    btnOpenTab.addEventListener("click", () => {
      if (typeof chrome !== "undefined" && chrome.tabs) {
        chrome.tabs.create({ url: chrome.runtime.getURL("sidepanel.html") });
      }
    });

    // Appearance Controls Event Listeners
    const openAppearanceStudio = () => {
      if (typeof chrome !== "undefined" && chrome.tabs) {
        chrome.tabs.create({ url: chrome.runtime.getURL("appearance.html") });
      } else {
        window.open("appearance.html", "_blank");
      }
    };

    if (btnOpenAppearanceStudio) btnOpenAppearanceStudio.addEventListener("click", openAppearanceStudio);
    if (btnOpenStudioBottom) btnOpenStudioBottom.addEventListener("click", openAppearanceStudio);
    if (btnGotoAppearance) {
      btnGotoAppearance.addEventListener("click", () => switchTab("appearance"));
    }

    if (quickDensityControl) {
      quickDensityControl.querySelectorAll(".seg-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const density = btn.dataset.density;
          state.appearanceState.density = density;
          if (window.ContextLensThemes) {
            window.ContextLensThemes.applyDensity(density);
            window.ContextLensThemes.saveAppearance(state.appearanceState);
          }
          quickDensityControl.querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("active", b === btn));
        });
      });
    }

    if (quickRadiusControl) {
      quickRadiusControl.querySelectorAll(".seg-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const radius = btn.dataset.radius;
          state.appearanceState.radiusPreset = radius;
          if (window.ContextLensThemes) {
            window.ContextLensThemes.applyRadius(radius);
            window.ContextLensThemes.saveAppearance(state.appearanceState);
          }
          quickRadiusControl.querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("active", b === btn));
        });
      });
    }

    if (quickReducedMotion) {
      quickReducedMotion.addEventListener("change", (e) => {
        state.appearanceState.reducedMotion = e.target.checked;
        if (window.ContextLensThemes) {
          window.ContextLensThemes.applyReducedMotion(e.target.checked);
          window.ContextLensThemes.saveAppearance(state.appearanceState);
        }
      });
    }

    if (quickStrongBorders) {
      quickStrongBorders.addEventListener("change", (e) => {
        state.appearanceState.borderStrength = e.target.checked ? "strong" : "subtle";
        if (window.ContextLensThemes) {
          window.ContextLensThemes.applyBorderStrength(state.appearanceState.borderStrength);
          window.ContextLensThemes.saveAppearance(state.appearanceState);
        }
      });
    }

    // Dismiss Onboarding Hint
    if (btnDismissHint) {
      btnDismissHint.addEventListener("click", () => {
        quickHint.classList.add("hidden");
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ dismiss_hint: true });
        }
      });
    }

    // Capture Buttons
    btnCaptureA.addEventListener("click", () => captureActiveTabSelection("A"));
    btnCaptureB.addEventListener("click", () => captureActiveTabSelection("B"));

    // Clear Buttons
    btnClearA.addEventListener("click", () => {
      state.claimA = { text: "", title: "", url: "", timestamp: null };
      updateCardA();
      saveCurrentInputs();
    });

    btnClearB.addEventListener("click", () => {
      state.claimB = { text: "", title: "", url: "", timestamp: null };
      updateCardB();
      saveCurrentInputs();
    });

    // Swap A and B
    btnSwap.addEventListener("click", () => {
      saveCurrentInputs();
      const temp = { ...state.claimA };
      state.claimA = { ...state.claimB };
      state.claimB = temp;
      updateCardA();
      updateCardB();
      saveCurrentInputs();
    });

    // Reset All
    btnResetAll.addEventListener("click", () => {
      state.claimA = { text: "", title: "", url: "", timestamp: null };
      state.claimB = { text: "", title: "", url: "", timestamp: null };
      updateCardA();
      updateCardB();
      saveCurrentInputs();
      resultsSection.classList.add("hidden");
      compareError.classList.add("hidden");
    });

    // Input listeners to persist typed text
    textA.addEventListener("input", () => {
      state.claimA.text = textA.value;
      if (!state.claimA.title && textA.value) {
        state.claimA.title = "Manual Input";
        state.claimA.url = "";
        state.claimA.timestamp = new Date().toISOString();
      }
    });

    textB.addEventListener("input", () => {
      state.claimB.text = textB.value;
      if (!state.claimB.title && textB.value) {
        state.claimB.title = "Manual Input";
        state.claimB.url = "";
        state.claimB.timestamp = new Date().toISOString();
      }
    });

    // Compare Execution
    btnCompare.addEventListener("click", handleCompare);
    btnErrorRetry.addEventListener("click", handleCompare);

    // Copy & Download Reports
    if (btnCopyReport) btnCopyReport.addEventListener("click", copyMarkdownSummary);
    if (btnDownloadMd) btnDownloadMd.addEventListener("click", downloadMarkdownReport);
    if (btnDownloadJson) btnDownloadJson.addEventListener("click", downloadJsonAnalysis);

    // Save History Indicator
    if (btnSaveHistory) {
      btnSaveHistory.addEventListener("click", () => {
        btnSaveHistory.textContent = "Saved";
        setTimeout(() => (btnSaveHistory.textContent = "Save"), 2000);
      });
    }

    // Start New Comparison
    if (btnNewComparison) {
      btnNewComparison.addEventListener("click", () => {
        resultsSection.classList.add("hidden");
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    // Quick Chips Handlers
    exampleChipBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const chipType = btn.dataset.chip;
        loadQuickChipScenario(chipType);
      });
    });

    // Demos Tab Click Handlers
    document.querySelectorAll(".btn-load-demo").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const scenario = e.currentTarget.dataset.scenario;
        loadDemoScenario(scenario);
      });
    });

    // History Search & Clear & Export
    if (historySearch) {
      historySearch.addEventListener("input", (e) => {
        renderHistory(e.target.value);
      });
    }

    if (btnExportAllHistory) {
      btnExportAllHistory.addEventListener("click", exportAllHistory);
    }

    // History Classification Filter Pills
    historyFilterPills.forEach((pill) => {
      pill.addEventListener("click", () => {
        historyFilterPills.forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        state.historyFilter = pill.dataset.filter || "all";
        renderHistory(historySearch ? historySearch.value : "");
      });
    });

    btnClearHistory.addEventListener("click", () => {
      if (confirm("Are you sure you want to clear all research history?")) {
        state.history = [];
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ history: [] });
        }
        renderHistory();
      }
    });

    // Provider Switcher Buttons
    document.querySelectorAll(".provider-toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const prov = btn.dataset.provider;
        const changed = state.selectedProvider !== prov;
        state.selectedProvider = prov;
        updateProviderUI(prov);
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ selected_provider: prov });
        }
        // If results section is currently displayed and model was changed, immediately re-run comparison
        if (changed && !resultsSection.classList.contains("hidden") && textA.value.trim().length >= 5 && textB.value.trim().length >= 5) {
          handleCompare();
        }
      });
    });

    if (settingDefaultProvider) {
      settingDefaultProvider.addEventListener("change", (e) => {
        const prov = e.target.value;
        state.selectedProvider = prov;
        updateProviderUI(prov);
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ selected_provider: prov });
        }
      });
    }

    // Settings actions
    btnTestBackend.addEventListener("click", checkBackendHealth);
    btnSaveSettings.addEventListener("click", () => {
      state.settings.backendUrl = settingBackendUrl.value.trim().replace(/\/+$/, "");
      state.settings.apiKey = settingApiKey.value.trim();
      if (settingDefaultProvider) {
        state.settings.defaultProvider = settingDefaultProvider.value;
        state.selectedProvider = settingDefaultProvider.value;
        updateProviderUI(state.selectedProvider);
      }
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          settings: state.settings,
          selected_provider: state.selectedProvider
        });
      }
      alert("Settings saved successfully!");
      checkBackendHealth();
    });
  }

  function updateProviderUI(activeProvider) {
    document.querySelectorAll(".provider-toggle-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.provider === activeProvider);
    });
    if (settingDefaultProvider) {
      settingDefaultProvider.value = activeProvider;
    }
  }

  function switchTab(tabName) {
    navTabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === tabName));
    tabContents.forEach((c) => c.classList.toggle("active", c.id === `tab-${tabName}`));
  }

  // ----------------------------------------------------------------
  // ACTIVE TAB TEXT CAPTURE
  // ----------------------------------------------------------------
  async function captureActiveTabSelection(target) {
    if (typeof chrome === "undefined" || !chrome.tabs) {
      alert("Active tab capture requires running inside Chrome extension.");
      return;
    }

    try {
      let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tab) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        tab = tabs[0];
      }
      if (!tab || !tab.id) {
        alert("No active browser tab found.");
        return;
      }

      // Try sending message to content script first
      chrome.tabs.sendMessage(tab.id, { type: "GET_SELECTION" }, (response) => {
        if (chrome.runtime.lastError || !response || !response.text) {
          // Fallback: execute lightweight scripting directly
          fallbackExecuteScript(tab, target);
        } else {
          applyCapturedData(target, response.text, response.title, response.url);
        }
      });
    } catch (err) {
      console.warn("Capture error:", err);
    }
  }

  function fallbackExecuteScript(tab, target) {
    if (!chrome.scripting) {
      alert("Please select text on the webpage first, or paste it directly.");
      return;
    }

    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        func: () => {
          return {
            text: window.getSelection().toString().trim(),
            title: document.title || "Webpage",
            url: window.location.href
          };
        }
      },
      (results) => {
        if (results && results[0] && results[0].result && results[0].result.text) {
          const res = results[0].result;
          applyCapturedData(target, res.text, res.title, res.url);
        } else {
          alert("No text currently selected on this page. Highlight text with your cursor first!");
        }
      }
    );
  }

  function applyCapturedData(target, text, title, url) {
    if (!text || text.length < 3) {
      alert("Selected text is too short. Please highlight the passage you want to analyze.");
      return;
    }

    const payload = {
      id: "item_" + Date.now(),
      text: text,
      title: title || "Webpage",
      url: url || "",
      timestamp: new Date().toISOString()
    };

    if (target === "A") {
      state.claimA = payload;
      updateCardA();
    } else {
      state.claimB = payload;
      updateCardB();
    }
    saveCurrentInputs();
  }

  // ----------------------------------------------------------------
  // COMPARISON ENGINE
  // ----------------------------------------------------------------
  async function handleCompare() {
    saveCurrentInputs();
    const text1 = (state.claimA.text || "").trim();
    const text2 = (state.claimB.text || "").trim();

    // Validation
    if (!text1) {
      showError("Source A (Claim) cannot be empty. Select text on a webpage or paste it.");
      textA.focus();
      return;
    }

    if (!text2) {
      showError("Source B (Evidence) cannot be empty. Select comparison text or paste it.");
      textB.focus();
      return;
    }

    if (text1.length < 5 || text2.length < 5) {
      showError("Both passages should be at least 5 characters long for a meaningful comparison.");
      return;
    }

    // Start loading
    setComparingState(true);
    compareError.classList.add("hidden");

    const payload = {
      claim_a: {
        text: text1,
        title: state.claimA.title || "Source A",
        url: state.claimA.url || ""
      },
      claim_b: {
        text: text2,
        title: state.claimB.title || "Source B",
        url: state.claimB.url || ""
      },
      provider: state.selectedProvider || "groq"
    };

    try {
      let analysisResult = null;
      const backendUrl = state.settings.backendUrl || "http://localhost:8000";

      let backendError = null;
      // Try contacting FastAPI backend
      try {
        const response = await fetch(`${backendUrl}/compare`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Provider": state.selectedProvider || "groq",
            ...(state.settings.apiKey ? { "X-API-Key": state.settings.apiKey } : {})
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          analysisResult = await response.json();
        } else {
          let errDetail = `HTTP ${response.status}`;
          try {
            const errJson = await response.json();
            if (errJson && errJson.detail) errDetail = errJson.detail;
          } catch (_) {}
          backendError = `Backend returned ${errDetail}`;
          console.warn(`Backend returned ${response.status} (${errDetail}). Falling back to client-side engine.`);
        }
      } catch (networkErr) {
        backendError = `Backend unreachable at ${backendUrl}`;
        console.warn("Backend not reachable. Using built-in ContextLens engine fallback:", networkErr);
      }

      // If backend failed or was unreachable, use built-in heuristic engine
      if (!analysisResult) {
        analysisResult = runClientHeuristicAnalysis(payload.claim_a, payload.claim_b);
        if (backendError) {
          analysisResult.limitations = [
            `Backend notice: ${backendError}. Real AI analysis requires the backend to be running with an active LLM provider (run 'python -m uvicorn backend.main:app --port 8000').`,
            ...(analysisResult.limitations || [])
          ];
        }
      }

      state.lastResult = analysisResult;
      renderAnalysisResult(analysisResult);
      saveToHistory(payload.claim_a, payload.claim_b, analysisResult);

      // Scroll smoothly to results
      resultsSection.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      showError(`Comparison error: ${err.message || "Failed to analyze passages."}`);
    } finally {
      setComparingState(false);
    }
  }

  function setComparingState(isComparing) {
    if (isComparing) {
      btnCompare.disabled = true;
      compareSpinner.classList.remove("hidden");
      compareBtnText.textContent = "Analyzing Context...";
    } else {
      btnCompare.disabled = false;
      compareSpinner.classList.add("hidden");
      compareBtnText.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Compare with ContextLens`;
    }
  }

  function showError(msg) {
    compareError.classList.remove("hidden");
    errorMsg.textContent = msg;
    resultsSection.classList.add("hidden");
  }

  // ----------------------------------------------------------------
  // RESULT RENDERING (v2 — supports new and legacy schema)
  // ----------------------------------------------------------------

  /** Normalise classification string to one of the canonical values. */
  function normalizeClassification(raw) {
    if (!raw) return "insufficient";
    const c = raw.toLowerCase().replace(/_/g, "");
    if (c === "supported")                                          return "supported";
    if (c === "contradicted" || c === "possiblecontradiction")      return "contradicted";
    if (c === "partiallysupported")                                 return "partially";
    if (c === "differentcontext" || c === "context")                return "context";
    if (c === "insufficientevidence" || c === "insufficientcontext") return "insufficient";
    if (c === "unrelated")                                          return "unrelated";
    // Substring fallbacks for resilience
    if (c.includes("contradict"))  return "contradicted";
    if (c.includes("partial"))     return "partially";
    if (c.includes("support"))     return "supported";
    if (c.includes("context"))     return "context";
    if (c.includes("unrelated"))   return "unrelated";
    return "insufficient";
  }

  const BADGE_CONFIG = {
    supported:    { cls: "badge-consistent",    iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`, label: "SUPPORTED",           sub: "The evidence directly supports the claim." },
    contradicted: { cls: "badge-contradiction", iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`, label: "CONTRADICTED",         sub: "Reliable evidence conflicts with the claim under comparable conditions." },
    partially:    { cls: "badge-partial",       iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`, label: "PARTIALLY SUPPORTED",  sub: "Some aspects are supported, but the full claim is not established." },
    context:      { cls: "badge-context",       iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`, label: "DIFFERENT CONTEXT",     sub: "Passages differ due to dates, scope, definitions, or conditions." },
    insufficient: { cls: "badge-insufficient",  iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`, label: "INSUFFICIENT EVIDENCE", sub: "The available evidence does not justify a conclusion." },
    unrelated:    { cls: "badge-unrelated",     iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`, label: "UNRELATED",            sub: "The evidence does not meaningfully address the claim." },
  };

  function renderAnalysisResult(result) {
    resultsSection.classList.remove("hidden");

    // --- Classification Badge ---
    const cls = normalizeClassification(result.classification);
    const cfg = BADGE_CONFIG[cls] || BADGE_CONFIG.insufficient;
    classificationBadge.className = "classification-badge " + cfg.cls;
    badgeIcon.innerHTML    = cfg.iconSvg;
    badgeLabel.textContent = cfg.label;
    badgeSub.textContent   = cfg.sub;

    // Engine badge
    if (engineBadge) {
      const isHeuristic = result.engine === "heuristic" || Boolean(result.is_heuristic_fallback);
      const isAI = !isHeuristic && (
        result.engine === "llm" ||
        (typeof result.engine === "string" && (
          result.engine.includes("langchain") ||
          result.engine.includes("groq") ||
          result.engine.includes("gemini") ||
          result.engine.includes("openai") ||
          result.engine.includes("anthropic") ||
          result.engine.includes("local") ||
          result.engine.includes("qwen")
        ))
      );

      if (isHeuristic) {
        engineBadge.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Heuristic`;
        engineBadge.className = "engine-badge engine-heuristic";
        engineBadge.classList.remove("hidden");
      } else if (isAI) {
        const aiSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`;
        let label = `${aiSvg} AI`;
        const engStr = String(result.engine || "").toLowerCase();
        if (engStr.includes("groq")) {
          label = `${aiSvg} Groq`;
        } else if (engStr.includes("gemini")) {
          label = `${aiSvg} Gemini`;
        } else if (engStr.includes("openai") || engStr.includes("gpt")) {
          label = `${aiSvg} OpenAI`;
        } else if (engStr.includes("anthropic") || engStr.includes("claude")) {
          label = `${aiSvg} Claude`;
        } else if (engStr.includes("local") || engStr.includes("qwen")) {
          label = `${aiSvg} Local Qwen`;
        }
        engineBadge.innerHTML = label;
        engineBadge.className = "engine-badge engine-llm";
        engineBadge.classList.remove("hidden");
      } else {
        engineBadge.classList.add("hidden");
      }
    }

    // --- Analysis Summary ---
    const summary = result.analysis_summary || result.explanation || "No explanation provided.";
    resultExplanation.textContent = summary;

    // --- Confidence ---
    if (confidenceCard && result.confidence !== null && result.confidence !== undefined) {
      const pct = Math.round(result.confidence * 100);
      confidenceFill.style.width = pct + "%";
      confidenceFill.style.background = pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444";
      confidencePct.textContent = pct + "%";
      confidenceReason.textContent = result.confidence_reason || "";
      confidenceCard.classList.remove("hidden");
    } else if (confidenceCard) {
      confidenceCard.classList.add("hidden");
    }

    // --- Supporting Points ---
    const supporting = Array.isArray(result.supporting_points) ? result.supporting_points : [];
    if (supportingCard && supporting.length > 0) {
      resultSupporting.innerHTML = "";
      supporting.forEach((p) => {
        const li = document.createElement("li");
        li.textContent = p;
        resultSupporting.appendChild(li);
      });
      supportingCard.classList.remove("hidden");
    } else if (supportingCard) {
      supportingCard.classList.add("hidden");
    }

    // --- Contradicting Points ---
    const contradicting = Array.isArray(result.contradicting_points) ? result.contradicting_points : [];
    if (contradictingCard && contradicting.length > 0) {
      resultContradicting.innerHTML = "";
      contradicting.forEach((p) => {
        const li = document.createElement("li");
        li.textContent = p;
        resultContradicting.appendChild(li);
      });
      contradictingCard.classList.remove("hidden");
    } else if (contradictingCard) {
      contradictingCard.classList.add("hidden");
    }

    // --- Key Differences ---
    resultDifferences.innerHTML = "";
    const diffs = Array.isArray(result.key_differences) ? result.key_differences : [];
    if (diffs.length > 0) {
      diffs.forEach((d) => {
        const li = document.createElement("li");
        li.textContent = d;
        resultDifferences.appendChild(li);
      });
    } else {
      resultDifferences.innerHTML = "<li>No significant factual divergence identified.</li>";
    }

    // --- Missing Context ---
    resultMissing.innerHTML = "";
    const missing = Array.isArray(result.missing_context) ? result.missing_context : [];
    if (missing.length > 0) {
      missing.forEach((m) => {
        const li = document.createElement("li");
        li.textContent = m;
        resultMissing.appendChild(li);
      });
    } else {
      resultMissing.innerHTML = "<li>Context appears sufficient for preliminary assessment.</li>";
    }

    // --- Verification Questions ---
    resultQuestions.innerHTML = "";
    const questions = Array.isArray(result.verification_questions) ? result.verification_questions : [];
    if (questions.length > 0) {
      questions.forEach((q) => {
        const li = document.createElement("li");
        li.textContent = q;
        resultQuestions.appendChild(li);
      });
    } else {
      resultQuestions.innerHTML = "<li>Review original publication dates and primary sources.</li>";
    }

    // Populate Evidence-First Source Cards
    if (resTitleA && resQuoteA) {
      resTitleA.textContent = state.claimA.title || "Source A";
      resQuoteA.textContent = `"${state.claimA.text || ""}"`;
      if (resOpenA) {
        if (state.claimA.url) {
          resOpenA.href = state.claimA.url;
          resOpenA.style.display = "inline-block";
        } else {
          resOpenA.style.display = "none";
        }
      }
    }

    if (resTitleB && resQuoteB) {
      resTitleB.textContent = state.claimB.title || "Source B";
      resQuoteB.textContent = `"${state.claimB.text || ""}"`;
      if (resOpenB) {
        if (state.claimB.url) {
          resOpenB.href = state.claimB.url;
          resOpenB.style.display = "inline-block";
        } else {
          resOpenB.style.display = "none";
        }
      }
    }

    // --- Source Links ---
    const urlA = state.claimA.url || "#";
    const urlB = state.claimB.url || "#";
    resultSourceA.href = urlA;
    resultSourceB.href = urlB;
    resultDomainA.textContent = formatUrlDomain(urlA);
    resultDomainB.textContent = formatUrlDomain(urlB);

    if (!state.claimA.url) {
      resultSourceA.style.pointerEvents = "none";
      resultDomainA.textContent = "Manual / Unlinked";
    } else {
      resultSourceA.style.pointerEvents = "auto";
    }

    if (!state.claimB.url) {
      resultSourceB.style.pointerEvents = "none";
      resultDomainB.textContent = "Manual / Unlinked";
    } else {
      resultSourceB.style.pointerEvents = "auto";
    }

    // --- Additional Sources ---
    renderAdditionalSources(result.additional_sources || []);

    // --- Limitations ---
    const limitations = Array.isArray(result.limitations) ? result.limitations : [];
    if (limitationsCard && limitations.length > 0) {
      resultLimitations.innerHTML = "";
      limitations.forEach((l) => {
        const li = document.createElement("li");
        li.textContent = l;
        resultLimitations.appendChild(li);
      });
      limitationsCard.classList.remove("hidden");
    } else if (limitationsCard) {
      limitationsCard.classList.add("hidden");
    }
  }

  function renderAdditionalSources(sources) {
    const extraSources = Array.isArray(sources) ? sources : [];

    // Fallback: append extra sources to source-links-grid if present
    const sourceLinksGrid = document.querySelector(".source-links-grid");
    if (sourceLinksGrid) {
      const existingExtra = sourceLinksGrid.querySelectorAll(".extra-source-link");
      existingExtra.forEach(el => el.remove());

      extraSources.forEach((src, idx) => {
        if (src.url && src.url !== (state.claimA.url || "") && src.url !== (state.claimB.url || "")) {
          const a = document.createElement("a");
          a.className = "source-link-btn extra-source-link";
          a.href = src.url;
          a.target = "_blank";
          const domain = formatUrlDomain(src.url);
          const typeBadge = src.content_type === "full_page" ? " [Full Page]" : " [Snippet]";
          a.innerHTML = `<span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:text-bottom; margin-right:4px;"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>Source ${idx + 1}: ${escapeHtml(src.title || domain)}${typeBadge}</span><span class="source-domain">${domain}</span>`;
          sourceLinksGrid.appendChild(a);
        }
      });
    }

    if (!additionalSourcesCard || !additionalSourcesList) return;

    if (extraSources.length === 0) {
      additionalSourcesCard.classList.add("hidden");
      return;
    }

    additionalSourcesList.innerHTML = "";

    const relConfig = {
      supports:       { cls: "rel-supports",     iconSvg: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`, label: "Supports" },
      contradicts:    { cls: "rel-contradicts",  iconSvg: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`, label: "Contradicts" },
      contextualizes: { cls: "rel-context",      iconSvg: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`, label: "Contextualizes" },
      unclear:        { cls: "rel-unclear",      iconSvg: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`, label: "Unclear" },
    };

    extraSources.forEach((src) => {
      const rel = relConfig[src.relationship_to_claim] || relConfig.unclear;
      const statusLabel = src.retrieval_status === "snippet_only" ? "Snippet" :
                          src.retrieval_status === "retrieved" ? "Retrieved" :
                          src.content_type === "full_page" ? "Full Page" : "Snippet";

      // Validate URL before rendering as clickable link
      let safeUrl = "#";
      try {
        const parsed = new URL(src.url);
        if (parsed.protocol === "https:" || parsed.protocol === "http:") {
          safeUrl = src.url;
        }
      } catch (_) { /* invalid URL */ }

      const card = document.createElement("div");
      card.className = "additional-source-item";
      card.innerHTML = `
        <div class="source-item-header">
          <span class="source-rel-badge ${rel.cls}">${rel.iconSvg} ${rel.label}</span>
          <span class="source-retrieval-label">${escapeHtml(statusLabel)}</span>
        </div>
        <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="source-item-title">
          ${escapeHtml(src.title || src.url)}
        </a>
        ${src.publisher ? `<div class="source-item-publisher">${escapeHtml(src.publisher)}${src.published_date ? " · " + escapeHtml(src.published_date) : ""}</div>` : ""}
        ${src.relevance_reason || src.verified_claim ? `<div class="source-item-relevance">${escapeHtml(src.relevance_reason || src.verified_claim || "")}</div>` : ""}
        ${src.supporting_excerpt || src.snippet ? `<blockquote class="source-item-excerpt">${escapeHtml((src.supporting_excerpt || src.snippet || "").substring(0, 250))}${src.supporting_excerpt && src.supporting_excerpt.length > 250 ? "…" : ""}</blockquote>` : ""}
        ${src.limitations ? `<div class="source-item-limitations"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:text-bottom; margin-right:3px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${escapeHtml(src.limitations)}</div>` : ""}
      `;
      additionalSourcesList.appendChild(card);
    });

    additionalSourcesCard.classList.remove("hidden");
  }

  // ----------------------------------------------------------------
  // QUICK CHIPS & DEMO SCENARIOS
  // ----------------------------------------------------------------
  function loadQuickChipScenario(chipType) {
    switchTab("compare");

    if (chipType === "museum") {
      state.claimA = {
        id: "chip_museum_a",
        text: "The museum is open from 9 to 5 on weekdays.",
        title: "City Museum Official Hours",
        url: "https://citymuseum.mock/hours",
        timestamp: new Date().toISOString()
      };
      state.claimB = {
        id: "chip_museum_b",
        text: "Visitor information lists the museum weekday opening from 9 to 5.",
        title: "Metro Tourism Guide",
        url: "https://metrotourism.mock/museum-guide",
        timestamp: new Date().toISOString()
      };
    } else if (chipType === "conference") {
      state.claimA = {
        id: "chip_conf_a",
        text: "The DevSummit 2026 opening keynote takes place on Friday, November 14th at 9:00 AM.",
        title: "TechNews Daily - Preview",
        url: "https://technewsdaily.mock/devsummit-preview",
        timestamp: new Date().toISOString()
      };
      state.claimB = {
        id: "chip_conf_b",
        text: "All main conference talks including the opening keynote are confirmed for Saturday, November 15th.",
        title: "EventHub Official Schedule",
        url: "https://eventhub.mock/devsummit-official",
        timestamp: new Date().toISOString()
      };
    } else if (chipType === "pricing") {
      state.claimA = {
        id: "chip_price_a",
        text: "The ZenBook Ultra is listed starting at $499 on the manufacturer product page.",
        title: "HardwareDigest Review",
        url: "https://hardwaredigest.mock/zenbook-review",
        timestamp: new Date().toISOString()
      };
      state.claimB = {
        id: "chip_price_b",
        text: "The total order came to $549 for the ZenBook Ultra at checkout with shipping and taxes.",
        title: "Buyer Forum Receipt",
        url: "https://buyerforum.mock/zenbook-order-549",
        timestamp: new Date().toISOString()
      };
    } else if (chipType === "jobs") {
      state.claimA = {
        id: "chip_jobs_a",
        text: "Youth unemployment increased by 3.8% reaching record levels in the latest quarterly survey.",
        title: "Economic Monitor Report",
        url: "https://econmonitor.mock/youth-jobs-report",
        timestamp: new Date().toISOString()
      };
      state.claimB = {
        id: "chip_jobs_b",
        text: "Youth joblessness dropped to an all-time low of 7.2% as new tech internships surged.",
        title: "Global Career Insights",
        url: "https://careerinsights.mock/labor-statistics",
        timestamp: new Date().toISOString()
      };
    }

    updateCardA();
    updateCardB();
    saveCurrentInputs();

    setTimeout(() => {
      handleCompare();
    }, 150);
  }

  function loadDemoScenario(scenarioKey) {
    switchTab("compare");

    if (scenarioKey === "contradiction") {
      state.claimA = {
        id: "demo_a1",
        text: "The DevSummit 2026 opening keynote takes place on Friday, November 14th at 9:00 AM.",
        title: "TechNews Daily - DevSummit Preview",
        url: "https://technewsdaily.mock/devsummit-preview",
        timestamp: new Date().toISOString()
      };
      state.claimB = {
        id: "demo_a2",
        text: "All main conference talks including the opening keynote are confirmed for Saturday, November 15th.",
        title: "EventHub Official - DevSummit Schedule",
        url: "https://eventhub.mock/devsummit-official",
        timestamp: new Date().toISOString()
      };
    } else if (scenarioKey === "different_context") {
      state.claimA = {
        id: "demo_b1",
        text: "The ZenBook Ultra is listed starting at $499 on the manufacturer product page.",
        title: "HardwareDigest - Ultra Price Specs",
        url: "https://hardwaredigest.mock/zenbook-review",
        timestamp: new Date().toISOString()
      };
      state.claimB = {
        id: "demo_b2",
        text: "The total order came to $549 for the ZenBook Ultra at checkout with shipping and taxes.",
        title: "Buyer Forum - ZenBook Checkout Experience",
        url: "https://buyerforum.mock/zenbook-order-549",
        timestamp: new Date().toISOString()
      };
    } else if (scenarioKey === "insufficient_context") {
      state.claimA = {
        id: "demo_c1",
        text: "Youth unemployment increased by 3.8% reaching record levels in the latest quarterly survey.",
        title: "Economic Monitor - Youth Labor Trends",
        url: "https://econmonitor.mock/youth-jobs-report",
        timestamp: new Date().toISOString()
      };
      state.claimB = {
        id: "demo_c2",
        text: "Youth joblessness dropped to an all-time low of 7.2% as new tech internships surged.",
        title: "Global Career Insights - Talent Snapshot",
        url: "https://careerinsights.mock/labor-statistics",
        timestamp: new Date().toISOString()
      };
    }

    updateCardA();
    updateCardB();
    saveCurrentInputs();

    // Trigger immediate comparison
    setTimeout(() => {
      handleCompare();
    }, 150);
  }

  function runClientHeuristicAnalysis(claimA, claimB) {
    const raw = _computeClientHeuristic(claimA, claimB);
    return {
      ...raw,
      engine: "heuristic",
      is_heuristic_fallback: true,
      confidence_reason: raw.confidence_reason || "Offline keyword matching heuristic; no LLM semantic analysis."
    };
  }

  function _computeClientHeuristic(claimA, claimB) {
    const tA = (claimA.text || "").toLowerCase();
    const tB = (claimB.text || "").toLowerCase();

    function cleanSourceLabel(claim, defaultLabel) {
      if (claim.title && claim.title.trim() && !["Manual Input", "Untitled Source", "Untitled Webpage"].includes(claim.title.trim())) {
        return `${defaultLabel} (${claim.title})`;
      }
      return defaultLabel;
    }

    const labelA = cleanSourceLabel(claimA, "Source A");
    const labelB = cleanSourceLabel(claimB, "Source B");

    // Scenario 1: Date/Schedule contradiction check
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const foundDaysA = days.filter((d) => tA.includes(d));
    const foundDaysB = days.filter((d) => tB.includes(d));

    const hasContradictoryDays =
      foundDaysA.length > 0 &&
      foundDaysB.length > 0 &&
      foundDaysA.some((d) => !foundDaysB.includes(d));

    // Context differences (tax, shipping, checkout, base, discount)
    const contextKeywords = ["shipping", "tax", "taxes", "checkout", "handling", "fees", "order", "msrp", "base", "extended", "update"];
    const hasContextMod = contextKeywords.some((w) => tA.includes(w) || tB.includes(w));
    const hasNumbers = Boolean(tA.match(/\$?\d+/)) && Boolean(tB.match(/\$?\d+/));

    // Ambiguous statistics check
    const hasUnemploymentOrStat =
      (tA.includes("unemployment") || tA.includes("joblessness") || tA.includes("rate") || tA.includes("%")) &&
      (tB.includes("unemployment") || tB.includes("joblessness") || tB.includes("rate") || tB.includes("%"));
    const lacksGeoOrYear =
      !tA.match(/\b(19\d\d|20\d\d)\b/) &&
      !tB.match(/\b(19\d\d|20\d\d)\b/);

    if (hasContradictoryDays) {
      return {
        classification: "possible_contradiction",
        explanation: `Passage A refers to ${foundDaysA.join(", ")} while Passage B specifies ${foundDaysB.join(", ")}. Unless the event occurs over multiple days or the schedule was formally rescheduled, these statements present mutually exclusive dates.`,
        key_differences: [
          `${labelA} specifies schedule: ${foundDaysA.join(", ")}`,
          `${labelB} specifies schedule: ${foundDaysB.join(", ")}`,
          "Both passages appear to discuss the identical keynote or event."
        ],
        missing_context: [
          "Check whether the event spans multiple days (e.g. Nov 14-15).",
          "Verify the publication or update timestamp to determine if one source announced a postponement or rescheduling."
        ],
        verification_questions: [
          "Which notice is the primary, official event schedule?",
          "Did organizers release an update notice moving the keynote?",
          "Does either source clarify multi-day agenda tracks?"
        ],
        evidence_a: claimA.text,
        evidence_b: claimB.text
      };
    } else if (foundDaysA.length > 0 && foundDaysB.length > 0 && foundDaysA.every((d) => foundDaysB.includes(d)) && foundDaysB.every((d) => foundDaysA.includes(d))) {
      return {
        classification: "consistent",
        explanation: `Both passages corroborate that the event takes place on ${foundDaysA.join(", ")}. The statements are compatible and support consistent schedule details.`,
        key_differences: [
          "No substantive factual discrepancies identified; both sources align on the event timing."
        ],
        missing_context: [
          "Check whether specific room numbers or streaming links have been published."
        ],
        verification_questions: [
          "Do both sources reference the same official organizer announcement?",
          "Are there any secondary tracks occurring on adjacent days?"
        ],
        evidence_a: claimA.text,
        evidence_b: claimB.text
      };
    } else if (hasContextMod && hasNumbers) {
      return {
        classification: "different_context",
        explanation: "The figures in both passages likely describe different stages or scopes of pricing (e.g., base retail price vs. total final checkout price including shipping and taxes).",
        key_differences: [
          `${labelA} cites a starting or baseline figure.`,
          `${labelB} reflects a total checkout or fulfilled invoice.`,
          "Ancillary costs (shipping, handling, local taxes) account for the difference."
        ],
        missing_context: [
          "Verify whether Passage A includes or excludes shipping and regional sales tax.",
          "Confirm exact product model, storage configuration, or variant purchased."
        ],
        verification_questions: [
          "Does Passage A mention 'before taxes and fees' or 'starting at'?",
          "Does the checkout receipt in Passage B itemize delivery charges?",
          "Are both reviewers referencing the identical base hardware spec?"
        ],
        evidence_a: claimA.text,
        evidence_b: claimB.text
      };
    } else if (hasUnemploymentOrStat && lacksGeoOrYear) {
      return {
        classification: "insufficient_context",
        explanation: "Both passages discuss youth employment trends, but neither specifies the country, survey year, age bracket (e.g., 15-24 vs. 18-29), or seasonal adjustment methodology.",
        key_differences: [
          `${labelA} reports an increase or rising trend in the metric.`,
          `${labelB} reports a historic low or decreasing rate.`,
          "Neither source names the geographical jurisdiction or survey timeframe."
        ],
        missing_context: [
          "Specific nation, state, or metropolitan area surveyed.",
          "Exact survey year, quarter, and cohort age definition.",
          "Whether figures represent seasonally adjusted vs. unadjusted labor data."
        ],
        verification_questions: [
          "Which statistical agency published each dataset (e.g., BLS, Eurostat, ILO)?",
          "What timeframe and geographical region does each study cover?",
          "Do both sources share the same definition of 'youth'?"
        ],
        evidence_a: claimA.text,
        evidence_b: claimB.text
      };
    }

    // Semantic tokens & numbers comparison
    const stopwords = new Set([
      "the", "is", "are", "was", "were", "be", "been", "being", "from", "to", "at", "in", "on", "by",
      "for", "with", "about", "against", "between", "into", "through", "during", "before", "after",
      "above", "below", "up", "down", "out", "off", "over", "under", "again", "further", "then", "once",
      "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more",
      "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than",
      "too", "very", "can", "will", "just", "should", "now", "a", "an", "and", "or",
      "as", "of", "that", "this", "these", "those", "it", "its", "lists", "stated", "states", "notes",
      "according", "information", "reported", "reports"
    ]);

    function normalizeToken(w) {
      w = w.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, "");
      if (w.endsWith("days")) return w.slice(0, -1);
      if (w.endsWith("ing")) return w.slice(0, -3);
      if (w.endsWith("ed")) return w.slice(0, -2);
      if (w.endsWith("es")) return w.slice(0, -2);
      if (w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
      return w;
    }

    const rawA = (tA.match(/[a-zA-Z0-9]+/g) || []).map(normalizeToken);
    const rawB = (tB.match(/[a-zA-Z0-9]+/g) || []).map(normalizeToken);

    const tokensA = new Set(rawA.filter((w) => !stopwords.has(w) && w.length > 1));
    const tokensB = new Set(rawB.filter((w) => !stopwords.has(w) && w.length > 1));

    const numsA = (tA.match(/\b\d+(\.\d+)?\b/g) || []);
    const numsB = (tB.match(/\b\d+(\.\d+)?\b/g) || []);
    const setNumsA = new Set(numsA);
    const setNumsB = new Set(numsB);

    const overlap = [...tokensA].filter((x) => tokensB.has(x));
    const minTokens = Math.min(tokensA.size, tokensB.size);
    const overlapRatio = minTokens > 0 ? overlap.length / minTokens : 0;

    // Check 1: Conflicting numbers for the same subject
    const numsMatch = setNumsA.size === setNumsB.size && [...setNumsA].every((n) => setNumsB.has(n));
    if (overlap.length >= 2 && setNumsA.size > 0 && setNumsB.size > 0 && !numsMatch && !hasContextMod) {
      return {
        classification: "possible_contradiction",
        explanation: `Both passages discuss the same topic (${overlap.slice(0, 3).join(", ")}), but state conflicting hours or figures: ${labelA} states '${[...setNumsA].join(", ")}' while ${labelB} states '${[...setNumsB].join(", ")}'.`,
        key_differences: [
          `${labelA} cites numbers/hours: ${[...setNumsA].join(", ")}`,
          `${labelB} cites numbers/hours: ${[...setNumsB].join(", ")}`,
          "The statements appear to describe incompatible terms for the same subject."
        ],
        missing_context: [
          "Verify whether seasonal or weekend adjustments apply.",
          "Check for recent policy changes or revisions."
        ],
        verification_questions: [
          "Which source reflects the official current schedule or figure?",
          "Has an updated timetable been released?"
        ],
        evidence_a: claimA.text,
        evidence_b: claimB.text
      };
    }

    // Check 2: Consistent statement check (matching numbers or matching facts with high token overlap)
    if ((overlapRatio >= 0.5 || overlap.length >= 3) && (numsMatch || (setNumsA.size === 0 && setNumsB.size === 0))) {
      const keyTopics = overlap.slice(0, 4).join(", ");
      return {
        classification: "consistent",
        explanation: `Both passages corroborate that the ${keyTopics} details align. The statements share matching factual terms and schedule parameters without conflict.`,
        key_differences: [
          "No substantive factual discrepancies detected; both passages agree on core details."
        ],
        missing_context: [
          "Check for any special holiday exceptions or additional operational rules."
        ],
        verification_questions: [
          "Do both sources draw from the same primary publication?",
          "Are there any secondary conditions not captured in these excerpts?"
        ],
        evidence_a: claimA.text,
        evidence_b: claimB.text
      };
    }

    // Default balanced context comparison
    return {
      classification: "different_context",
      explanation: "[Offline Heuristic Mode] Both passages discuss related subjects, but semantic analysis was limited because the ContextLens AI backend was not reachable. Ensure the backend server is running for genuine LLM analysis.",
      key_differences: [
        `${labelA} states: "${claimA.text.substring(0, 70)}..."`,
        `${labelB} states: "${claimB.text.substring(0, 70)}..."`,
        "Differences in terminology reflect divergent focus rather than mutual incompatibility."
      ],
      missing_context: [
        "Timestamps and author credentials of both publications.",
        "Specific primary documentation or research reports cited by each author."
      ],
      verification_questions: [
        "Are both statements referencing the identical timeframe and entity?",
        "Has subsequent reporting clarified any conflicting phrasing?",
        "Do the primary source documents support both interpretations?"
      ],
      evidence_a: claimA.text,
      evidence_b: claimB.text
    };
  }

  // ----------------------------------------------------------------
  // RESEARCH HISTORY
  // ----------------------------------------------------------------
  function saveToHistory(claimA, claimB, result) {
    const entry = {
      id: "comp_" + Date.now(),
      timestamp: new Date().toISOString(),
      claim_a: { ...claimA },
      claim_b: { ...claimB },
      result: { ...result }
    };

    // Prepend to history, max 50 items
    state.history.unshift(entry);
    if (state.history.length > 50) {
      state.history = state.history.slice(0, 50);
    }

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ history: state.history });
    }

    renderHistory();
  }

  function renderHistory(query = "") {
    historyBadge.textContent = state.history.length;

    const filtered = state.history.filter((item) => {
      const classification = (item.result?.classification || "").toLowerCase();

      // Check category filter pill
      if (state.historyFilter && state.historyFilter !== "all") {
        if (!classification.includes(state.historyFilter.toLowerCase())) {
          return false;
        }
      }

      if (!query) return true;
      const q = query.toLowerCase();
      const textA = (item.claim_a?.text || "").toLowerCase();
      const textB = (item.claim_b?.text || "").toLowerCase();
      const titleA = (item.claim_a?.title || "").toLowerCase();
      const titleB = (item.claim_b?.title || "").toLowerCase();
      return (
        textA.includes(q) ||
        textB.includes(q) ||
        titleA.includes(q) ||
        titleB.includes(q) ||
        classification.includes(q)
      );
    });

    historyList.innerHTML = "";

    if (filtered.length === 0) {
      historyEmpty.classList.remove("hidden");
      return;
    }

    historyEmpty.classList.add("hidden");

    filtered.forEach((item) => {
      const el = document.createElement("div");
      el.className = "history-item";

      const classification = (item.result?.classification || "insufficient_context").toLowerCase();
      let badgeClass = "badge-neutral";
      let badgeText = "ANALYSIS";

      if (classification.includes("contradiction")) {
        badgeClass = "badge-contradiction";
        badgeText = "CONTRADICTION";
      } else if (classification.includes("consistent")) {
        badgeClass = "badge-consistent";
        badgeText = "CONSISTENT";
      } else if (classification.includes("context")) {
        badgeClass = "badge-context";
        badgeText = "DIFF CONTEXT";
      } else {
        badgeClass = "badge-insufficient";
        badgeText = "INSUFFICIENT";
      }

      const dateStr = item.timestamp
        ? new Date(item.timestamp).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          })
        : "Recent";

      el.innerHTML = `
        <div class="history-item-header">
          <span class="history-item-badge ${badgeClass}">${badgeText}</span>
          <span class="history-item-date">${dateStr}</span>
        </div>
        <div class="history-item-text"><strong>A:</strong> ${escapeHtml(item.claim_a?.text || "")}</div>
        <div class="history-item-text"><strong>B:</strong> ${escapeHtml(item.claim_b?.text || "")}</div>
        <div class="history-item-actions">
          <span class="history-action-load">Review Analysis &rarr;</span>
          <button class="history-action-delete" title="Delete comparison">&times; Delete</button>
        </div>
      `;

      // Click to load into workspace
      el.addEventListener("click", (e) => {
        if (e.target.classList.contains("history-action-delete")) return;
        loadHistoryItem(item);
      });

      // Delete item
      const delBtn = el.querySelector(".history-action-delete");
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteHistoryItem(item.id);
      });

      historyList.appendChild(el);
    });
  }

  function loadHistoryItem(item) {
    state.claimA = { ...item.claim_a };
    state.claimB = { ...item.claim_b };
    updateCardA();
    updateCardB();
    saveCurrentInputs();

    state.lastResult = item.result;
    renderAnalysisResult(item.result);
    switchTab("compare");
    resultsSection.scrollIntoView({ behavior: "smooth" });
  }

  function deleteHistoryItem(id) {
    state.history = state.history.filter((h) => h.id !== id);
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ history: state.history });
    }
    renderHistory(historySearch.value);
  }

  // ----------------------------------------------------------------
  // BACKEND HEALTH & SETTINGS
  // ----------------------------------------------------------------
  async function checkBackendHealth() {
    backendStatusMsg.className = "status-indicator status-unknown";
    backendStatusMsg.textContent = "Status: Checking connection...";

    const backendUrl = state.settings.backendUrl || "http://localhost:8000";

    try {
      const res = await fetch(`${backendUrl}/health`, { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        backendStatusMsg.className = "status-indicator status-online";
        backendStatusMsg.textContent = `Status: Online (${data.engine || "FastAPI Backend"})`;
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      backendStatusMsg.className = "status-indicator status-offline";
      backendStatusMsg.textContent = "Status: Offline (Using Built-in Heuristic Fallback)";
    }
  }

  // ----------------------------------------------------------------
  // UTILITIES
  // ----------------------------------------------------------------
  function formatUrlDomain(url) {
    if (!url) return "Manual Source";
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace("www.", "") + (parsed.pathname.length > 1 ? parsed.pathname.slice(0, 16) + "..." : "");
    } catch {
      return url.length > 25 ? url.substring(0, 25) + "..." : url;
    }
  }

  function buildMarkdownSummary() {
    if (!state.lastResult) return "";
    const res = state.lastResult;

    const supportingMd = (res.supporting_points || []).map((p) => `- ${p}`).join("\n");
    const contradictingMd = (res.contradicting_points || []).map((p) => `- ${p}`).join("\n");
    const limitationsMd = (res.limitations || []).map((l) => `- ${l}`).join("\n");
    const sourcesMd = (res.additional_sources || []).map((s) =>
      `- [${s.title}](${s.url}) — ${s.relationship_to_claim}: ${s.relevance_reason || ""}${s.limitations ? " [Limitation: " + s.limitations + "]" : ""}`
    ).join("\n");
    const confidenceLine = res.confidence !== null && res.confidence !== undefined
      ? `**Confidence:** ${Math.round(res.confidence * 100)}% — ${res.confidence_reason || ""}`
      : "";

    const md = `### ContextLens Analysis Report
**Classification:** ${(res.classification || "").toUpperCase()}
**Engine:** ${res.engine || "unknown"}

**Source A (${state.claimA.title || "Source A"}):**
> ${state.claimA.text}
*URL: ${state.claimA.url || "N/A"}*

**Source B (${state.claimB.title || "Source B"}):**
> ${state.claimB.text}
*URL: ${state.claimB.url || "N/A"}*

**Analysis Summary:**
${res.analysis_summary || res.explanation || ""}

${confidenceLine}

**Supporting Evidence:**
${supportingMd || "None identified."}

**Contradicting Evidence:**
${contradictingMd || "None identified."}

**Key Differences:**
${(res.key_differences || []).map((d) => `- ${d}`).join("\n") || "None identified."}

**Missing Context to Verify:**
${(res.missing_context || []).map((m) => `- ${m}`).join("\n") || "None identified."}

**Suggested Verification Questions:**
${(res.verification_questions || []).map((q) => `- ${q}`).join("\n") || "None."}

${sourcesMd ? `**Additional Sources Discovered:**\n${sourcesMd}\n` : ""}
${limitationsMd ? `**Analysis Limitations:**\n${limitationsMd}\n` : ""}
---
*Generated by ContextLens v2 — "Evidence before conclusions."*
`;
    return md;
  }

  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  function downloadMarkdownReport() {
    if (!state.lastResult) return;
    const md = buildMarkdownSummary();
    const filename = `ContextLens_Report_${Date.now()}.md`;
    downloadFile(md, filename, "text/markdown;charset=utf-8");
  }

  function downloadJsonAnalysis() {
    if (!state.lastResult) return;
    const data = {
      timestamp: new Date().toISOString(),
      claim_a: state.claimA,
      claim_b: state.claimB,
      result: state.lastResult
    };
    const json = JSON.stringify(data, null, 2);
    const filename = `ContextLens_Analysis_${Date.now()}.json`;
    downloadFile(json, filename, "application/json;charset=utf-8");
  }

  function exportAllHistory() {
    if (!state.history || state.history.length === 0) {
      alert("No research history to export yet. Perform some comparisons first!");
      return;
    }
    const json = JSON.stringify(state.history, null, 2);
    const filename = `ContextLens_History_${Date.now()}.json`;
    downloadFile(json, filename, "application/json;charset=utf-8");
  }

  function copyMarkdownSummary() {
    const md = buildMarkdownSummary();
    if (!md) return;

    navigator.clipboard.writeText(md).then(() => {
      btnCopyReport.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied`;
      setTimeout(() => {
        btnCopyReport.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg> Copy`;
      }, 2000);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ----------------------------------------------------------------
  // QUICK APPEARANCE CONTROLS RENDERER
  // ----------------------------------------------------------------
  function renderQuickAppearanceControls() {
    if (!window.ContextLensThemes) return;
    const T = window.ContextLensThemes;
    const app = state.appearanceState || T.APPEARANCE_DEFAULTS;

    // Render Quick Theme Chips: Lavender default + 5 curated dark themes
    if (quickThemeChips) {
      quickThemeChips.innerHTML = "";
      T.BUILTIN_THEMES.forEach((t) => {
        const isActive = t.id === app.activeThemeId;
        const chip = document.createElement("button");
        chip.className = `quick-theme-chip ${isActive ? "active" : ""}`;
        chip.title = `${t.name} (${t.category === "light" ? "Default Light" : "Curated Dark"})`;
        chip.setAttribute("role", "radio");
        chip.setAttribute("aria-checked", isActive ? "true" : "false");
        const swatchBg = t.image
          ? `background-image: url('assets/themes/${t.image}'); background-size: cover; background-position: center; border: 1.5px solid ${t.tokens['--border-strong'] || 'rgba(255,255,255,0.3)'}`
          : `background: ${t.accentColor || t.tokens['--accent-violet']}; border: 1.5px solid ${t.tokens['--border-strong'] || 'rgba(255,255,255,0.3)'}`;

        chip.innerHTML = `
          <span class="chip-color-swatch" style="${swatchBg}"></span>
          <span class="chip-name">${escapeHtml(t.name)}</span>
          <span class="chip-check" aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
        `;
        chip.addEventListener("click", () => {
          app.activeThemeId = t.id;
          T.applyFullAppearance(app);
          T.saveAppearance(app);
          renderQuickAppearanceControls();
        });
        quickThemeChips.appendChild(chip);
      });
    }

    if (quickReducedMotion) {
      quickReducedMotion.checked = !!app.reducedMotion;
    }
  }
});
