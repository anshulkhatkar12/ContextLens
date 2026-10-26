// ContextLens - Side Panel & Popup Application Logic

document.addEventListener("DOMContentLoaded", () => {
  // Application State
  let state = {
    claimA: { text: "", title: "", url: "", timestamp: null },
    claimB: { text: "", title: "", url: "", timestamp: null },
    lastResult: null,
    history: [],
    settings: {
      backendUrl: "http://localhost:8000",
      apiKey: ""
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
  const resultExplanation = document.getElementById("result-explanation");
  const resultDifferences = document.getElementById("result-differences");
  const resultMissing = document.getElementById("result-missing");
  const resultQuestions = document.getElementById("result-questions");
  const resultSourceA = document.getElementById("result-source-a");
  const resultSourceB = document.getElementById("result-source-b");
  const resultDomainA = document.getElementById("result-domain-a");
  const resultDomainB = document.getElementById("result-domain-b");
  const btnCopyReport = document.getElementById("btn-copy-report");
  const btnSaveHistory = document.getElementById("btn-save-history");
  const btnNewComparison = document.getElementById("btn-new-comparison");

  // DOM Elements - History
  const historyList = document.getElementById("history-list");
  const historyEmpty = document.getElementById("history-empty");
  const historySearch = document.getElementById("history-search");
  const btnClearHistory = document.getElementById("btn-clear-history");

  // DOM Elements - Settings
  const settingBackendUrl = document.getElementById("setting-backend-url");
  const settingApiKey = document.getElementById("setting-api-key");
  const btnTestBackend = document.getElementById("btn-test-backend");
  const backendStatusMsg = document.getElementById("backend-status-msg");
  const btnSaveSettings = document.getElementById("btn-save-settings");

  // ----------------------------------------------------------------
  // INITIALIZATION
  // ----------------------------------------------------------------
  if (typeof ContextLensSettings !== "undefined") {
    ContextLensSettings.loadPreferences(() => {
      ContextLensSettings.initSettingsUI();
    });
  }
  loadStoredData();
  setupEventListeners();
  checkBackendHealth();

  // ----------------------------------------------------------------
  // STORAGE & STATE
  // ----------------------------------------------------------------
  function loadStoredData() {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(
        ["current_claim", "current_evidence", "history", "settings", "dismiss_hint"],
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
          if (res.settings) {
            state.settings = { ...state.settings, ...res.settings };
            settingBackendUrl.value = state.settings.backendUrl || "http://localhost:8000";
            settingApiKey.value = state.settings.apiKey || "";
          }
          if (res.dismiss_hint && quickHint) {
            quickHint.classList.add("hidden");
          }
        }
      );

      // Listen for real-time changes from background script or content scripts
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

    // Copy Report
    btnCopyReport.addEventListener("click", copyMarkdownSummary);

    // Save History
    btnSaveHistory.addEventListener("click", () => {
      btnSaveHistory.textContent = "Saved ✓";
      setTimeout(() => (btnSaveHistory.textContent = "💾 Saved"), 2000);
    });

    // Start New Comparison
    btnNewComparison.addEventListener("click", () => {
      resultsSection.classList.add("hidden");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // Demos Tab Click Handlers
    document.querySelectorAll(".btn-load-demo").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const scenario = e.currentTarget.dataset.scenario;
        loadDemoScenario(scenario);
      });
    });

    // History Search & Clear
    historySearch.addEventListener("input", (e) => {
      renderHistory(e.target.value);
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

    // Settings actions
    btnTestBackend.addEventListener("click", checkBackendHealth);
    btnSaveSettings.addEventListener("click", () => {
      state.settings.backendUrl = settingBackendUrl.value.trim().replace(/\/+$/, "");
      state.settings.apiKey = settingApiKey.value.trim();
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ settings: state.settings });
      }
      alert("Settings saved successfully!");
      checkBackendHealth();
    });
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
      }
    };

    try {
      let analysisResult = null;
      const backendUrl = state.settings.backendUrl || "http://localhost:8000";

      // Try contacting FastAPI backend
      try {
        const response = await fetch(`${backendUrl}/compare`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(state.settings.apiKey ? { "X-API-Key": state.settings.apiKey } : {})
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          analysisResult = await response.json();
        } else {
          console.warn(`Backend returned ${response.status}. Falling back to client-side engine.`);
        }
      } catch (networkErr) {
        console.warn("Backend not reachable. Using built-in ContextLens engine fallback:", networkErr);
      }

      // If backend failed or was unreachable, use high-fidelity built-in engine
      if (!analysisResult) {
        analysisResult = runClientHeuristicAnalysis(payload.claim_a, payload.claim_b);
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
      compareBtnText.textContent = "⚡ Compare with ContextLens";
    }
  }

  function showError(msg) {
    compareError.classList.remove("hidden");
    errorMsg.textContent = msg;
    resultsSection.classList.add("hidden");
  }

  // ----------------------------------------------------------------
  // RESULT RENDERING
  // ----------------------------------------------------------------
  function renderAnalysisResult(result) {
    resultsSection.classList.remove("hidden");

    // Configure Badge
    const classification = (result.classification || "insufficient_context").toLowerCase();
    classificationBadge.className = "classification-badge";

    if (classification === "possible_contradiction" || classification.includes("contradiction")) {
      classificationBadge.classList.add("badge-contradiction");
      badgeIcon.textContent = "⚠️";
      badgeLabel.textContent = "POSSIBLE CONTRADICTION";
      badgeSub.textContent = "The passages appear to make incompatible claims about the same subject.";
    } else if (classification === "consistent" || classification.includes("consistent")) {
      classificationBadge.classList.add("badge-consistent");
      badgeIcon.textContent = "✅";
      badgeLabel.textContent = "CONSISTENT";
      badgeSub.textContent = "The passages appear compatible or support similar conclusions.";
    } else if (classification === "different_context" || classification.includes("context")) {
      classificationBadge.classList.add("badge-context");
      badgeIcon.textContent = "⏱️";
      badgeLabel.textContent = "DIFFERENT CONTEXT";
      badgeSub.textContent = "Statements may differ due to timing, scope, definitions, or circumstances.";
    } else {
      classificationBadge.classList.add("badge-insufficient");
      badgeIcon.textContent = "❓";
      badgeLabel.textContent = "INSUFFICIENT CONTEXT";
      badgeSub.textContent = "There is not enough information to verify the relationship.";
    }

    // Explanation
    resultExplanation.textContent = result.explanation || "No explanation provided.";

    // Key Differences
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

    // Missing Context
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

    // Verification Questions
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

    // Source links
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

    // Apply active section collapse, ordering, and icon visibility preferences to newly rendered results
    if (typeof ContextLensSettings !== "undefined") {
      ContextLensSettings.applyPreferencesToDOM(ContextLensSettings.getPreferences());
    }
  }

  // ----------------------------------------------------------------
  // DEMONSTRATION MODE
  // ----------------------------------------------------------------
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

  // ----------------------------------------------------------------
  // CLIENT-SIDE HEURISTIC / OFFLINE ANALYSIS ENGINE
  // ----------------------------------------------------------------
  function runClientHeuristicAnalysis(claimA, claimB) {
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
      explanation: "Both passages discuss related subjects, but variations in emphasis, perspective, or timing suggest they describe different facets rather than direct contradictions.",
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
      if (!query) return true;
      const q = query.toLowerCase();
      const textA = (item.claim_a?.text || "").toLowerCase();
      const textB = (item.claim_b?.text || "").toLowerCase();
      const titleA = (item.claim_a?.title || "").toLowerCase();
      const titleB = (item.claim_b?.title || "").toLowerCase();
      const classification = (item.result?.classification || "").toLowerCase();
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

  function copyMarkdownSummary() {
    if (!state.lastResult) return;
    const res = state.lastResult;

    const md = `### ContextLens Analysis Report
**Classification:** ${res.classification.toUpperCase()}

**Source A (${state.claimA.title || "Source A"}):**
> ${state.claimA.text}
*URL: ${state.claimA.url || "N/A"}*

**Source B (${state.claimB.title || "Source B"}):**
> ${state.claimB.text}
*URL: ${state.claimB.url || "N/A"}*

**Analysis Summary:**
${res.explanation}

**Key Differences:**
${(res.key_differences || []).map((d) => `- ${d}`).join("\n")}

**Missing Context to Verify:**
${(res.missing_context || []).map((m) => `- ${m}`).join("\n")}

**Suggested Verification Questions:**
${(res.verification_questions || []).map((q) => `- ${q}`).join("\n")}

---
*Generated by ContextLens - "Evidence before conclusions."*
`;

    navigator.clipboard.writeText(md).then(() => {
      btnCopyReport.textContent = "Copied ✓";
      setTimeout(() => (btnCopyReport.textContent = "📋 Copy"), 2000);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
});
