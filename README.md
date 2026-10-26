# ContextLens 🔍

> **"Don't just read information. Understand its context."**  
> *Core Principle: Evidence before conclusions.*

ContextLens is an AI-powered browser extension and research workspace built for Chrome Manifest V3 and FastAPI. It empowers students, journalists, and researchers to capture statements across different webpages, contrast them side-by-side, and analyze the contextual relationship between them using multi-LLM routing and deterministic semantic reasoning.

---

## 💡 Why ContextLens?

When researching online, you constantly encounter differing claims about the same topic. Most tools try to declare one source "True" and the other "False".

Real-world information is rarely binary. Statements often differ because of:
- **Timing and updates** (initial preview vs. rescheduled agenda)
- **Different pricing scopes** (base MSRP vs. checkout invoice with tax & shipping)
- **Different cohorts or definitions** (youth aged 15–24 vs. 18–29)
- **Different jurisdictions or statistical methodologies**

ContextLens never automatically declares a source false. Instead, it exposes the **missing context**, highlights **key differences**, and generates **targeted verification questions** so you can investigate effectively.

---

## 🌟 Key Features

1. **Effortless Multi-Page Capture (3 Ways):**
   - **Floating Action Pill:** Select text on any article; a sleek floating badge appears with 1-click `+ Claim A` or `+ Evidence B`.
   - **Native Right-Click Menu:** Right-click highlighted text &rarr; `ContextLens: Save Selection`.
   - **Active Tab Grab:** Click "Capture Tab Selection" directly in the extension.

2. **Quick Try Scenario Chips:**
   - 1-click preset chips for instant live testing:
     - `🏛️ Museum Hours` &rarr; Consistent schedule corroboration.
     - `📅 Event Dates` &rarr; Incompatible event schedules (Contradicted / Contradiction).
     - `🏷️ Laptop Price` &rarr; Base MSRP vs. Final Checkout Invoice (Different Context).
     - `📊 Job Stats` &rarr; Opposing employment metrics without cohort data (Insufficient Evidence).

3. **Evidence-First AI Comparative Analysis:**
   - Evaluates both passages and classifies their relationship into 6 rich semantic categories:
     - ✅ **SUPPORTED:** The evidence directly supports the claim under comparable conditions.
     - ⚠️ **CONTRADICTED:** Reliable evidence directly conflicts with the claim.
     - 🔶 **PARTIALLY SUPPORTED:** Some aspects are established, but the full scope is not verified.
     - ⏱️ **DIFFERENT CONTEXT:** Statements differ due to dates, scope, definitions, or methods.
     - ❓ **INSUFFICIENT EVIDENCE:** The available evidence does not justify a factual conclusion.
     - 🔗 **UNRELATED:** The evidence does not meaningfully address the claim.

4. **Evidence-First Source Cards:**
   - Visual side-by-side cards displaying Source A and Source B direct quotes.
   - 1-click "Open Source ↗" links to verify the primary publisher immediately.

5. **External Source Discovery & Credibility Evaluation:**
   - Automatically identifies unanswered questions and generates targeted web queries.
   - Discovers independent sources via SerpAPI, Brave Search, or DuckDuckGo fallback.
   - Evaluates domain authority, source type, and directional stance without fabricating citations.

6. **Structured Research Output:**
   - **Executive Summary:** Plain-language synthesis grounded in the passages.
   - **Confidence Score & Reason:** Transparent uncertainty estimation with limitations.
   - **Supporting & Contradicting Evidence:** Explicit excerpt breakdown.
   - **Key Differences & Missing Context:** Factual divergences and parameters to investigate.
   - **Suggested Verification Questions:** Actionable follow-up queries.
   - **Discovered Sources:** Independent links with AI relevance assessments.

7. **Local Models (Qwen) Without API Keys + Multi-Layer Guardrails:**
   - **Zero API Keys Required:** Runs directly with local LLMs such as **Qwen** (`qwen2.5:latest`, `qwen2.5:7b`, `qwen2.5:1.5b`) via Ollama (`http://localhost:11434`), LM Studio, or vLLM.
   - **AI Safety & Grounding Guardrails:**
     - 🛡️ **Prompt Injection Defense:** Neutralizes system override instructions, DAN jailbreaks, and adversarial directives embedded in untrusted input passages.
     - 🔍 **Grounding & Anti-Hallucination Guardrail:** Lexically and semantically verifies that quotes and points cited are genuinely grounded in the source passages, discarding fabricated claims.
     - 🏷️ **Canonical Taxonomy Enforcement:** Strict normalization into the 6 canonical categories.
     - 🔗 **URL & Citation Integrity:** Strictly blocks local models from fabricating non-existent external URLs.
     - ⚖️ **Confidence Calibration:** Automatically clamps overconfident scores when evidence is sparse or ambiguous.
     - 🛠️ **JSON Repair:** Robust parsing of markdown-fenced or conversational local LLM output.

