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


def test_lavender_default_and_curated_dark_themes():
    themes_js_path = EXTENSION_DIR / "themes.js"
    assert themes_js_path.exists(), "themes.js must exist"
    with open(themes_js_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Verify key constants are exported
    assert "const APPEARANCE_DEFAULTS" in content
    assert "const BUILTIN_THEMES" in content
    assert 'activeThemeId: "lavender"' in content, "Default theme on fresh install must be lavender"

    # Verify the curated themes (Lavender default + dark and special themes)
    curated_themes = ["lavender", "midnight", "crimson", "emerald", "amethyst", "carbon", "catoo"]
    for tid in curated_themes:
        assert f'id: "{tid}"' in content or f'id: \'{tid}\'', f"Curated theme {tid} missing"

    # Required core token variables across themes
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
    for tid in curated_themes:
        assert f'id: "{tid}"' in content
        # Check that tokens block for each theme contains required variables
        for tok in required_tokens:
            assert f'"{tok}":' in content, f"Missing token {tok}"


def test_zero_emojis_in_interface():
    """Verify that all emojis have been removed from the extension interface."""
    emoji_pattern = re.compile(r'[\U00010000-\U0010ffff\u2600-\u26ff\u2700-\u27bf]')
    files_to_check = [
        "appearance.html", "appearance.js", "sidepanel.html",
        "sidepanel.js", "popup.html", "themes.js", "content.js"
    ]
    for filename in files_to_check:
        filepath = EXTENSION_DIR / filename
        assert filepath.exists(), f"{filename} must exist"
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            for line_no, line in enumerate(f, 1):
                emojis = emoji_pattern.findall(line)
                assert len(emojis) == 0, f"Emoji {emojis} found in {filename} at line {line_no}"


def test_simplified_appearance_page_dom():
    """Verify simplified Appearance page contains only theme gallery, preview, and reduced motion."""
    html_path = EXTENSION_DIR / "appearance.html"
    js_path = EXTENSION_DIR / "appearance.js"

    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()
    with open(js_path, "r", encoding="utf-8") as f:
        js = f.read()

    # Essential elements for simplified appearance page
    assert 'id="theme-gallery-default"' in html, "Default theme section must exist"
    assert 'id="theme-gallery-dark"' in html, "Dark theme gallery must exist"
    assert 'id="reduced-motion-toggle"' in html, "Reduced motion toggle must exist"
    assert 'id="active-theme-badge"' in html, "Active theme indicator must exist"
    assert 'id="theme-preview-shell"' in html, "Live theme preview shell must exist"

    # Verified handled in JS
    assert "theme-gallery-default" in js
    assert "theme-gallery-dark" in js
    assert "reduced-motion-toggle" in js
    assert "active-theme-badge" in js

    # Unwanted settings MUST be removed from appearance.html
    removed_controls = [
        'id="color-bg-primary"',
        'id="color-accent"',
        'id="color-text-main"',
        'id="btn-save-custom-theme"',
        'id="btn-reset-colors"',
        'id="font-family-select"',
        'id="font-size-slider"',
        'id="line-height-slider"',
        'id="font-weight-select"',
        'id="density-group"',
        'id="radius-group"',
        'id="border-group"',
        'id="btn-export-appearance"',
        'id="btn-import-appearance"',
        'id="import-file-input"',
        'id="custom-theme-list"'
    ]
    for cid in removed_controls:
        assert cid not in html, f"Unwanted control {cid} must NOT be present in appearance.html"


def test_sidepanel_and_popup_theme_integration():
    sp_path = EXTENSION_DIR / "sidepanel.html"
    pop_path = EXTENSION_DIR / "popup.html"

    with open(sp_path, "r", encoding="utf-8") as f:
        sp_html = f.read()
    with open(pop_path, "r", encoding="utf-8") as f:
        pop_html = f.read()

    # Both must have quick theme chips and reduced motion toggle
    assert 'id="quick-theme-chips"' in sp_html, "quick-theme-chips missing in sidepanel.html"
    assert 'id="quick-theme-chips"' in pop_html, "quick-theme-chips missing in popup.html"
    assert 'id="quick-reduced-motion"' in sp_html, "quick-reduced-motion missing in sidepanel.html"
    assert 'id="quick-reduced-motion"' in pop_html, "quick-reduced-motion missing in popup.html"
    assert 'id="btn-open-appearance-studio"' in sp_html
    assert 'id="btn-open-appearance-studio"' in pop_html
