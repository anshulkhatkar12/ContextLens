// ContextLens — Centralized Theme & Design Token Engine
// themes.js — imported by sidepanel.js, popup.js, and appearance.js

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT APPEARANCE SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
const APPEARANCE_DEFAULTS = {
  activeThemeId: "dark",
  customThemes: [],
  typography: {
    fontFamily: "system",
    fontSize: 13,
    lineHeight: 1.5,
    fontWeight: "normal"
  },
  density: "comfortable",
  radiusPreset: "rounded",
  reducedMotion: false,
  borderStrength: "subtle"
};

// ─────────────────────────────────────────────────────────────────────────────
// BUILT-IN THEME PRESETS
// ─────────────────────────────────────────────────────────────────────────────
const BUILTIN_THEMES = [
  // ── DARK THEMES ──
  {
    id: "dark",
    name: "Dark",
    emoji: "🌑",
    category: "dark",
    tokens: {
      "--bg-primary": "#0b0f19",
      "--bg-surface": "#111827",
      "--bg-surface-elevated": "#1a2234",
      "--bg-hover": "#1f293d",
      "--border-subtle": "rgba(255, 255, 255, 0.08)",
      "--border-focus": "rgba(139, 92, 246, 0.5)",
      "--border-strong": "rgba(255, 255, 255, 0.16)",
      "--accent-violet": "#8b5cf6",
      "--accent-violet-hover": "#7c3aed",
      "--accent-cyan": "#38bdf8",
      "--accent-blue": "#3b82f6",
      "--status-contradiction": "#f43f5e",
      "--status-contradiction-bg": "rgba(244, 63, 94, 0.12)",
      "--status-consistent": "#10b981",
      "--status-consistent-bg": "rgba(16, 185, 129, 0.12)",
      "--status-context": "#a855f7",
      "--status-context-bg": "rgba(168, 85, 247, 0.12)",
      "--status-insufficient": "#94a3b8",
      "--status-insufficient-bg": "rgba(148, 163, 184, 0.12)",
      "--text-main": "#f8fafc",
      "--text-muted": "#94a3b8",
      "--text-dim": "#64748b",
      "--scrollbar-thumb": "rgba(255, 255, 255, 0.12)",
      "--shadow-sm": "0 1px 2px rgba(0,0,0,0.3)",
      "--shadow-md": "0 4px 12px rgba(0,0,0,0.4)",
      "--shadow-glow": "0 0 20px rgba(139, 92, 246, 0.15)"
    }
  },
  {
    id: "midnight",
    name: "Midnight",
    emoji: "🌃",
    category: "dark",
    tokens: {
      "--bg-primary": "#000000",
      "--bg-surface": "#0a0a0a",
      "--bg-surface-elevated": "#111111",
      "--bg-hover": "#1a1a1a",
      "--border-subtle": "rgba(255, 255, 255, 0.06)",
      "--border-focus": "rgba(99, 102, 241, 0.6)",
      "--border-strong": "rgba(255, 255, 255, 0.12)",
      "--accent-violet": "#6366f1",
      "--accent-violet-hover": "#4f46e5",
      "--accent-cyan": "#22d3ee",
      "--accent-blue": "#60a5fa",
      "--status-contradiction": "#fb7185",
      "--status-contradiction-bg": "rgba(251, 113, 133, 0.12)",
      "--status-consistent": "#34d399",
      "--status-consistent-bg": "rgba(52, 211, 153, 0.12)",
      "--status-context": "#c084fc",
      "--status-context-bg": "rgba(192, 132, 252, 0.12)",
      "--status-insufficient": "#94a3b8",
      "--status-insufficient-bg": "rgba(148, 163, 184, 0.1)",
      "--text-main": "#f1f5f9",
      "--text-muted": "#94a3b8",
      "--text-dim": "#475569",
      "--scrollbar-thumb": "rgba(255, 255, 255, 0.08)",
      "--shadow-sm": "0 1px 2px rgba(0,0,0,0.5)",
      "--shadow-md": "0 4px 12px rgba(0,0,0,0.7)",
      "--shadow-glow": "0 0 24px rgba(99, 102, 241, 0.2)"
    }
  },
  {
    id: "ocean",
    name: "Ocean Blue",
    emoji: "🌊",
    category: "dark",
    tokens: {
      "--bg-primary": "#071523",
      "--bg-surface": "#0c1f35",
      "--bg-surface-elevated": "#112840",
      "--bg-hover": "#163352",
      "--border-subtle": "rgba(56, 189, 248, 0.12)",
      "--border-focus": "rgba(56, 189, 248, 0.6)",
      "--border-strong": "rgba(56, 189, 248, 0.25)",
      "--accent-violet": "#38bdf8",
      "--accent-violet-hover": "#0ea5e9",
      "--accent-cyan": "#67e8f9",
      "--accent-blue": "#3b82f6",
      "--status-contradiction": "#f87171",
      "--status-contradiction-bg": "rgba(248, 113, 113, 0.12)",
      "--status-consistent": "#4ade80",
      "--status-consistent-bg": "rgba(74, 222, 128, 0.12)",
      "--status-context": "#a78bfa",
      "--status-context-bg": "rgba(167, 139, 250, 0.12)",
      "--status-insufficient": "#94a3b8",
      "--status-insufficient-bg": "rgba(148, 163, 184, 0.1)",
      "--text-main": "#e0f2fe",
      "--text-muted": "#7dd3fc",
      "--text-dim": "#4e8aab",
      "--scrollbar-thumb": "rgba(56, 189, 248, 0.15)",
      "--shadow-sm": "0 1px 2px rgba(0,0,0,0.3)",
      "--shadow-md": "0 4px 16px rgba(0, 50, 100, 0.5)",
      "--shadow-glow": "0 0 20px rgba(56, 189, 248, 0.18)"
    }
  },
  {
    id: "forest",
    name: "Forest / Sage",
    emoji: "🌲",
    category: "dark",
    tokens: {
      "--bg-primary": "#0a1209",
      "--bg-surface": "#111e0f",
      "--bg-surface-elevated": "#172a14",
      "--bg-hover": "#1e3a1c",
      "--border-subtle": "rgba(74, 222, 128, 0.1)",
      "--border-focus": "rgba(74, 222, 128, 0.5)",
      "--border-strong": "rgba(74, 222, 128, 0.2)",
      "--accent-violet": "#4ade80",
      "--accent-violet-hover": "#22c55e",
      "--accent-cyan": "#86efac",
      "--accent-blue": "#6ee7b7",
      "--status-contradiction": "#f87171",
      "--status-contradiction-bg": "rgba(248, 113, 113, 0.12)",
      "--status-consistent": "#4ade80",
      "--status-consistent-bg": "rgba(74, 222, 128, 0.15)",
      "--status-context": "#a3e635",
      "--status-context-bg": "rgba(163, 230, 53, 0.12)",
      "--status-insufficient": "#86a895",
      "--status-insufficient-bg": "rgba(134, 168, 149, 0.12)",
      "--text-main": "#dcfce7",
      "--text-muted": "#86efac",
      "--text-dim": "#4a7a58",
      "--scrollbar-thumb": "rgba(74, 222, 128, 0.15)",
      "--shadow-sm": "0 1px 2px rgba(0,0,0,0.3)",
      "--shadow-md": "0 4px 12px rgba(0, 30, 10, 0.5)",
      "--shadow-glow": "0 0 20px rgba(74, 222, 128, 0.15)"
    }
  },
  {
    id: "lavender",
    name: "Lavender",
    emoji: "💜",
    category: "dark",
    tokens: {
      "--bg-primary": "#120e1e",
      "--bg-surface": "#1a1430",
      "--bg-surface-elevated": "#231b3d",
      "--bg-hover": "#2d2450",
      "--border-subtle": "rgba(196, 181, 253, 0.1)",
      "--border-focus": "rgba(196, 181, 253, 0.5)",
      "--border-strong": "rgba(196, 181, 253, 0.22)",
      "--accent-violet": "#c4b5fd",
      "--accent-violet-hover": "#a78bfa",
      "--accent-cyan": "#e879f9",
      "--accent-blue": "#818cf8",
      "--status-contradiction": "#f87171",
      "--status-contradiction-bg": "rgba(248, 113, 113, 0.12)",
      "--status-consistent": "#86efac",
      "--status-consistent-bg": "rgba(134, 239, 172, 0.12)",
      "--status-context": "#c4b5fd",
      "--status-context-bg": "rgba(196, 181, 253, 0.15)",
      "--status-insufficient": "#94a3b8",
      "--status-insufficient-bg": "rgba(148, 163, 184, 0.1)",
      "--text-main": "#f5f3ff",
      "--text-muted": "#c4b5fd",
      "--text-dim": "#7c6bad",
      "--scrollbar-thumb": "rgba(196, 181, 253, 0.15)",
      "--shadow-sm": "0 1px 2px rgba(0,0,0,0.3)",
      "--shadow-md": "0 4px 12px rgba(20, 10, 50, 0.5)",
      "--shadow-glow": "0 0 20px rgba(196, 181, 253, 0.18)"
    }
  },
  {
    id: "rose",
    name: "Rose",
    emoji: "🌹",
    category: "dark",
    tokens: {
      "--bg-primary": "#150a0a",
      "--bg-surface": "#200f0f",
      "--bg-surface-elevated": "#2d1515",
      "--bg-hover": "#3d1d1d",
      "--border-subtle": "rgba(251, 113, 133, 0.1)",
      "--border-focus": "rgba(251, 113, 133, 0.5)",
      "--border-strong": "rgba(251, 113, 133, 0.22)",
      "--accent-violet": "#fb7185",
      "--accent-violet-hover": "#f43f5e",
      "--accent-cyan": "#fda4af",
      "--accent-blue": "#f472b6",
      "--status-contradiction": "#fb7185",
      "--status-contradiction-bg": "rgba(251, 113, 133, 0.12)",
      "--status-consistent": "#86efac",
      "--status-consistent-bg": "rgba(134, 239, 172, 0.12)",
      "--status-context": "#f9a8d4",
      "--status-context-bg": "rgba(249, 168, 212, 0.12)",
      "--status-insufficient": "#94a3b8",
      "--status-insufficient-bg": "rgba(148, 163, 184, 0.1)",
      "--text-main": "#fff1f2",
      "--text-muted": "#fda4af",
      "--text-dim": "#9d5f6a",
      "--scrollbar-thumb": "rgba(251, 113, 133, 0.15)",
      "--shadow-sm": "0 1px 2px rgba(0,0,0,0.3)",
      "--shadow-md": "0 4px 12px rgba(50, 5, 10, 0.5)",
      "--shadow-glow": "0 0 20px rgba(251, 113, 133, 0.15)"
    }
  },

  // ── LIGHT THEMES ──
  {
    id: "light",
    name: "Light",
    emoji: "☀️",
    category: "light",
    tokens: {
      "--bg-primary": "#ffffff",
      "--bg-surface": "#f8fafc",
      "--bg-surface-elevated": "#f1f5f9",
      "--bg-hover": "#e2e8f0",
      "--border-subtle": "rgba(15, 23, 42, 0.08)",
      "--border-focus": "rgba(99, 102, 241, 0.5)",
      "--border-strong": "rgba(15, 23, 42, 0.18)",
      "--accent-violet": "#6366f1",
      "--accent-violet-hover": "#4f46e5",
      "--accent-cyan": "#0284c7",
      "--accent-blue": "#2563eb",
      "--status-contradiction": "#e11d48",
      "--status-contradiction-bg": "rgba(225, 29, 72, 0.08)",
      "--status-consistent": "#059669",
      "--status-consistent-bg": "rgba(5, 150, 105, 0.08)",
      "--status-context": "#7c3aed",
      "--status-context-bg": "rgba(124, 58, 237, 0.08)",
      "--status-insufficient": "#475569",
      "--status-insufficient-bg": "rgba(71, 85, 105, 0.08)",
      "--text-main": "#0f172a",
      "--text-muted": "#475569",
      "--text-dim": "#64748b",
      "--scrollbar-thumb": "rgba(15, 23, 42, 0.18)",
      "--shadow-sm": "0 1px 2px rgba(15, 23, 42, 0.06)",
      "--shadow-md": "0 4px 12px rgba(15, 23, 42, 0.08)",
      "--shadow-glow": "0 0 20px rgba(99, 102, 241, 0.1)"
    }
  },
  {
    id: "warm",
    name: "Warm Neutral",
    emoji: "🤎",
    category: "light",
    tokens: {
      "--bg-primary": "#faf8f5",
      "--bg-surface": "#f4f0eb",
      "--bg-surface-elevated": "#ede8e0",
      "--bg-hover": "#e4ddd4",
      "--border-subtle": "rgba(100, 80, 60, 0.1)",
      "--border-focus": "rgba(194, 120, 50, 0.5)",
      "--border-strong": "rgba(100, 80, 60, 0.2)",
      "--accent-violet": "#c2782e",
      "--accent-violet-hover": "#a8611f",
      "--accent-cyan": "#5b8a7a",
      "--accent-blue": "#6b7db3",
      "--status-contradiction": "#c0392b",
      "--status-contradiction-bg": "rgba(192, 57, 43, 0.08)",
      "--status-consistent": "#27643f",
      "--status-consistent-bg": "rgba(39, 100, 63, 0.08)",
      "--status-context": "#7b5ea7",
      "--status-context-bg": "rgba(123, 94, 167, 0.08)",
      "--status-insufficient": "#6b7280",
      "--status-insufficient-bg": "rgba(107, 114, 128, 0.08)",
      "--text-main": "#2c1f0e",
      "--text-muted": "#5a4832",
      "--text-dim": "#8c7760",
      "--scrollbar-thumb": "rgba(100, 80, 60, 0.18)",
      "--shadow-sm": "0 1px 2px rgba(100, 80, 60, 0.08)",
      "--shadow-md": "0 4px 12px rgba(100, 80, 60, 0.12)",
      "--shadow-glow": "0 0 20px rgba(194, 120, 50, 0.12)"
    }
  },
  {
    id: "sage-light",
    name: "Sage (Light)",
    emoji: "🌿",
    category: "light",
    tokens: {
      "--bg-primary": "#f4f8f4",
      "--bg-surface": "#e9f2ea",
      "--bg-surface-elevated": "#deebdf",
      "--bg-hover": "#d1e3d3",
      "--border-subtle": "rgba(46, 125, 50, 0.12)",
      "--border-focus": "rgba(46, 125, 50, 0.5)",
      "--border-strong": "rgba(46, 125, 50, 0.22)",
      "--accent-violet": "#2e7d32",
      "--accent-violet-hover": "#1b5e20",
      "--accent-cyan": "#00897b",
      "--accent-blue": "#1976d2",
      "--status-contradiction": "#c62828",
      "--status-contradiction-bg": "rgba(198, 40, 40, 0.08)",
      "--status-consistent": "#2e7d32",
      "--status-consistent-bg": "rgba(46, 125, 50, 0.1)",
      "--status-context": "#6a1b9a",
      "--status-context-bg": "rgba(106, 27, 154, 0.08)",
      "--status-insufficient": "#546e7a",
      "--status-insufficient-bg": "rgba(84, 110, 122, 0.08)",
      "--text-main": "#142615",
      "--text-muted": "#38543a",
      "--text-dim": "#5f7e61",
      "--scrollbar-thumb": "rgba(46, 125, 50, 0.2)",
      "--shadow-sm": "0 1px 2px rgba(46, 125, 50, 0.06)",
      "--shadow-md": "0 4px 12px rgba(46, 125, 50, 0.1)",
      "--shadow-glow": "0 0 20px rgba(46, 125, 50, 0.12)"
    }
  },
  {
    id: "ocean-breeze",
    name: "Ocean Breeze",
    emoji: "🏖️",
    category: "light",
    tokens: {
      "--bg-primary": "#f0f9ff",
      "--bg-surface": "#e0f2fe",
      "--bg-surface-elevated": "#bae6fd",
      "--bg-hover": "#7dd3fc",
      "--border-subtle": "rgba(2, 132, 199, 0.12)",
      "--border-focus": "rgba(2, 132, 199, 0.5)",
      "--border-strong": "rgba(2, 132, 199, 0.25)",
      "--accent-violet": "#0284c7",
      "--accent-violet-hover": "#0369a1",
      "--accent-cyan": "#06b6d4",
      "--accent-blue": "#2563eb",
      "--status-contradiction": "#e11d48",
      "--status-contradiction-bg": "rgba(225, 29, 72, 0.08)",
      "--status-consistent": "#059669",
      "--status-consistent-bg": "rgba(5, 150, 105, 0.1)",
      "--status-context": "#7c3aed",
      "--status-context-bg": "rgba(124, 58, 237, 0.08)",
      "--status-insufficient": "#475569",
      "--status-insufficient-bg": "rgba(71, 85, 105, 0.08)",
      "--text-main": "#0c283d",
      "--text-muted": "#1e4d6b",
      "--text-dim": "#476e8a",
      "--scrollbar-thumb": "rgba(2, 132, 199, 0.2)",
      "--shadow-sm": "0 1px 2px rgba(2, 132, 199, 0.08)",
      "--shadow-md": "0 4px 12px rgba(2, 132, 199, 0.12)",
      "--shadow-glow": "0 0 20px rgba(2, 132, 199, 0.12)"
    }
  },
  {
    id: "lavender-mist",
    name: "Lavender Mist",
    emoji: "🪻",
    category: "light",
    tokens: {
      "--bg-primary": "#faf7ff",
      "--bg-surface": "#f3e8ff",
      "--bg-surface-elevated": "#e9d5ff",
      "--bg-hover": "#d8b4fe",
      "--border-subtle": "rgba(147, 51, 234, 0.12)",
      "--border-focus": "rgba(147, 51, 234, 0.5)",
      "--border-strong": "rgba(147, 51, 234, 0.22)",
      "--accent-violet": "#7c3aed",
      "--accent-violet-hover": "#6d28d9",
      "--accent-cyan": "#c026d3",
      "--accent-blue": "#4f46e5",
      "--status-contradiction": "#e11d48",
      "--status-contradiction-bg": "rgba(225, 29, 72, 0.08)",
      "--status-consistent": "#059669",
      "--status-consistent-bg": "rgba(5, 150, 105, 0.1)",
      "--status-context": "#7c3aed",
      "--status-context-bg": "rgba(124, 58, 237, 0.12)",
      "--status-insufficient": "#64748b",
      "--status-insufficient-bg": "rgba(100, 116, 139, 0.08)",
      "--text-main": "#26153b",
      "--text-muted": "#563878",
      "--text-dim": "#8365a6",
      "--scrollbar-thumb": "rgba(124, 58, 237, 0.2)",
      "--shadow-sm": "0 1px 2px rgba(124, 58, 237, 0.06)",
      "--shadow-md": "0 4px 12px rgba(124, 58, 237, 0.1)",
      "--shadow-glow": "0 0 20px rgba(124, 58, 237, 0.12)"
    }
  },
  {
    id: "rose-blush",
    name: "Rose Blush",
    emoji: "🌸",
    category: "light",
    tokens: {
      "--bg-primary": "#fff5f6",
      "--bg-surface": "#ffe4e6",
      "--bg-surface-elevated": "#fecdd3",
      "--bg-hover": "#fda4af",
      "--border-subtle": "rgba(225, 29, 72, 0.12)",
      "--border-focus": "rgba(225, 29, 72, 0.5)",
      "--border-strong": "rgba(225, 29, 72, 0.22)",
      "--accent-violet": "#e11d48",
      "--accent-violet-hover": "#be123c",
      "--accent-cyan": "#db2777",
      "--accent-blue": "#9333ea",
      "--status-contradiction": "#e11d48",
      "--status-contradiction-bg": "rgba(225, 29, 72, 0.1)",
      "--status-consistent": "#059669",
      "--status-consistent-bg": "rgba(5, 150, 105, 0.1)",
      "--status-context": "#a21caf",
      "--status-context-bg": "rgba(162, 28, 175, 0.1)",
      "--status-insufficient": "#64748b",
      "--status-insufficient-bg": "rgba(100, 116, 139, 0.08)",
      "--text-main": "#381017",
      "--text-muted": "#6b2835",
      "--text-dim": "#995260",
      "--scrollbar-thumb": "rgba(225, 29, 72, 0.2)",
      "--shadow-sm": "0 1px 2px rgba(225, 29, 72, 0.06)",
      "--shadow-md": "0 4px 12px rgba(225, 29, 72, 0.1)",
      "--shadow-glow": "0 0 20px rgba(225, 29, 72, 0.12)"
    }
  },

  // ── ACCESSIBILITY THEMES ──
  {
    id: "high-contrast",
    name: "High Contrast (Dark)",
    emoji: "⚡",
    category: "accessibility",
    tokens: {
      "--bg-primary": "#000000",
      "--bg-surface": "#0a0a0a",
      "--bg-surface-elevated": "#141414",
      "--bg-hover": "#1f1f1f",
      "--border-subtle": "rgba(255, 255, 255, 0.25)",
      "--border-focus": "#ffff00",
      "--border-strong": "rgba(255, 255, 255, 0.6)",
      "--accent-violet": "#ffff00",
      "--accent-violet-hover": "#e6e600",
      "--accent-cyan": "#00ffff",
      "--accent-blue": "#66aaff",
      "--status-contradiction": "#ff4444",
      "--status-contradiction-bg": "rgba(255, 68, 68, 0.22)",
      "--status-consistent": "#00ff88",
      "--status-consistent-bg": "rgba(0, 255, 136, 0.2)",
      "--status-context": "#ffaa00",
      "--status-context-bg": "rgba(255, 170, 0, 0.2)",
      "--status-insufficient": "#d0d0d0",
      "--status-insufficient-bg": "rgba(200, 200, 200, 0.18)",
      "--text-main": "#ffffff",
      "--text-muted": "#f0f0f0",
      "--text-dim": "#b0b0b0",
      "--scrollbar-thumb": "rgba(255, 255, 255, 0.4)",
      "--shadow-sm": "0 1px 2px rgba(0,0,0,0.8)",
      "--shadow-md": "0 4px 12px rgba(0,0,0,0.9)",
      "--shadow-glow": "0 0 20px rgba(255, 255, 0, 0.25)"
    }
  },
  {
    id: "high-contrast-light",
    name: "High Contrast (Light)",
    emoji: "👁️",
    category: "accessibility",
    tokens: {
      "--bg-primary": "#ffffff",
      "--bg-surface": "#ffffff",
      "--bg-surface-elevated": "#f0f0f0",
      "--bg-hover": "#e4e4e4",
      "--border-subtle": "#000000",
      "--border-focus": "#0000ee",
      "--border-strong": "#000000",
      "--accent-violet": "#0000ee",
      "--accent-violet-hover": "#0000aa",
      "--accent-cyan": "#005580",
      "--accent-blue": "#0000ee",
      "--status-contradiction": "#cc0000",
      "--status-contradiction-bg": "rgba(204, 0, 0, 0.12)",
      "--status-consistent": "#007700",
      "--status-consistent-bg": "rgba(0, 119, 0, 0.12)",
      "--status-context": "#660099",
      "--status-context-bg": "rgba(102, 0, 153, 0.12)",
      "--status-insufficient": "#333333",
      "--status-insufficient-bg": "rgba(51, 51, 51, 0.12)",
      "--text-main": "#000000",
      "--text-muted": "#1a1a1a",
      "--text-dim": "#333333",
      "--scrollbar-thumb": "#000000",
      "--shadow-sm": "none",
      "--shadow-md": "0 2px 6px rgba(0,0,0,0.2)",
      "--shadow-glow": "0 0 0 2px #0000ee"
    }
  }
];: "rgba(255, 68, 68, 0.18)",
      "--status-consistent": "#00ff88",
      "--status-consistent-bg": "rgba(0, 255, 136, 0.15)",
      "--status-context": "#ffaa00",
      "--status-context-bg": "rgba(255, 170, 0, 0.15)",
      "--status-insufficient": "#aaaaaa",
      "--status-insufficient-bg": "rgba(170, 170, 170, 0.15)",
      "--text-main": "#ffffff",
      "--text-muted": "#d4d4d4",
      "--text-dim": "#888888",
      "--scrollbar-thumb": "rgba(255, 255, 255, 0.3)",
      "--shadow-sm": "0 1px 2px rgba(0,0,0,0.8)",
      "--shadow-md": "0 4px 12px rgba(0,0,0,0.9)",
      "--shadow-glow": "0 0 20px rgba(255, 255, 0, 0.2)"
    }
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// PERSONALIZATION PRESETS
// ─────────────────────────────────────────────────────────────────────────────
const PERSONALIZATION_PRESETS = [
  {
    id: "researcher",
    name: "Researcher",
    emoji: "🔬",
    description: "Structured, information-dense evidence cards",
    themeId: "dark",
    typography: { fontFamily: "system", fontSize: 12, lineHeight: 1.45, fontWeight: "normal" },
    density: "compact",
    radiusPreset: "sharp",
    reducedMotion: false,
    borderStrength: "strong"
  },
  {
    id: "student",
    name: "Student",
    emoji: "📚",
    description: "Readable typography and straightforward navigation",
    themeId: "light",
    typography: { fontFamily: "inter", fontSize: 14, lineHeight: 1.6, fontWeight: "normal" },
    density: "comfortable",
    radiusPreset: "rounded",
    reducedMotion: false,
    borderStrength: "subtle"
  },
  {
    id: "minimalist",
    name: "Minimalist",
    emoji: "◾",
    description: "Subdued colors and minimal decoration",
    themeId: "warm",
    typography: { fontFamily: "system", fontSize: 13, lineHeight: 1.5, fontWeight: "normal" },
    density: "comfortable",
    radiusPreset: "sharp",
    reducedMotion: true,
    borderStrength: "subtle"
  },
  {
    id: "night-reader",
    name: "Night Reader",
    emoji: "🌙",
    description: "Comfortable dark theme for extended reading",
    themeId: "midnight",
    typography: { fontFamily: "georgia", fontSize: 14, lineHeight: 1.65, fontWeight: "normal" },
    density: "spacious",
    radiusPreset: "rounded",
    reducedMotion: true,
    borderStrength: "subtle"
  },
  {
    id: "high-contrast-preset",
    name: "High Contrast",
    emoji: "⚡",
    description: "Enhanced text and state visibility",
    themeId: "high-contrast",
    typography: { fontFamily: "system", fontSize: 14, lineHeight: 1.55, fontWeight: "medium" },
    density: "comfortable",
    radiusPreset: "rounded",
    reducedMotion: true,
    borderStrength: "strong"
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// DENSITY & RADIUS MAPPINGS
// ─────────────────────────────────────────────────────────────────────────────
const DENSITY_TOKENS = {
  compact: {
    "--density-padding-xs": "3px",
    "--density-padding-sm": "6px",
    "--density-padding-md": "8px",
    "--density-padding-lg": "12px",
    "--density-gap": "8px",
    "--density-card-padding": "10px 12px"
  },
  comfortable: {
    "--density-padding-xs": "4px",
    "--density-padding-sm": "8px",
    "--density-padding-md": "12px",
    "--density-padding-lg": "16px",
    "--density-gap": "12px",
    "--density-card-padding": "12px 14px"
  },
  spacious: {
    "--density-padding-xs": "6px",
    "--density-padding-sm": "12px",
    "--density-padding-md": "16px",
    "--density-padding-lg": "24px",
    "--density-gap": "18px",
    "--density-card-padding": "16px 20px"
  }
};

const RADIUS_PRESETS = {
  sharp: {
    "--radius-sm": "2px",
    "--radius-md": "4px",
    "--radius-lg": "6px",
    "--radius-full": "4px"
  },
  rounded: {
    "--radius-sm": "6px",
    "--radius-md": "10px",
    "--radius-lg": "14px",
    "--radius-full": "9999px"
  },
  pill: {
    "--radius-sm": "10px",
    "--radius-md": "16px",
    "--radius-lg": "24px",
    "--radius-full": "9999px"
  }
};

const FONT_FAMILIES = {
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  inter: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  roboto: "'Roboto', -apple-system, BlinkMacSystemFont, sans-serif",
  georgia: "Georgia, 'Times New Roman', Times, serif",
  mono: "'SF Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace"
};

// ─────────────────────────────────────────────────────────────────────────────
// THEME ENGINE — Apply tokens to document
// ─────────────────────────────────────────────────────────────────────────────
function getThemeById(themeId, customThemes = []) {
  const builtin = BUILTIN_THEMES.find(t => t.id === themeId);
  if (builtin) return builtin;
  const custom = customThemes.find(t => t.id === themeId);
  return custom || BUILTIN_THEMES.find(t => t.id === "dark");
}

function applyThemeTokens(theme) {
  const root = document.documentElement;
  Object.entries(theme.tokens).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

function applyDensity(density = "comfortable") {
  const tokens = DENSITY_TOKENS[density] || DENSITY_TOKENS.comfortable;
  const root = document.documentElement;
  Object.entries(tokens).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  document.documentElement.setAttribute("data-density", density);
}

function applyRadius(radiusPreset = "rounded") {
  const tokens = RADIUS_PRESETS[radiusPreset] || RADIUS_PRESETS.rounded;
  const root = document.documentElement;
  Object.entries(tokens).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

function applyTypography(typography = {}) {
  const root = document.documentElement;
  const { fontFamily = "system", fontSize = 13, lineHeight = 1.5, fontWeight = "normal" } = typography;

  const fontStack = FONT_FAMILIES[fontFamily] || FONT_FAMILIES.system;
  root.style.setProperty("--font-family", fontStack);
  root.style.setProperty("--font-size-base", `${Math.min(22, Math.max(10, fontSize))}px`);
  root.style.setProperty("--line-height-base", `${lineHeight}`);
  root.style.setProperty("--font-weight-base", fontWeight === "medium" ? "500" : "400");

  document.body.style.fontFamily = fontStack;
  document.body.style.fontSize = `${Math.min(22, Math.max(10, fontSize))}px`;
  document.body.style.lineHeight = `${lineHeight}`;
}

function applyReducedMotion(enabled = false) {
  document.documentElement.setAttribute("data-reduced-motion", enabled ? "true" : "false");
}

function applyBorderStrength(strength = "subtle") {
  document.documentElement.setAttribute("data-border-strength", strength);
}

function applyFullAppearance(appearance, customThemes = []) {
  if (!appearance) return;
  const theme = getThemeById(appearance.activeThemeId || "dark", customThemes || appearance.customThemes || []);
  applyThemeTokens(theme);
  applyDensity(appearance.density || "comfortable");
  applyRadius(appearance.radiusPreset || "rounded");
  applyTypography(appearance.typography || {});
  applyReducedMotion(appearance.reducedMotion || false);
  applyBorderStrength(appearance.borderStrength || "subtle");
}

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function loadAppearance(callback) {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["appearance"], (localResult) => {
      const localApp = (localResult && localResult.appearance) || {};
      if (chrome.storage.sync) {
        chrome.storage.sync.get(["appearance"], (syncResult) => {
          const syncApp = (syncResult && syncResult.appearance) || {};
          // Merge: sync settings take precedence for UI preferences,
          // but custom themes are preserved from local
          const merged = {
            ...localApp,
            ...syncApp,
            customThemes: Array.isArray(localApp.customThemes) && localApp.customThemes.length > 0
              ? localApp.customThemes
              : (Array.isArray(syncApp.customThemes) ? syncApp.customThemes : [])
          };
          const validated = validateAppearance(merged);
          if (callback) callback(validated);
        });
      } else {
        const validated = validateAppearance(localApp);
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
    const syncData = {
      activeThemeId: validated.activeThemeId,
      typography: validated.typography,
      density: validated.density,
      radiusPreset: validated.radiusPreset,
      reducedMotion: validated.reducedMotion,
      borderStrength: validated.borderStrength
    };
    const localData = {
      appearance: validated
    };

    chrome.storage.local.set(localData, () => {
      if (chrome.storage.sync) {
        try {
          chrome.storage.sync.set({ appearance: syncData }, () => {
            if (callback) callback(validated);
          });
        } catch (err) {
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

  const defaults = APPEARANCE_DEFAULTS;
  return {
    activeThemeId: typeof raw.activeThemeId === "string" ? raw.activeThemeId : defaults.activeThemeId,
    customThemes: Array.isArray(raw.customThemes) ? raw.customThemes.filter(isValidCustomTheme) : [],
    typography: {
      fontFamily: ["system", "inter", "roboto", "georgia", "mono"].includes(raw.typography?.fontFamily)
        ? raw.typography.fontFamily : defaults.typography.fontFamily,
      fontSize: typeof raw.typography?.fontSize === "number"
        ? Math.min(22, Math.max(10, raw.typography.fontSize)) : defaults.typography.fontSize,
      lineHeight: typeof raw.typography?.lineHeight === "number"
        ? Math.min(2.5, Math.max(1.0, raw.typography.lineHeight)) : defaults.typography.lineHeight,
      fontWeight: ["normal", "medium"].includes(raw.typography?.fontWeight)
        ? raw.typography.fontWeight : defaults.typography.fontWeight
    },
    density: ["compact", "comfortable", "spacious"].includes(raw.density) ? raw.density : defaults.density,
    radiusPreset: ["sharp", "rounded", "pill"].includes(raw.radiusPreset) ? raw.radiusPreset : defaults.radiusPreset,
    reducedMotion: typeof raw.reducedMotion === "boolean" ? raw.reducedMotion : defaults.reducedMotion,
    borderStrength: ["subtle", "strong"].includes(raw.borderStrength) ? raw.borderStrength : defaults.borderStrength
  };
}

function isValidCustomTheme(theme) {
  return (
    theme &&
    typeof theme.id === "string" && theme.id.length > 0 &&
    typeof theme.name === "string" && theme.name.length > 0 &&
    typeof theme.tokens === "object" &&
    Object.keys(theme.tokens).length > 0 &&
    !BUILTIN_THEMES.some(b => b.id === theme.id)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM THEME CRUD
// ─────────────────────────────────────────────────────────────────────────────
function createCustomThemeFromCurrent(name, currentTokenOverrides, baseThemeId = "dark") {
  const base = getThemeById(baseThemeId);
  return {
    id: "custom_" + Date.now(),
    name: name.trim() || "My Theme",
    emoji: "🎨",
    category: "custom",
    baseThemeId: baseThemeId,
    tokens: { ...base.tokens, ...currentTokenOverrides },
    createdAt: new Date().toISOString()
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRAST CHECKER (WCAG AA approximation)
// ─────────────────────────────────────────────────────────────────────────────
function hexToRgb(hex) {
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
// EXPORT / IMPORT
// ─────────────────────────────────────────────────────────────────────────────
function exportAppearanceJSON(appearance) {
  return JSON.stringify({
    __contextlens_schema: "appearance_v1",
    exportedAt: new Date().toISOString(),
    ...appearance
  }, null, 2);
}

function importAppearanceJSON(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.__contextlens_schema !== "appearance_v1") {
      throw new Error("Invalid schema. Expected __contextlens_schema: 'appearance_v1'.");
    }
    return { success: true, data: validateAppearance(parsed) };
  } catch (err) {
    return { success: false, error: err.message || "Invalid JSON format." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS (available globally when script is loaded)
// ─────────────────────────────────────────────────────────────────────────────
window.ContextLensThemes = {
  BUILTIN_THEMES,
  PERSONALIZATION_PRESETS,
  DENSITY_TOKENS,
  RADIUS_PRESETS,
  FONT_FAMILIES,
  APPEARANCE_DEFAULTS,
  getThemeById,
  applyThemeTokens,
  applyDensity,
  applyRadius,
  applyTypography,
  applyReducedMotion,
  applyBorderStrength,
  applyFullAppearance,
  loadAppearance,
  saveAppearance,
  validateAppearance,
  createCustomThemeFromCurrent,
  contrastRatio,
  checkContrastWCAG,
  hexToRgb,
  exportAppearanceJSON,
  importAppearanceJSON,
  isValidCustomTheme
};
