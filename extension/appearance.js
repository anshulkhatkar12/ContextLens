// ContextLens — Appearance Page Controller
// appearance.js — handles full personalization UI

document.addEventListener("DOMContentLoaded", () => {
  const T = window.ContextLensThemes; // alias

  // ── STATE ─────────────────────────────────────────────────────────────────
  let state = {
    appearance: { ...T.APPEARANCE_DEFAULTS },
    pendingColorOverrides: {},
    editingThemeId: null
  };

  // ── DOM REFS ───────────────────────────────────────────────────────────────
  const activeThemeBadge = document.getElementById("active-theme-badge");
  const presetsGrid = document.getElementById("presets-grid");
  const themeGalleryDark = document.getElementById("theme-gallery-dark");
  const themeGalleryLight = document.getElementById("theme-gallery-light");
  const themeGalleryAccess = document.getElementById("theme-gallery-accessibility");
  const themeGalleryCustom = document.getElementById("theme-gallery-custom");
  const customThemesEmpty = document.getElementById("custom-themes-empty");
  const customThemeList = document.getElementById("custom-theme-list");

  // Color pickers
  const colorFields = [
    { colorId: "color-bg-primary", hexId: "color-bg-primary-hex", token: "--bg-primary" },
    { colorId: "color-bg-surface", hexId: "color-bg-surface-hex", token: "--bg-surface" },
    { colorId: "color-accent", hexId: "color-accent-hex", token: "--accent-violet" },
    { colorId: "color-text-main", hexId: "color-text-main-hex", token: "--text-main" },
    { colorId: "color-text-muted", hexId: "color-text-muted-hex", token: "--text-muted" },
    { colorId: "color-border", hexId: "color-border-hex", token: "--border-strong" },
    { colorId: "color-contradiction", hexId: "color-contradiction-hex", token: "--status-contradiction" },
    { colorId: "color-consistent", hexId: "color-consistent-hex", token: "--status-consistent" }
  ];

  // Typography
  const fontFamilySelect = document.getElementById("font-family-select");
  const fontSizeSlider = document.getElementById("font-size-slider");
  const fontSizeValue = document.getElementById("font-size-value");
  const lineHeightSlider = document.getElementById("line-height-slider");
  const lineHeightValue = document.getElementById("line-height-value");
  const fontWeightSelect = document.getElementById("font-weight-select");

  // Layout
  const densityGroup = document.getElementById("density-group");
  const radiusGroup = document.getElementById("radius-group");
  const borderGroup = document.getElementById("border-group");
  const reducedMotionToggle = document.getElementById("reduced-motion-toggle");

  // Save / manage
  const customThemeNameInput = document.getElementById("custom-theme-name");
  const btnSaveCustomTheme = document.getElementById("btn-save-custom-theme");
  const btnResetColors = document.getElementById("btn-reset-colors");
  const btnExportAppearance = document.getElementById("btn-export-appearance");
  const btnImportAppearance = document.getElementById("btn-import-appearance");
  const importFileInput = document.getElementById("import-file-input");
  const btnResetAppearance = document.getElementById("btn-reset-appearance");
  const appearFeedback = document.getElementById("appear-feedback");
  const appearFeedbackText = document.getElementById("appear-feedback-text");
  const contrastWarning = document.getElementById("contrast-warning");
  const contrastWarningText = document.getElementById("contrast-warning-text");
  const btnBackSidepanel = document.getElementById("btn-back-sidepanel");
  const contrastWarnEl = document.getElementById("contrast-warning");

  // ── INIT ──────────────────────────────────────────────────────────────────
  T.loadAppearance((saved) => {
    state.appearance = saved || { ...T.APPEARANCE_DEFAULTS };
    T.applyFullAppearance(state.appearance);
    syncAllControls();
    renderPresetsGrid();
    renderThemeGalleries();
    renderCustomThemeList();
  });

  // Storage listener — keep in sync if sidepanel changes settings
  if (typeof chrome !== "undefined" && chrome.storage) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if ((area === "local" || area === "sync") && changes.appearance) {
        const newVal = T.validateAppearance(changes.appearance.newValue);
        state.appearance = newVal;
        T.applyFullAppearance(state.appearance);
        syncAllControls();
        renderThemeGalleries();
        renderCustomThemeList();
      }
    });
  }

  // ── BACK BUTTON ───────────────────────────────────────────────────────────
  if (btnBackSidepanel) {
    btnBackSidepanel.addEventListener("click", () => {
      if (typeof chrome !== "undefined" && chrome.tabs) {
        chrome.tabs.create({ url: chrome.runtime.getURL("sidepanel.html") });
      } else {
        window.history.back();
      }
    });
  }

  // ── PRESET CARDS ──────────────────────────────────────────────────────────
  function renderPresetsGrid() {
    presetsGrid.innerHTML = "";
    T.PERSONALIZATION_PRESETS.forEach(preset => {
      const card = document.createElement("button");
      card.className = "preset-card";
      card.innerHTML = `
        <div class="preset-emoji">${preset.emoji}</div>
        <div class="preset-name">${preset.name}</div>
        <div class="preset-desc">${preset.description}</div>
      `;
      card.addEventListener("click", () => applyPersonalizationPreset(preset));
      presetsGrid.appendChild(card);
    });
  }

  function applyPersonalizationPreset(preset) {
    state.appearance = {
      ...state.appearance,
      activeThemeId: preset.themeId,
      typography: { ...preset.typography },
      density: preset.density,
      radiusPreset: preset.radiusPreset,
      reducedMotion: preset.reducedMotion,
      borderStrength: preset.borderStrength
    };
    state.pendingColorOverrides = {};
    T.applyFullAppearance(state.appearance);
    saveAndSync();
    syncAllControls();
    renderThemeGalleries();
    showFeedback(`Applied preset: ${preset.emoji} ${preset.name}`, "success");
  }

  // ── THEME GALLERY ─────────────────────────────────────────────────────────
  function renderThemeGalleries() {
    renderGallery(themeGalleryDark, T.BUILTIN_THEMES.filter(t => t.category === "dark"));
    renderGallery(themeGalleryLight, T.BUILTIN_THEMES.filter(t => t.category === "light"));
    renderGallery(themeGalleryAccess, T.BUILTIN_THEMES.filter(t => t.category === "accessibility"));

    const customThemes = state.appearance.customThemes || [];
    if (customThemes.length === 0) {
      themeGalleryCustom.innerHTML = "";
      if (customThemesEmpty) customThemesEmpty.classList.remove("hidden");
    } else {
      if (customThemesEmpty) customThemesEmpty.classList.add("hidden");
      renderGallery(themeGalleryCustom, customThemes, true);
    }

    updateActiveThemeBadge();
  }

  function renderGallery(container, themes, isCustom = false) {
    container.innerHTML = "";
    themes.forEach(theme => {
      const card = document.createElement("button");
      const isActive = state.appearance.activeThemeId === theme.id;
      card.className = `theme-card${isActive ? " active" : ""}`;

      // Build background from theme tokens
      const bg = theme.tokens["--bg-primary"] || "#0b0f19";
      const surface = theme.tokens["--bg-surface"] || "#111827";
      const accent = theme.tokens["--accent-violet"] || "#8b5cf6";
      const cyan = theme.tokens["--accent-cyan"] || "#38bdf8";
      const textMain = theme.tokens["--text-main"] || "#f8fafc";

      card.style.background = `linear-gradient(135deg, ${bg} 0%, ${surface} 100%)`;

      card.innerHTML = `
        <div class="theme-card-emoji">${theme.emoji || "🎨"}</div>
        <div class="theme-swatch-row">
          <div class="theme-swatch" style="background:${accent}"></div>
          <div class="theme-swatch" style="background:${cyan}"></div>
          <div class="theme-swatch" style="background:${textMain}; opacity:0.6"></div>
        </div>
        <div class="theme-card-name">${theme.name}</div>
      `;

      card.addEventListener("click", () => selectTheme(theme.id));
      container.appendChild(card);
    });
  }

  function selectTheme(themeId) {
    state.appearance.activeThemeId = themeId;
    state.pendingColorOverrides = {};
    const theme = T.getThemeById(themeId, state.appearance.customThemes);
    T.applyThemeTokens(theme);
    syncColorEditorToTheme(theme);
    saveAndSync();
    renderThemeGalleries();
    showFeedback("Theme applied", "success");
  }

  function updateActiveThemeBadge() {
    if (!activeThemeBadge) return;
    const theme = T.getThemeById(state.appearance.activeThemeId, state.appearance.customThemes);
    activeThemeBadge.textContent = `${theme.emoji || "🎨"} ${theme.name}`;
  }

  // ── COLOR EDITOR ──────────────────────────────────────────────────────────
  function syncColorEditorToTheme(theme) {
    colorFields.forEach(field => {
      const colorEl = document.getElementById(field.colorId);
      const hexEl = document.getElementById(field.hexId);
      const rawVal = theme.tokens[field.token] || "";
      // Only set on color picker if it's a pure hex value
      const hexMatch = rawVal.match(/^#[0-9a-fA-F]{6}$/);
      if (hexMatch && colorEl) colorEl.value = rawVal;
      if (hexEl) hexEl.value = rawVal;
    });
    checkContrastWarning();
  }

  // Wire up color pickers
  colorFields.forEach(field => {
    const colorEl = document.getElementById(field.colorId);
    const hexEl = document.getElementById(field.hexId);

    if (colorEl) {
      colorEl.addEventListener("input", () => {
        const v = colorEl.value;
        if (hexEl) hexEl.value = v;
        hexEl?.classList.remove("invalid");
        applyColorOverride(field.token, v);
      });
    }

    if (hexEl) {
      hexEl.addEventListener("input", () => {
        const v = hexEl.value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(v)) {
          hexEl.classList.remove("invalid");
          if (colorEl) colorEl.value = v;
          applyColorOverride(field.token, v);
        } else {
          hexEl.classList.add("invalid");
        }
      });
    }
  });

  function applyColorOverride(token, value) {
    document.documentElement.style.setProperty(token, value);
    state.pendingColorOverrides[token] = value;
    checkContrastWarning();
  }

  function checkContrastWarning() {
    const bgVal = document.getElementById("color-bg-primary-hex")?.value || "";
    const textVal = document.getElementById("color-text-main-hex")?.value || "";
    if (/^#[0-9a-fA-F]{6}$/.test(bgVal) && /^#[0-9a-fA-F]{6}$/.test(textVal)) {
      const result = T.checkContrastWCAG(textVal, bgVal);
      if (result.level === "fail") {
        if (contrastWarnEl) contrastWarnEl.classList.remove("hidden");
        if (contrastWarningText) {
          contrastWarningText.textContent =
            `Contrast ratio ${result.ratio?.toFixed(1)}:1 is below WCAG AA (4.5:1). Text may be hard to read.`;
        }
      } else {
        if (contrastWarnEl) contrastWarnEl.classList.add("hidden");
      }
    }
  }

  // Reset color overrides back to current theme
  if (btnResetColors) {
    btnResetColors.addEventListener("click", () => {
      state.pendingColorOverrides = {};
      const theme = T.getThemeById(state.appearance.activeThemeId, state.appearance.customThemes);
      T.applyThemeTokens(theme);
      syncColorEditorToTheme(theme);
      if (contrastWarnEl) contrastWarnEl.classList.add("hidden");
      showFeedback("Color overrides reset to theme defaults.", "info");
    });
  }

  // Save color overrides as custom theme
  if (btnSaveCustomTheme) {
    btnSaveCustomTheme.addEventListener("click", () => {
      if (Object.keys(state.pendingColorOverrides).length === 0) {
        showFeedback("No color changes to save. Modify at least one color first.", "error");
        return;
      }
      const name = customThemeNameInput?.value.trim() || "My Custom Theme";
      const custom = T.createCustomThemeFromCurrent(
        name,
        state.pendingColorOverrides,
        state.appearance.activeThemeId
      );
      state.appearance.customThemes = [...(state.appearance.customThemes || []), custom];
      state.appearance.activeThemeId = custom.id;
      state.pendingColorOverrides = {};
      if (customThemeNameInput) customThemeNameInput.value = "";
      T.applyFullAppearance(state.appearance);
      saveAndSync();
      renderThemeGalleries();
      renderCustomThemeList();
      showFeedback(`Custom theme "${custom.name}" saved!`, "success");
    });
  }

  // ── TYPOGRAPHY CONTROLS ───────────────────────────────────────────────────
  if (fontFamilySelect) {
    fontFamilySelect.addEventListener("change", () => {
      state.appearance.typography.fontFamily = fontFamilySelect.value;
      T.applyTypography(state.appearance.typography);
      saveAndSync();
    });
  }

  if (fontSizeSlider) {
    fontSizeSlider.addEventListener("input", () => {
      const v = parseInt(fontSizeSlider.value);
      if (fontSizeValue) fontSizeValue.textContent = v;
      state.appearance.typography.fontSize = v;
      T.applyTypography(state.appearance.typography);
      saveAndSync();
    });
  }

  if (lineHeightSlider) {
    lineHeightSlider.addEventListener("input", () => {
      const v = parseFloat(lineHeightSlider.value).toFixed(2);
      if (lineHeightValue) lineHeightValue.textContent = v;
      state.appearance.typography.lineHeight = parseFloat(v);
      T.applyTypography(state.appearance.typography);
      saveAndSync();
    });
  }

  if (fontWeightSelect) {
    fontWeightSelect.addEventListener("change", () => {
      state.appearance.typography.fontWeight = fontWeightSelect.value;
      T.applyTypography(state.appearance.typography);
      saveAndSync();
    });
  }

  // ── LAYOUT CONTROLS ───────────────────────────────────────────────────────
  function setupButtonGroup(container, key) {
    if (!container) return;
    container.querySelectorAll(".btn-group-option").forEach(btn => {
      btn.addEventListener("click", () => {
        container.querySelectorAll(".btn-group-option").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.appearance[key] = btn.dataset.value;
        if (key === "density") T.applyDensity(state.appearance.density);
        if (key === "radiusPreset") T.applyRadius(state.appearance.radiusPreset);
        if (key === "borderStrength") T.applyBorderStrength(state.appearance.borderStrength);
        saveAndSync();
      });
    });
  }

  setupButtonGroup(densityGroup, "density");
  setupButtonGroup(radiusGroup, "radiusPreset");
  setupButtonGroup(borderGroup, "borderStrength");

  if (reducedMotionToggle) {
    reducedMotionToggle.addEventListener("change", () => {
      state.appearance.reducedMotion = reducedMotionToggle.checked;
      T.applyReducedMotion(state.appearance.reducedMotion);
      saveAndSync();
    });
  }

  // ── SYNC ALL CONTROLS ─────────────────────────────────────────────────────
  function syncAllControls() {
    const a = state.appearance;

    // Typography
    if (fontFamilySelect) fontFamilySelect.value = a.typography?.fontFamily || "system";
    if (fontSizeSlider) fontSizeSlider.value = a.typography?.fontSize || 13;
    if (fontSizeValue) fontSizeValue.textContent = a.typography?.fontSize || 13;
    if (lineHeightSlider) lineHeightSlider.value = a.typography?.lineHeight || 1.5;
    if (lineHeightValue) lineHeightValue.textContent = parseFloat(a.typography?.lineHeight || 1.5).toFixed(2);
    if (fontWeightSelect) fontWeightSelect.value = a.typography?.fontWeight || "normal";

    // Density
    syncButtonGroup(densityGroup, a.density || "comfortable");
    syncButtonGroup(radiusGroup, a.radiusPreset || "rounded");
    syncButtonGroup(borderGroup, a.borderStrength || "subtle");

    // Reduced motion
    if (reducedMotionToggle) reducedMotionToggle.checked = !!a.reducedMotion;

    // Color editor
    const theme = T.getThemeById(a.activeThemeId, a.customThemes);
    syncColorEditorToTheme(theme);
  }

  function syncButtonGroup(container, value) {
    if (!container) return;
    container.querySelectorAll(".btn-group-option").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.value === value);
    });
  }

  // ── CUSTOM THEME LIST ─────────────────────────────────────────────────────
  function renderCustomThemeList() {
    if (!customThemeList) return;
    customThemeList.innerHTML = "";
    const themes = state.appearance.customThemes || [];
    if (themes.length === 0) return;

    themes.forEach(theme => {
      const isActive = state.appearance.activeThemeId === theme.id;
      const row = document.createElement("div");
      row.className = `custom-theme-row${isActive ? " active-row" : ""}`;
      row.innerHTML = `
        <span class="custom-theme-row-name">${theme.emoji || "🎨"} ${escapeHtml(theme.name)}</span>
        <div class="custom-theme-actions">
          <button class="custom-theme-btn btn-select" title="Select this theme">Select</button>
          <button class="custom-theme-btn btn-rename" title="Rename">Rename</button>
          <button class="custom-theme-btn btn-dupe" title="Duplicate">Dupe</button>
          <button class="custom-theme-btn danger btn-delete" title="Delete">Delete</button>
        </div>
      `;

      row.querySelector(".btn-select").addEventListener("click", () => selectTheme(theme.id));

      row.querySelector(".btn-rename").addEventListener("click", () => {
        const nameEl = row.querySelector(".custom-theme-row-name");
        const input = document.createElement("input");
        input.type = "text";
        input.value = theme.name;
        nameEl.replaceWith(input);
        input.focus();
        input.select();
        input.addEventListener("blur", () => {
          const newName = input.value.trim() || theme.name;
          theme.name = newName;
          T.saveAppearance(state.appearance);
          renderCustomThemeList();
          renderThemeGalleries();
        });
        input.addEventListener("keydown", e => {
          if (e.key === "Enter") input.blur();
          if (e.key === "Escape") { theme.name = theme.name; input.blur(); }
        });
      });

      row.querySelector(".btn-dupe").addEventListener("click", () => {
        const dupe = { ...theme, id: "custom_" + Date.now(), name: theme.name + " (copy)" };
        state.appearance.customThemes.push(dupe);
        T.saveAppearance(state.appearance);
        renderCustomThemeList();
        renderThemeGalleries();
        showFeedback(`Duplicated "${theme.name}"`, "success");
      });

      row.querySelector(".btn-delete").addEventListener("click", () => {
        if (!confirm(`Delete theme "${theme.name}"? This cannot be undone.`)) return;
        state.appearance.customThemes = state.appearance.customThemes.filter(t => t.id !== theme.id);
        if (state.appearance.activeThemeId === theme.id) {
          state.appearance.activeThemeId = "dark";
          T.applyFullAppearance(state.appearance);
        }
        T.saveAppearance(state.appearance);
        renderCustomThemeList();
        renderThemeGalleries();
        showFeedback(`Deleted "${theme.name}"`, "info");
      });

      customThemeList.appendChild(row);
    });
  }

  // ── EXPORT / IMPORT ───────────────────────────────────────────────────────
  if (btnExportAppearance) {
    btnExportAppearance.addEventListener("click", () => {
      const json = T.exportAppearanceJSON(state.appearance);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ContextLens_Appearance_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      showFeedback("Appearance preferences exported!", "success");
    });
  }

  if (btnImportAppearance) {
    btnImportAppearance.addEventListener("click", () => importFileInput?.click());
  }

  if (importFileInput) {
    importFileInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = T.importAppearanceJSON(ev.target.result);
        if (!result.success) {
          showFeedback(`Import failed: ${result.error}`, "error");
        } else {
          state.appearance = result.data;
          T.applyFullAppearance(state.appearance);
          saveAndSync();
          syncAllControls();
          renderThemeGalleries();
          renderCustomThemeList();
          showFeedback("Appearance preferences imported successfully!", "success");
        }
        importFileInput.value = "";
      };
      reader.readAsText(file);
    });
  }

  if (btnResetAppearance) {
    btnResetAppearance.addEventListener("click", () => {
      if (!confirm("Reset all appearance settings to defaults? Your custom themes will be preserved.")) return;
      const savedCustomThemes = state.appearance.customThemes || [];
      state.appearance = { ...T.APPEARANCE_DEFAULTS, customThemes: savedCustomThemes };
      state.pendingColorOverrides = {};
      T.applyFullAppearance(state.appearance);
      saveAndSync();
      syncAllControls();
      renderThemeGalleries();
      renderCustomThemeList();
      showFeedback("Appearance reset to defaults.", "success");
    });
  }

  // ── SAVE & SYNC ───────────────────────────────────────────────────────────
  function saveAndSync() {
    T.saveAppearance(state.appearance);
    updateActiveThemeBadge();
  }

  // ── FEEDBACK ──────────────────────────────────────────────────────────────
  let feedbackTimer = null;
  function showFeedback(msg, type = "success") {
    if (!appearFeedback || !appearFeedbackText) return;
    clearTimeout(feedbackTimer);
    appearFeedback.className = `appear-feedback feedback-${type}`;
    appearFeedbackText.textContent = (type === "success" ? "✓ " : type === "error" ? "✕ " : "ℹ ") + msg;
    appearFeedback.classList.remove("hidden");
    feedbackTimer = setTimeout(() => {
      appearFeedback.classList.add("hidden");
    }, 3500);
  }

  // ── UTILITIES ─────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
});
