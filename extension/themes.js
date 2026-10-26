// ContextLens — Centralized Theme & Design Token Engine
// themes.js — imported by sidepanel.js, popup.html, and appearance.html

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT APPEARANCE SETTINGS (Lavender is default on fresh installation)
// ─────────────────────────────────────────────────────────────────────────────
const APPEARANCE_DEFAULTS = {
  activeThemeId: "lavender",
  reducedMotion: false
};

// ─────────────────────────────────────────────────────────────────────────────
// BUILT-IN CURATED THEMES
// 1 Lavender Glass (Default) + 5 Curated Dark Themes
// ─────────────────────────────────────────────────────────────────────────────
const BUILTIN_THEMES = [
  // ── DEFAULT THEME: LAVENDER GLASS ──
  {
    id: "lavender",
    name: "Lavender Glass",
    category: "light",
    description: "Frosted lavender-white glass with soft lilac gradients and ambient purple glow",
    previewGradient: "linear-gradient(135deg, #f8f6fc 0%, #ede9fe 100%)",
    accentColor: "#7c3aed",
    tokens: {
      "--bg-primary": "#f8f6fc",
      "--bg-surface": "rgba(255, 255, 255, 0.72)",
      "--bg-surface-elevated": "rgba(255, 255, 255, 0.90)",
      "--bg-hover": "rgba(243, 238, 255, 0.85)",
      "--bg-glass": "rgba(255, 255, 255, 0.65)",
      "--border-subtle": "rgba(167, 139, 250, 0.22)",
      "--border-focus": "rgba(124, 58, 237, 0.6)",
      "--border-strong": "rgba(147, 51, 234, 0.38)",
      "--accent-violet": "#7c3aed",
      "--accent-violet-hover": "#6d28d9",
      "--accent-cyan": "#8b5cf6",
      "--accent-blue": "#6366f1",
      "--status-contradiction": "#dc2626",
      "--status-contradiction-bg": "rgba(220, 38, 38, 0.08)",
      "--status-consistent": "#059669",
      "--status-consistent-bg": "rgba(5, 150, 105, 0.08)",
      "--status-context": "#7c3aed",
      "--status-context-bg": "rgba(124, 58, 237, 0.08)",
      "--status-insufficient": "#475569",
      "--status-insufficient-bg": "rgba(71, 85, 105, 0.08)",
      "--text-main": "#1e1b2e",
      "--text-muted": "#574e6d",
      "--text-dim": "#867a9e",
      "--scrollbar-thumb": "rgba(139, 92, 246, 0.22)",
      "--shadow-sm": "0 2px 8px rgba(124, 58, 237, 0.05)",
      "--shadow-md": "0 8px 24px rgba(124, 58, 237, 0.08)",
      "--shadow-glow": "0 0 28px rgba(167, 139, 250, 0.22)",
      "--glass-blur": "blur(16px)"
    }
  },

  // ── CURATED DARK THEME 1: MIDNIGHT ──
  {
    id: "midnight",
    name: "Midnight",
    category: "dark",
    description: "Deep oceanic navy surfaces, muted cyan accents, subtle blue glow",
    previewGradient: "linear-gradient(135deg, #060913 0%, #1e293b 100%)",
    accentColor: "#38bdf8",
    tokens: {
      "--bg-primary": "#060913",
      "--bg-surface": "rgba(11, 18, 33, 0.78)",
      "--bg-surface-elevated": "rgba(16, 26, 48, 0.88)",
      "--bg-hover": "rgba(27, 42, 74, 0.65)",
      "--bg-glass": "rgba(11, 18, 33, 0.65)",
      "--border-subtle": "rgba(96, 165, 250, 0.14)",
      "--border-focus": "rgba(56, 189, 248, 0.6)",
      "--border-strong": "rgba(96, 165, 250, 0.28)",
      "--accent-violet": "#38bdf8",
      "--accent-violet-hover": "#0ea5e9",
      "--accent-cyan": "#67e8f9",
      "--accent-blue": "#60a5fa",
      "--status-contradiction": "#f87171",
      "--status-contradiction-bg": "rgba(248, 113, 113, 0.14)",
      "--status-consistent": "#34d399",
      "--status-consistent-bg": "rgba(52, 211, 153, 0.14)",
      "--status-context": "#818cf8",
      "--status-context-bg": "rgba(129, 140, 248, 0.14)",
      "--status-insufficient": "#94a3b8",
      "--status-insufficient-bg": "rgba(148, 163, 184, 0.12)",
      "--text-main": "#f1f5f9",
      "--text-muted": "#94a3b8",
      "--text-dim": "#52637a",
      "--scrollbar-thumb": "rgba(56, 189, 248, 0.2)",
      "--shadow-sm": "0 2px 8px rgba(0, 0, 0, 0.4)",
      "--shadow-md": "0 8px 24px rgba(0, 0, 0, 0.6)",
      "--shadow-glow": "0 0 28px rgba(56, 189, 248, 0.18)",
      "--glass-blur": "blur(16px)"
    }
  },

  // ── CURATED DARK THEME 2: CRIMSON GLASS ──
  {
    id: "crimson",
    name: "Crimson Glass",
    category: "dark",
    description: "Near-black surfaces, burgundy undertones, restrained rose glass accents",
    previewGradient: "linear-gradient(135deg, #0e0608 0%, #3f121d 100%)",
    accentColor: "#f43f5e",
    tokens: {
      "--bg-primary": "#0e0608",
      "--bg-surface": "rgba(28, 13, 18, 0.78)",
      "--bg-surface-elevated": "rgba(42, 19, 27, 0.88)",
      "--bg-hover": "rgba(62, 27, 39, 0.65)",
      "--bg-glass": "rgba(28, 13, 18, 0.65)",
      "--border-subtle": "rgba(244, 63, 94, 0.16)",
      "--border-focus": "rgba(244, 63, 94, 0.6)",
      "--border-strong": "rgba(244, 63, 94, 0.32)",
      "--accent-violet": "#f43f5e",
      "--accent-violet-hover": "#e11d48",
      "--accent-cyan": "#fda4af",
      "--accent-blue": "#fb7185",
      "--status-contradiction": "#fb7185",
      "--status-contradiction-bg": "rgba(251, 113, 133, 0.16)",
      "--status-consistent": "#34d399",
      "--status-consistent-bg": "rgba(52, 211, 153, 0.14)",
      "--status-context": "#f472b6",
      "--status-context-bg": "rgba(244, 114, 182, 0.14)",
      "--status-insufficient": "#a1a1aa",
      "--status-insufficient-bg": "rgba(161, 161, 170, 0.12)",
      "--text-main": "#fff1f2",
      "--text-muted": "#fda4af",
      "--text-dim": "#9b6570",
      "--scrollbar-thumb": "rgba(244, 63, 94, 0.22)",
      "--shadow-sm": "0 2px 8px rgba(0, 0, 0, 0.45)",
      "--shadow-md": "0 8px 24px rgba(0, 0, 0, 0.65)",
      "--shadow-glow": "0 0 28px rgba(244, 63, 94, 0.2)",
      "--glass-blur": "blur(16px)"
    }
  },

  // ── CURATED DARK THEME 3: EMERALD GLASS ──
  {
    id: "emerald",
    name: "Emerald Glass",
    category: "dark",
    description: "Deep forest green glass, serene botanical atmosphere, muted mint highlights",
    previewGradient: "linear-gradient(135deg, #050e09 0%, #133320 100%)",
    accentColor: "#34d399",
    tokens: {
      "--bg-primary": "#050e09",
      "--bg-surface": "rgba(10, 27, 17, 0.78)",
      "--bg-surface-elevated": "rgba(16, 40, 26, 0.88)",
      "--bg-hover": "rgba(25, 59, 39, 0.65)",
      "--bg-glass": "rgba(10, 27, 17, 0.65)",
      "--border-subtle": "rgba(52, 211, 153, 0.16)",
      "--border-focus": "rgba(52, 211, 153, 0.6)",
      "--border-strong": "rgba(52, 211, 153, 0.32)",
      "--accent-violet": "#34d399",
      "--accent-violet-hover": "#10b981",
      "--accent-cyan": "#6ee7b7",
      "--accent-blue": "#a7f3d0",
      "--status-contradiction": "#f87171",
      "--status-contradiction-bg": "rgba(248, 113, 113, 0.15)",
      "--status-consistent": "#34d399",
      "--status-consistent-bg": "rgba(52, 211, 153, 0.15)",
      "--status-context": "#6ee7b7",
      "--status-context-bg": "rgba(110, 231, 183, 0.14)",
      "--status-insufficient": "#94a3b8",
      "--status-insufficient-bg": "rgba(148, 163, 184, 0.12)",
      "--text-main": "#f0fdf4",
      "--text-muted": "#a7f3d0",
      "--text-dim": "#577c68",
      "--scrollbar-thumb": "rgba(52, 211, 153, 0.2)",
      "--shadow-sm": "0 2px 8px rgba(0, 0, 0, 0.4)",
      "--shadow-md": "0 8px 24px rgba(0, 0, 0, 0.6)",
      "--shadow-glow": "0 0 28px rgba(52, 211, 153, 0.2)",
      "--glass-blur": "blur(16px)"
    }
  },

  // ── CURATED DARK THEME 4: AMETHYST ──
  {
    id: "amethyst",
    name: "Amethyst",
    category: "dark",
    description: "Deep violet surfaces with luminous purple highlights and restrained ultraviolet glow",
    previewGradient: "linear-gradient(135deg, #0e0919 0%, #2e1065 100%)",
    accentColor: "#c084fc",
    tokens: {
      "--bg-primary": "#0e0919",
      "--bg-surface": "rgba(23, 14, 40, 0.78)",
      "--bg-surface-elevated": "rgba(34, 21, 58, 0.88)",
      "--bg-hover": "rgba(50, 31, 84, 0.65)",
      "--bg-glass": "rgba(23, 14, 40, 0.65)",
      "--border-subtle": "rgba(168, 85, 247, 0.18)",
      "--border-focus": "rgba(168, 85, 247, 0.6)",
      "--border-strong": "rgba(168, 85, 247, 0.35)",
      "--accent-violet": "#c084fc",
      "--accent-violet-hover": "#a855f7",
      "--accent-cyan": "#e879f9",
      "--accent-blue": "#818cf8",
      "--status-contradiction": "#f87171",
      "--status-contradiction-bg": "rgba(248, 113, 113, 0.15)",
      "--status-consistent": "#4ade80",
      "--status-consistent-bg": "rgba(74, 222, 128, 0.14)",
      "--status-context": "#c084fc",
      "--status-context-bg": "rgba(192, 132, 252, 0.15)",
      "--status-insufficient": "#a1a1aa",
      "--status-insufficient-bg": "rgba(161, 161, 170, 0.12)",
      "--text-main": "#faf5ff",
      "--text-muted": "#d8b4fe",
      "--text-dim": "#8f73aa",
      "--scrollbar-thumb": "rgba(168, 85, 247, 0.22)",
      "--shadow-sm": "0 2px 8px rgba(0, 0, 0, 0.45)",
      "--shadow-md": "0 8px 24px rgba(0, 0, 0, 0.65)",
      "--shadow-glow": "0 0 28px rgba(168, 85, 247, 0.22)",
      "--glass-blur": "blur(16px)"
    }
  },

  // ── CURATED DARK THEME 5: CARBON ──
  {
    id: "carbon",
    name: "Carbon",
    category: "dark",
    description: "Minimal charcoal and graphite surfaces with neutral silver highlights",
    previewGradient: "linear-gradient(135deg, #0e1014 0%, #334155 100%)",
    accentColor: "#cbd5e1",
    tokens: {
      "--bg-primary": "#0e1014",
      "--bg-surface": "rgba(21, 24, 30, 0.8)",
      "--bg-surface-elevated": "rgba(31, 35, 44, 0.9)",
      "--bg-hover": "rgba(45, 51, 63, 0.65)",
      "--bg-glass": "rgba(21, 24, 30, 0.65)",
      "--border-subtle": "rgba(255, 255, 255, 0.1)",
      "--border-focus": "rgba(226, 232, 240, 0.6)",
      "--border-strong": "rgba(255, 255, 255, 0.22)",
      "--accent-violet": "#e2e8f0",
      "--accent-violet-hover": "#cbd5e1",
      "--accent-cyan": "#94a3b8",
      "--accent-blue": "#cbd5e1",
      "--status-contradiction": "#f87171",
      "--status-contradiction-bg": "rgba(248, 113, 113, 0.14)",
      "--status-consistent": "#34d399",
      "--status-consistent-bg": "rgba(52, 211, 153, 0.14)",
      "--status-context": "#cbd5e1",
      "--status-context-bg": "rgba(203, 213, 225, 0.14)",
      "--status-insufficient": "#94a3b8",
      "--status-insufficient-bg": "rgba(148, 163, 184, 0.12)",
      "--text-main": "#f8fafc",
      "--text-muted": "#94a3b8",
      "--text-dim": "#64748b",
      "--scrollbar-thumb": "rgba(255, 255, 255, 0.18)",
      "--shadow-sm": "0 2px 8px rgba(0, 0, 0, 0.5)",
      "--shadow-md": "0 8px 24px rgba(0, 0, 0, 0.7)",
      "--shadow-glow": "0 0 28px rgba(226, 232, 240, 0.14)",
      "--glass-blur": "blur(16px)"
    }
  }
];

