// ContextLens — Appearance Page Controller
// appearance.js — handles theme gallery selection and reduced-motion toggle

document.addEventListener("DOMContentLoaded", () => {
  const T = window.ContextLensThemes;
  if (!T) return;

  // ── STATE ─────────────────────────────────────────────────────────────────
  let state = {
    appearance: { ...T.APPEARANCE_DEFAULTS }
  };

  // ── DOM REFS ───────────────────────────────────────────────────────────────
  const activeThemeBadge = document.getElementById("active-theme-badge");
  const defaultThemeContainer = document.getElementById("theme-gallery-default");
  const darkThemeGallery = document.getElementById("theme-gallery-dark");
  const reducedMotionToggle = document.getElementById("reduced-motion-toggle");
  const btnBackSidepanel = document.getElementById("btn-back-sidepanel");

  // ── INIT ──────────────────────────────────────────────────────────────────
  T.loadAppearance((saved) => {
    state.appearance = saved || { ...T.APPEARANCE_DEFAULTS };
    T.applyFullAppearance(state.appearance);
    syncControls();
    renderThemeGallery();
  });

  // Storage listener — keep in sync with sidepanel/popup changes
  if (typeof chrome !== "undefined" && chrome.storage) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if ((area === "local" || area === "sync") && changes.appearance) {
        const newVal = T.validateAppearance(changes.appearance.newValue);
        state.appearance = newVal;
        T.applyFullAppearance(state.appearance);
        syncControls();
        renderThemeGallery();
      }
    });
  }

  // ── BACK BUTTON ───────────────────────────────────────────────────────────
  if (btnBackSidepanel) {
    btnBackSidepanel.addEventListener("click", () => {
      if (typeof chrome !== "undefined" && chrome.tabs) {
        // Try closing this options tab or focus existing sidepanel
        window.close();
      } else {
        window.history.back();
      }
    });
  }

  // ── REDUCED MOTION TOGGLE ─────────────────────────────────────────────────
  if (reducedMotionToggle) {
    reducedMotionToggle.addEventListener("change", (e) => {
      state.appearance.reducedMotion = e.target.checked;
      T.applyReducedMotion(state.appearance.reducedMotion);
      T.saveAppearance(state.appearance);
    });
  }

  // ── SYNC CONTROLS ─────────────────────────────────────────────────────────
  function syncControls() {
    const activeTheme = T.getThemeById(state.appearance.activeThemeId);
    if (activeThemeBadge) {
      activeThemeBadge.textContent = activeTheme.name;
    }
    if (reducedMotionToggle) {
      reducedMotionToggle.checked = !!state.appearance.reducedMotion;
    }
  }

  // ── RENDER THEME GALLERY ───────────────────────────────────────────────────
  function renderThemeGallery() {
    const activeId = state.appearance.activeThemeId || "lavender";

    // 1. Render Lavender Default Theme Card
    if (defaultThemeContainer) {
      defaultThemeContainer.innerHTML = "";
      const lavenderTheme = T.BUILTIN_THEMES.find(t => t.id === "lavender") || T.BUILTIN_THEMES[0];
      const isSelected = activeId === lavenderTheme.id;

      const card = document.createElement("div");
      card.className = `default-theme-card ${isSelected ? "selected" : ""}`;
      card.setAttribute("role", "radio");
      card.setAttribute("aria-checked", isSelected ? "true" : "false");
      card.setAttribute("tabindex", "0");
      card.title = `${lavenderTheme.name} (Default Light Theme)`;

      card.innerHTML = `
        <div class="theme-card-glow-layer"></div>
        <div class="theme-card-inner">
          <div class="theme-visual-preview" style="background: ${lavenderTheme.previewGradient}">
            <div class="preview-mini-glass">
              <span class="preview-mini-dot" style="background: ${lavenderTheme.accentColor}"></span>
              <span class="preview-mini-line"></span>
            </div>
          </div>
          <div class="theme-card-details">
            <div class="theme-card-header">
              <span class="theme-card-name">${escapeHtml(lavenderTheme.name)}</span>
              <span class="theme-badge-default">Default</span>
            </div>
            <p class="theme-card-desc">${escapeHtml(lavenderTheme.description)}</p>
          </div>
          <div class="theme-selection-indicator" aria-hidden="true">
            <svg class="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>
      `;

      const selectLavender = () => {
        state.appearance.activeThemeId = lavenderTheme.id;
        T.applyFullAppearance(state.appearance);
        T.saveAppearance(state.appearance);
        syncControls();
        renderThemeGallery();
      };

      card.addEventListener("click", selectLavender);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectLavender();
        }
      });

      defaultThemeContainer.appendChild(card);
    }

    // 2. Render Curated Dark Themes
    if (darkThemeGallery) {
      darkThemeGallery.innerHTML = "";
      const darkThemes = T.BUILTIN_THEMES.filter(t => t.category === "dark");

      darkThemes.forEach((theme) => {
        const isSelected = activeId === theme.id;
        const card = document.createElement("div");
        card.className = `dark-theme-card ${isSelected ? "selected" : ""}`;
        card.setAttribute("role", "radio");
        card.setAttribute("aria-checked", isSelected ? "true" : "false");
        card.setAttribute("tabindex", "0");
        card.title = `${theme.name} (Dark Theme)`;

        card.innerHTML = `
          <div class="theme-card-glow-layer" style="--card-glow-color: ${theme.tokens['--accent-violet']}"></div>
          <div class="theme-visual-preview" style="background: ${theme.previewGradient}">
            <div class="preview-mini-glass">
              <span class="preview-mini-dot" style="background: ${theme.accentColor}"></span>
              <span class="preview-mini-line"></span>
            </div>
          </div>
          <div class="dark-card-content">
            <div class="theme-card-header">
              <span class="theme-card-name">${escapeHtml(theme.name)}</span>
            </div>
            <p class="theme-card-desc">${escapeHtml(theme.description)}</p>
          </div>
          <div class="theme-selection-indicator" aria-hidden="true">
            <svg class="check-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        `;

        const selectTheme = () => {
          state.appearance.activeThemeId = theme.id;
          T.applyFullAppearance(state.appearance);
          T.saveAppearance(state.appearance);
          syncControls();
          renderThemeGallery();
        };

        card.addEventListener("click", selectTheme);
        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            selectTheme();
          }
        });

        darkThemeGallery.appendChild(card);
      });
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
});
