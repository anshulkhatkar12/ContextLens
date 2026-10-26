import json
import re
from pathlib import Path

EXTENSION_DIR = Path(__file__).parent.parent / "extension"

def test_manifest_configuration():
    manifest_path = EXTENSION_DIR / "manifest.json"
    assert manifest_path.exists(), "manifest.json must exist"
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    assert manifest["manifest_version"] == 3
    assert "storage" in manifest.get("permissions", []), "storage permission must be declared"
    assert "sidePanel" in manifest.get("permissions", []), "sidePanel permission must be declared"
    assert manifest.get("options_ui", {}).get("page") == "appearance.html", "options_ui must point to appearance.html"


def test_theme_presets_and_tokens():
    themes_js_path = EXTENSION_DIR / "themes.js"
    assert themes_js_path.exists(), "themes.js must exist"
    with open(themes_js_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Verify key constants are exported
    assert "const APPEARANCE_DEFAULTS" in content
    assert "const BUILTIN_THEMES" in content
    assert "const PERSONALIZATION_PRESETS" in content
    assert "const DENSITY_TOKENS" in content
    assert "const RADIUS_PRESETS" in content
    assert "const FONT_FAMILIES" in content

    # Verify all required built-in themes exist
    required_themes = [
        "light", "dark", "midnight", "ocean", "forest",
        "lavender", "warm", "rose", "high-contrast"
    ]
    for tid in required_themes:
        assert f'id: "{tid}"' in content or f'id: \'{tid}\'' in content, f"Theme preset {tid} missing"

    # Verify tokens across themes
    theme_matches = re.findall(
        r'{\s*id:\s*\"([^\"]+)\",\s*name:\s*\"([^\"]+)\",\s*emoji:\s*\"([^\"]+)\",\s*category:\s*\"([^\"]+)\",\s*tokens:\s*{(.*?)}',
        content,
        re.DOTALL
    )
    assert len(theme_matches) >= 9, f"Expected at least 9 built-in themes, found {len(theme_matches)}"

    # Required core token variables
    required_tokens = [
        "--bg-primary", "--bg-surface", "--bg-surface-elevated", "--bg-hover",
        "--border-subtle", "--border-focus", "--border-strong",
        "--accent-violet", "--accent-cyan", "--accent-blue",
        "--status-contradiction", "--status-contradiction-bg",
        "--status-consistent", "--status-consistent-bg",
        "--status-context", "--status-context-bg",
        "--status-insufficient", "--status-insufficient-bg",
        "--text-main", "--text-muted", "--text-dim"
    ]
    for tid, name, emoji, cat, token_block in theme_matches:
        for tok in required_tokens:
            assert f'"{tok}":' in token_block, f"Theme {tid} missing required token {tok}"


def test_personalization_presets():
    themes_js_path = EXTENSION_DIR / "themes.js"
    with open(themes_js_path, "r", encoding="utf-8") as f:
        content = f.read()

    expected_presets = ["researcher", "student", "minimalist", "night-reader", "high-contrast-preset"]
    for pid in expected_presets:
        assert f'id: "{pid}"' in content, f"Preset {pid} missing"


def test_appearance_dom_elements():
    html_path = EXTENSION_DIR / "appearance.html"
    js_path = EXTENSION_DIR / "appearance.js"

    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()
    with open(js_path, "r", encoding="utf-8") as f:
        js = f.read()

    # Verify essential interactive controls exist
    essential_ids = [
        "presets-grid",
        "theme-gallery-dark",
        "theme-gallery-light",
        "theme-gallery-accessibility",
        "theme-gallery-custom",
        "color-bg-primary",
        "color-bg-primary-hex",
        "color-accent",
        "color-accent-hex",
        "color-text-main",
        "color-text-main-hex",
        "btn-save-custom-theme",
        "btn-reset-colors",
        "font-family-select",
        "font-size-slider",
        "line-height-slider",
        "font-weight-select",
        "density-group",
        "radius-group",
        "border-group",
        "reduced-motion-toggle",
        "btn-export-appearance",
        "btn-import-appearance",
        "import-file-input",
        "btn-reset-appearance",
        "active-theme-badge",
        "custom-theme-list"
    ]
    for eid in essential_ids:
        assert f'id="{eid}"' in html, f"Element id='{eid}' must exist in appearance.html"
        assert f'"{eid}"' in js, f"Element id='{eid}' must be handled in appearance.js"


def test_quick_appearance_in_sidepanel_and_popup():
    sp_path = EXTENSION_DIR / "sidepanel.html"
    pop_path = EXTENSION_DIR / "popup.html"

    with open(sp_path, "r", encoding="utf-8") as f:
        sp_html = f.read()
    with open(pop_path, "r", encoding="utf-8") as f:
        pop_html = f.read()

    quick_ids = [
        "quick-theme-chips",
        "quick-preset-chips",
        "quick-density-control",
        "quick-radius-control",
        "quick-reduced-motion",
        "quick-strong-borders",
        "btn-open-appearance-studio"
    ]
    for qid in quick_ids:
        assert f'id="{qid}"' in sp_html, f"id='{qid}' missing in sidepanel.html"
        assert f'id="{qid}"' in pop_html, f"id='{qid}' missing in popup.html"
