# ContextLens 🔍

> **"Don't just read information. Understand its context."**  
> *Core Principle: Evidence before conclusions.*

ContextLens is an AI-powered browser extension and research workspace built for Chrome Manifest V3 and FastAPI. It empowers students, journalists, and researchers to capture statements across different webpages, contrast them side-by-side, analyze the contextual relationship between them using **LangChain** structured semantic reasoning, and discover additional sources for verification.

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

## 🦜 What LangChain Does in ContextLens

LangChain powers the core semantic intelligence in ContextLens:

1. **Structured Semantic Analysis Pipeline:**
   Instead of raw text generation or loose keyword matching, LangChain's `with_structured_output` binds strict Pydantic schemas (`StructuredAnalysisOutput`) to the underlying model. This guarantees that responses always contain validated classifications, passage interpretations, evidence breakdowns, key differences, missing context, and actionable verification questions.

2. **Unified, Provider-Agnostic Model Routing (`backend/llm_provider.py`):**
   LangChain standardizes model access across Google Gemini (`ChatGoogleGenerativeAI`), OpenAI (`ChatOpenAI`), and Anthropic Claude (`ChatAnthropic`). Switching providers requires only changing `LLM_PROVIDER` in your environment.

3. **Untrusted Data Encapsulation & Safety:**
   LangChain's prompt architecture encapsulates untrusted webpage text within boundary markers, instructing models to resist prompt injection attempts embedded in retrieved web pages.

4. **Modular Source Discovery & Evidence Verification (`backend/source_search.py` & `backend/source_evaluator.py`):**
   LangChain generates focused queries to retrieve web sources (via DuckDuckGo or Tavily), evaluates source relevance against claims, and supplies verified additional sources with real, non-hallucinated URLs.

5. **6 Canonical Classifications:**
   - **`SUPPORTED`**: The evidence confirms and substantiates the claim.
   - **`CONTRADICTED`**: Passages make incompatible claims about the same subject under comparable conditions.
   - **`PARTIALLY_SUPPORTED`**: Some elements are corroborated, but key aspects are modified or unconfirmed.
   - **`DIFFERENT_CONTEXT`**: Variations due to dates, pricing scope, definitions, or circumstances.
   - **`INSUFFICIENT_EVIDENCE`**: Lacks essential geographic boundaries, dates, or population details.
   - **`UNRELATED`**: The passages discuss different, unrelated subjects.

---

## 🏗️ Architecture

```
contextlens/
├── extension/                 # Chrome Extension (Manifest V3)
│   ├── manifest.json          # MV3 configuration & permissions
│   ├── sidepanel.html         # Main docked side panel UI
│   ├── sidepanel.css          # Theme system & responsive styling
│   ├── sidepanel.js           # Extension controller, state, & result renderer
│   ├── appearance.html        # Personalization & Appearance Studio
│   ├── themes.js              # Theme engine (presets, typography, density)
│   ├── popup.html             # Quick popup view
│   ├── content.js             # On-page text selection & floating capture pill
│   ├── background.js          # Service worker & context menus
│   └── icons/                 # Extension icons
├── backend/                   # Python FastAPI & LangChain Service
│   ├── main.py                # REST API endpoints (/compare, /search-sources, /health, /demos)
│   ├── models.py              # Pydantic schemas (ClaimItem, SourceItem, CompareResponse)
│   ├── analyzer.py            # LangChain structured analysis pipeline & heuristic fallback
│   ├── llm_provider.py        # Centralized LangChain model factory (Gemini, OpenAI, Claude)
│   ├── source_search.py       # Source query generator & search integration (DuckDuckGo, Tavily)
│   ├── source_evaluator.py    # Source relevance evaluation & ranking
│   ├── requirements.txt       # Pinned dependencies (LangChain, FastAPI, Pydantic, etc.)
│   ├── test_main.py           # Backend endpoint tests
│   ├── test_langchain_pipeline.py # 13 focused LangChain pipeline & mock tests
│   ├── test_theme_system.py   # Theme & personalization automated tests
│   └── .env.example           # Environment template
├── pytest.ini                 # Pytest configuration
├── run_backend.sh             # 1-command startup script
└── README.md
```