8. **Multi-LLM Provider Engine with 100% Offline Fallback:**
   - Intelligently routes API keys entered in settings:
     - Local Ollama / Qwen &rarr; Zero API key offline local inference
     - `sk-...` &rarr; OpenAI GPT-4o / GPT-4o-mini
     - `AIza...` &rarr; Google Gemini 1.5 Pro / Flash
     - `sk-ant-...` &rarr; Anthropic Claude 3.5 Sonnet
   - **Built-in Deterministic Engine:** Zero external dependencies needed; ContextLens includes a built-in semantic context engine that runs 100% offline.

9. **Export & Sharing Tools:**
   - **📋 Copy Report:** Copy structured markdown report to clipboard.
   - **📥 Download .md:** Download standalone markdown research report.
   - **💾 Export JSON:** Download raw JSON comparison data for archives or programmatic pipelines.
   - **📥 Export All History:** Export complete research history as a single JSON file.

10. **Theme System & Personalization:**
    - Multiple curated themes (Dark, Light, Cyberpunk, Forest, Sunset, etc.) and typography options.
    - Glassmorphism effects, live preview, and reading experience preferences.

11. **Local Research History & Privacy by Design:**
    - Searchable local storage (`chrome.storage.local`) with category filter pills (`All`, `Contradictions`, `Consistent`, `Different Context`, `Insufficient`).
    - Zero passive tracking or browsing history collection. Text captured strictly on explicit user action.

---

## 🏗️ Architecture

```
contextlens/
├── extension/                 # Chrome Extension (Manifest V3)
│   ├── manifest.json          # MV3 configuration & permissions
│   ├── sidepanel.html         # Main docked side panel UI (Linear/Arc aesthetic)
│   ├── sidepanel.css          # Modern dark-mode styling with glassmorphism & responsive grid
│   ├── sidepanel.js           # Extension controller, state, export tools & client fallback
│   ├── popup.html             # Compact popup view
│   ├── appearance.html        # Theme customizer & personalization settings UI
│   ├── appearance.css         # Theme customizer styles
│   ├── appearance.js          # Theme selector & personalization logic
│   ├── themes.js              # Theme definitions, CSS variables & typography tokens
│   ├── content.js             # On-page text selection & floating capture pill
│   ├── content.css            # Floating pill & notification styles
│   ├── background.js          # Service worker & context menus
│   └── icons/                 # Crisp vector-generated extension icons
├── backend/                   # Python FastAPI Service
│   ├── main.py                # REST API endpoints (/compare, /health, /demos)
│   ├── models.py              # Pydantic schemas with normalization & error handling
│   ├── analyzer.py            # Orchestration pipeline (AI + Heuristic Fallback)
│   ├── llm_provider.py        # Multi-provider LLM abstraction (Gemini / OpenAI / Claude)
│   ├── guardrails.py          # AI safety, anti-hallucination & injection defenses
│   ├── source_search.py       # Web search integration (SerpAPI / Brave / DuckDuckGo)
│   ├── source_evaluator.py    # Source relevance, credibility, and stance scoring
│   ├── requirements.txt       # Dependencies (FastAPI, Uvicorn, Pydantic, HTTPX, Pytest)
│   ├── test_main.py           # 24-scenario automated test suite
│   ├── test_theme_system.py   # Theme system verification tests
│   └── .env.example           # Environment template for API keys
├── test_pages/                # Interactive Demo Articles
│   ├── article_a.html         # TechNews Daily (Claims keynote is Friday)
│   └── article_b.html         # EventHub Official (Confirms keynote is Saturday)
├── pytest.ini                 # Pytest configuration
├── run_backend.sh             # 1-command startup script
└── README.md
```

---

## 🚀 Quickstart Guide (3 Steps)

### Step 1: Start the Backend Service

Open your terminal in the `contextlens` folder and run:

```bash
./run_backend.sh
```