// Compatibility aliases for legacy stored values
const THEME_ALIASES = {
  "dark": "midnight",
  "light": "lavender",
  "forest": "emerald",
  "rose": "crimson",
  "ocean": "midnight",
  "warm": "lavender",
  "sage-light": "emerald",
  "ocean-breeze": "midnight",
  "lavender-mist": "lavender",
  "rose-blush": "crimson",
  "high-contrast": "carbon",
  "high-contrast-light": "lavender"
};

// ─────────────────────────────────────────────────────────────────────────────
// THEME ENGINE
// ─────────────────────────────────────────────────────────────────────────────
function getThemeById(themeId) {
  if (!themeId) return BUILTIN_THEMES[0]; // lavender default
  const cleanId = THEME_ALIASES[themeId] || themeId;
  const theme = BUILTIN_THEMES.find(t => t.id === cleanId);
  return theme || BUILTIN_THEMES[0]; // fallback to lavender
}

function applyThemeTokens(theme) {
  if (!theme || !theme.tokens) return;
  const root = document.documentElement;
  Object.entries(theme.tokens).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  root.setAttribute("data-theme", theme.id);
  root.setAttribute("data-theme-category", theme.category || "dark");
}

function applyReducedMotion(enabled = false) {
  document.documentElement.setAttribute("data-reduced-motion", enabled ? "true" : "false");
}

