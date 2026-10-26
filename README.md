# ContextLens 🔍

> **"Don't just read information. Understand its context."**  
> *Core Principle: Evidence before conclusions.*

ContextLens is an AI-powered browser extension and research assistant built for Chrome Manifest V3 and FastAPI. It empowers students, journalists, and researchers to capture statements across different webpages, contrast them side-by-side, and analyze the contextual relationship between them using AI.

---

## 💡 Why ContextLens?

When researching online, you constantly encounter differing claims about the same topic. Most tools try to declare one source "True" and the other "False".

Real-world information is rarely that simple. Statements often differ because of:
- **Different dates** (previews vs. subsequent updates)
- **Different pricing scopes** (base MSRP vs. checkout invoice with tax & shipping)
- **Different demographic cohorts** (youth aged 15–24 vs. 18–29)
- **Different jurisdictions or statistical methodologies**

ContextLens never automatically declares a source false. Instead, it exposes the **missing context**, highlights **key differences**, and generates **targeted verification questions** so you can investigate effectively.

---

## 🌟 Key Features

1. **Effortless Multi-Page Capture (3 Ways):**
   - **Floating Action Pill:** Select text on any article; a sleek floating badge appears with 1-click `+ Claim A` or `+ Evidence B`.
   - **Native Right-Click Menu:** Right-click highlighted text &rarr; `ContextLens: Save Selection`.
   - **Active Tab Grab:** Click "Capture Tab Selection" directly in the extension.

2. **Evidence-First AI Comparative Analysis:**
   - Evaluates both passages and classifies their relationship into 6 rich semantic categories:
     - ✅ **SUPPORTED:** The evidence directly supports the claim under comparable conditions.
     - ⚠️ **CONTRADICTED:** Reliable evidence directly conflicts with the claim.
     - 🔶 **PARTIALLY SUPPORTED:** Some aspects are established, but the full scope is not verified.
     - ⏱️ **DIFFERENT CONTEXT:** Statements differ due to dates, scope, definitions, or methods.
     - ❓ **INSUFFICIENT EVIDENCE:** The available evidence does not justify a factual conclusion.
     - 🔗 **UNRELATED:** The evidence does not meaningfully address the claim.

3. **External Source Discovery & Credibility Evaluation:**
   - Automatically identifies unanswered questions and generates targeted web queries.
   - Discovers independent sources via SerpAPI, Brave Search, or DuckDuckGo fallback.
   - Evaluates domain authority, source type, and directional stance without fabricating citations.

4. **Structured Research Output:**
   - **Executive Summary:** Plain-language synthesis grounded in the passages.
   - **Confidence Score & Reason:** Transparent uncertainty estimation with limitations.
   - **Supporting & Contradicting Evidence:** Explicit excerpt breakdown.
   - **Key Differences & Missing Context:** Factual divergences and parameters to investigate.
   - **Suggested Verification Questions:** Actionable follow-up queries.
   - **Discovered Sources:** Independent links with AI relevance assessments.

5. **Local Models (Qwen) Without API Keys + Multi-Layer Guardrails:**
   - **Zero API Keys Required:** Runs directly with local LLMs such as **Qwen** (`qwen2.5:latest`, `qwen2.5:7b`, `qwen2.5:1.5b`) via Ollama (`http://localhost:11434`), LM Studio, or vLLM.
   - **AI Safety & Grounding Guardrails:**
     - 🛡️ **Prompt Injection Defense:** Neutralizes system override instructions, DAN jailbreaks, and adversarial directives embedded in untrusted input passages.
     - 🔍 **Grounding & Anti-Hallucination Guardrail:** Lexically and semantically verifies that quotes and points cited are genuinely grounded in the source passages, discarding fabricated claims.
     - 🏷️ **Canonical Taxonomy Enforcement:** Strict normalization into the 6 canonical categories.
     - 🔗 **URL & Citation Integrity:** Strictly blocks local models from fabricating non-existent external URLs.
     - ⚖️ **Confidence Calibration:** Automatically clamps overconfident scores when evidence is sparse or ambiguous.
     - 🛠️ **JSON Repair:** Robust parsing of markdown-fenced or conversational local LLM output.
   - **Optional Cloud Providers:** Seamless fallback to Google Gemini, OpenAI, or Anthropic Claude if configured.

6. **Local Research History & Privacy by Design:**
   - Searchable local storage (`chrome.storage.local`).
   - Zero passive tracking or browsing history collection. Text captured strictly on explicit user action.
   - Completely private and offline-capable when run with local models.

---

## 🏗️ Architecture

```
contextlens/
├── extension/                 # Chrome Extension (Manifest V3)
│   ├── manifest.json          # MV3 configuration & permissions
│   ├── sidepanel.html         # Main docked side panel UI (Linear/Arc aesthetic)
│   ├── sidepanel.css          # Modern dark-mode styling with subtle glows
│   ├── sidepanel.js           # Extension controller, state, & client fallback
│   ├── popup.html             # Compact popup view
│   ├── content.js             # On-page text selection & floating capture pill
│   ├── content.css            # Floating pill & notification styles
│   ├── background.js          # Service worker & context menus
│   └── icons/                 # Crisp vector-generated extension icons
├── backend/                   # Python FastAPI Service
│   ├── main.py                # REST API endpoints (/compare, /health, /demos)
│   ├── models.py              # Pydantic schemas with normalization & error handling
│   ├── analyzer.py            # Orchestration pipeline (AI + Heuristic Fallback)
│   ├── llm_provider.py        # Multi-provider LLM abstraction (Gemini / OpenAI / Claude)
│   ├── source_search.py       # Web search integration (SerpAPI / Brave / DuckDuckGo)
│   ├── source_evaluator.py    # Source relevance, credibility, and stance scoring
│   ├── requirements.txt       # Dependencies (FastAPI, Uvicorn, Pydantic, HTTPX, Pytest)
│   ├── test_main.py           # 24-scenario automated test suite
│   └── .env.example           # Environment template for API keys
├── test_pages/                # Interactive Demo Articles
│   ├── article_a.html         # TechNews Daily (Claims keynote is Friday)
│   └── article_b.html         # EventHub Official (Confirms keynote is Saturday)
├── run_backend.sh             # Linux/macOS startup script
├── pytest.ini                 # Pytest configuration
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

*(Optional: Cloud providers like Google Gemini or OpenAI can still be configured in `backend/.env` if desired).*

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

1. In Chrome, open the test article A:
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
   - Detailed rationale
   - Key differences
   - Missing context & follow-up questions
   - Direct links back to both sources!

---

## 🧪 Testing & Validation

Run the automated backend test suite:

```bash
source venv/bin/activate
pytest backend/test_main.py -v
```

All tests validate:
- Server health check & demo endpoints.
- Input validation (rejects empty or sub-5 character passages).
- Contradiction, different context, and insufficient context classification schemas.

---

## 🛡️ Hackathon Constraints & Principles

- **No False Positives:** Avoids hasty verdicts.
- **Resilient Fallback:** If the network or backend is offline, the client-side engine steps in immediately.
- **Zero Heavy Frameworks:** Built with native HTML/CSS/JavaScript and Python FastAPI for blazing speed and zero build-step overhead.