*This will automatically create a Python virtual environment (`venv`), install dependencies, and start the FastAPI server at `http://localhost:8000`.*

### Local AI Setup (No API Keys Needed):
Run Qwen locally with [Ollama](https://ollama.com):
```bash
ollama run qwen2.5
```
By default, ContextLens connects directly to `http://localhost:11434` with model `qwen2.5:latest` (or configured `LOCAL_MODEL`), requiring zero API keys and offering 100% private, offline semantic reasoning with safety guardrails!

*(Optional: Cloud providers like Google Gemini (`GEMINI_API_KEY`), OpenAI (`OPENAI_API_KEY`), or Anthropic Claude (`ANTHROPIC_API_KEY`) can be configured in `backend/.env`. If left blank or offline, ContextLens's built-in offline engine runs automatically!).*

---

### Step 2: Load the Extension into Google Chrome

1. Open Google Chrome and navigate to: `chrome://extensions/`
2. In the top-right corner, toggle **"Developer mode"** ON.
3. Click the **"Load unpacked"** button in the top-left.
4. Select the `extension/` directory from this repository:
   `/Users/anshul/contextlens/extension`
5. ContextLens will now appear in your Chrome toolbar!
6. *(Tip: Click the puzzle icon in Chrome and **pin** ContextLens for quick access).*

---

### Step 3: Run the 2-Minute Demo Pitch

To test the complete live workflow without finding external websites:

1. In Chrome, open test article A:
   ```
   file:///Users/anshul/contextlens/test_pages/article_a.html
   ```
2. Highlight the quote: *"the Global Tech Summit opening keynote takes place on Friday, November 14th at 9:00 AM."*
3. Click the floating **`+ Claim A`** pill (or right-click &rarr; "Save Selection as Claim").
4. In another tab, open test article B:
   ```
   file:///Users/anshul/contextlens/test_pages/article_b.html
   ```
5. Highlight the quote: *"all main conference talks including the opening keynote are confirmed for Saturday, November 15th."*
6. Click the floating **`+ Evidence B`** pill (or right-click &rarr; "Save Selection as Evidence").
7. Click the **ContextLens** extension icon in your Chrome toolbar.
8. Click **"⚡ Compare with ContextLens"**!
9. View the full comparative analysis:
   - Classification badge: **⚠️ POSSIBLE CONTRADICTION**
   - Side-by-side Evidence Source Cards
   - Detailed rationale & key differences
   - Missing context & follow-up questions
   - Direct backlinks to open and verify the original webpage!
10. Click **`📥 .md`** or **`💾 JSON`** to export the investigation report.

---

## 🧪 Automated Testing

Run the complete backend test suite:

```bash
source venv/bin/activate
pytest -v
```

All 9 automated tests validate:
- Server health check & demo endpoints.
- Input validation (rejects empty or sub-5 character passages).
- Contradiction, consistent, different context, and insufficient context classification schemas.
- Exact weekday and schedule semantic consistency matching.

---

## 🎤 Hackathon Judge Presentation Script

**1. Hook (0:00 - 0:20):**  
> *"Every day, internet users read contradictory statements across news sites, social media, and product reviews. But most fact-checkers just label things True or False, ignoring the real world: context. We built ContextLens to put evidence before conclusions."*

**2. Live Demo (0:20 - 1:15):**  
> *"Watch how fast this is. I highlight a quote on Article A—click '+ Claim A'. I switch to Article B—click '+ Evidence B'. I open the ContextLens side panel and click Compare. ContextLens doesn't call anyone a liar—it reveals that Source A quoted Friday while Source B confirmed Saturday, gives me the exact verification questions, and links straight to the sources."*

**3. Innovation & Architecture (1:15 - 1:45):**  
> *"ContextLens is built on Chrome Manifest V3 with a FastAPI backend. It supports dynamic multi-LLM routing for OpenAI, Gemini, and Claude, but also ships with a 100% offline context engine with zero external dependencies. You can export reports in Markdown or JSON with one click."*

**4. Conclusion (1:45 - 2:00):**  
> *"ContextLens: Don't just read information. Understand its context."*

---

## 🛡️ Hackathon Principles

- **Evidence Before Conclusions:** ContextLens assists critical thinking without imposing algorithmic bias.
- **Privacy First:** Zero background tracking or passive history monitoring. Text is captured strictly upon user selection.
- **Fail-Safe Reliability:** If the network or backend drops, the built-in heuristic engine ensures the tool never fails in front of judges.