function applyFullAppearance(appearance) {
  if (!appearance) return;
  const theme = getThemeById(appearance.activeThemeId || "lavender");
  applyThemeTokens(theme);
  applyReducedMotion(appearance.reducedMotion || false);
}

// Stubs for backward compatibility
function applyDensity() {}
function applyRadius() {}
function applyTypography() {}
function applyBorderStrength() {}

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE HELPERS (chrome.storage.local & sync with fallback)
// ─────────────────────────────────────────────────────────────────────────────
function loadAppearance(callback) {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["appearance"], (localResult) => {
      const localApp = (localResult && localResult.appearance) || {};
      if (chrome.storage.sync) {
        chrome.storage.sync.get(["appearance"], (syncResult) => {
          const syncApp = (syncResult && syncResult.appearance) || {};
          const merged = { ...APPEARANCE_DEFAULTS, ...localApp, ...syncApp };
          const validated = validateAppearance(merged);
          if (callback) callback(validated);
        });
      } else {
        const merged = { ...APPEARANCE_DEFAULTS, ...localApp };
        const validated = validateAppearance(merged);
        if (callback) callback(validated);
      }
    });
  } else if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = window.localStorage.getItem("contextlens_appearance");
      const parsed = raw ? JSON.parse(raw) : null;
      if (callback) callback(validateAppearance(parsed));
    } catch (e) {
      if (callback) callback(validateAppearance(null));
    }
  } else {
    if (callback) callback(validateAppearance(null));
  }
}