---

## ⚙️ Configuration & Environment Variables

Copy `backend/.env.example` to `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

### 1. Configure AI Provider (`LLM_PROVIDER`)

| Variable | Allowed Values | Description |
|---|---|---|
| `LLM_PROVIDER` | `gemini`, `openai`, `anthropic`, `heuristic` | Active AI provider (default: `gemini`). |
| `LLM_MODEL` | string (optional) | Model name override (e.g. `gemini-1.5-flash`, `gpt-4o-mini`, `claude-3-haiku-20240307`). |
| `LLM_TEMPERATURE` | float (e.g. `0.2`) | Generation temperature (default: `0.2`). |
| `GEMINI_API_KEY` | string | Google AI Studio key (required if `LLM_PROVIDER=gemini`). |
| `OPENAI_API_KEY` | string | OpenAI API key (required if `LLM_PROVIDER=openai`). |
| `ANTHROPIC_API_KEY`| string | Anthropic API key (required if `LLM_PROVIDER=anthropic`). |

> **Note on Fallback:** If `LLM_PROVIDER=heuristic` (or if no API key is configured), ContextLens executes its built-in offline deterministic engine with `is_heuristic_fallback=True`. If an AI provider is explicitly selected but its API key is missing, ContextLens returns an explicit `503 Service Unavailable` configuration error rather than silently degrading.

### 2. Configure Source Search (`SEARCH_PROVIDER`)

| Variable | Allowed Values | Description |
|---|---|---|
| `SEARCH_PROVIDER` | `duckduckgo`, `tavily`, `mock` | Source discovery provider (default: `duckduckgo`). |
| `TAVILY_API_KEY` | string (optional) | Tavily Search API key (only needed if `SEARCH_PROVIDER=tavily`). |

- **`duckduckgo`**: Ready out-of-the-box with **no API key required**.
- **`tavily`**: Advanced research search with page snippets.
- **`mock`**: Deterministic offline search for automated unit tests.

---

## 🚀 Running ContextLens Locally

### Step 1: Install Dependencies & Start Backend

Ensure you are in the repository root:

```bash
# Option A: One-command startup script (creates venv and installs deps)
./run_backend.sh

# Option B: Manual startup
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

The FastAPI service will run at `http://localhost:8000`.
Interactive API docs are available at: **`http://localhost:8000/docs`**.

### Step 2: Run the Automated Test Suite

Run the full pytest suite (including LangChain mocks and endpoint compatibility):

```bash
./venv/bin/pytest -v
```

All 27 test cases will execute:
- 13 focused LangChain pipeline tests (`backend/test_langchain_pipeline.py`)
- 9 API endpoint tests (`backend/test_main.py`)
- 5 theme and personalization tests (`backend/test_theme_system.py`)

### Step 3: Load the Extension into Google Chrome

1. Open Google Chrome and navigate to: `chrome://extensions/`
2. In the top-right corner, enable **"Developer mode"**.
3. Click **"Load unpacked"** in the top-left.
4. Select the `extension/` directory from this repository:
   `/Users/anshul/contextlens/extension`
5. *(To reload after edits: Click the circular reload icon 🔄 on the ContextLens card in `chrome://extensions/`).*

---

## 🔒 Security & Privacy

1. **No Client-Side Secrets:** API keys remain strictly on the Python backend. The extension never accesses or stores third-party LLM credentials.
2. **Untrusted Data Handling:** External webpage content and search snippets are strictly treated as untrusted text with length caps (500KB download limit, 4,000 char parsing limit).
3. **Anti-Hallucination Grounding:** URLs and excerpts are never fabricated. If a search result only provides a snippet, it is explicitly tagged `content_type="snippet"` rather than claiming full-page verification.

---

## ⚠️ Known Limitations

- **Search Rate Limits:** DuckDuckGo may occasionally rate-limit rapid successive requests; if this occurs, configure `TAVILY_API_KEY` or wait briefly before searching again.
- **Paywalled Webpages:** Web search discovery inspects public search snippets and public HTML; it cannot bypass paywalled or login-protected articles.