function saveAppearance(appearance, callback) {
  const validated = validateAppearance(appearance);
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    const data = {
      appearance: {
        activeThemeId: validated.activeThemeId,
        reducedMotion: validated.reducedMotion
      }
    };
    chrome.storage.local.set(data, () => {
      if (chrome.storage.sync) {
        try {
          chrome.storage.sync.set(data, () => {
            if (callback) callback(validated);
          });
        } catch (_) {
          if (callback) callback(validated);
        }
      } else {
        if (callback) callback(validated);
      }
    });
  } else if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem("contextlens_appearance", JSON.stringify(validated));
    } catch (e) {
      console.warn("Failed to save to localStorage", e);
    }
    if (callback) callback(validated);
  } else {
    if (callback) callback(validated);
  }
}

function validateAppearance(raw) {
  if (!raw || typeof raw !== "object") return { ...APPEARANCE_DEFAULTS };

  let activeThemeId = "lavender";
  if (typeof raw.activeThemeId === "string") {
    const mapped = THEME_ALIASES[raw.activeThemeId] || raw.activeThemeId;
    if (BUILTIN_THEMES.some(t => t.id === mapped)) {
      activeThemeId = mapped;
    }
  }

  const reducedMotion = typeof raw.reducedMotion === "boolean" ? raw.reducedMotion : false;

  return {
    activeThemeId,
    reducedMotion
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCESSIBILITY / CONTRAST UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  if (!hex || typeof hex !== "string") return null;
  const clean = hex.replace(/^#/, "");
  const expanded = clean.length === 3
    ? clean.split("").map(c => c + c).join("")
    : clean;
  const r = parseInt(expanded.substr(0, 2), 16);
  const g = parseInt(expanded.substr(2, 2), 16);
  const b = parseInt(expanded.substr(4, 2), 16);
  return isNaN(r) ? null : { r, g, b };
}

function relativeLuminance({ r, g, b }) {
  const sRGB = [r, g, b].map(c => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

function contrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return null;
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function checkContrastWCAG(fgHex, bgHex) {
  const ratio = contrastRatio(fgHex, bgHex);
  if (!ratio) return { ratio: null, level: "unknown" };
  if (ratio >= 7) return { ratio, level: "AAA" };
  if (ratio >= 4.5) return { ratio, level: "AA" };
  if (ratio >= 3) return { ratio, level: "AA-large" };
  return { ratio, level: "fail" };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS (Global scope for extension scripts)
// ─────────────────────────────────────────────────────────────────────────────
window.ContextLensThemes = {
  BUILTIN_THEMES,
  APPEARANCE_DEFAULTS,
  THEME_ALIASES,
  getThemeById,
  applyThemeTokens,
  applyReducedMotion,
  applyFullAppearance,
  loadAppearance,
  saveAppearance,
  validateAppearance,
  contrastRatio,
  checkContrastWCAG,
  hexToRgb,
  // Stubs for backward-compatible call sites
  applyDensity,
  applyRadius,
  applyTypography,
  applyBorderStrength
};
