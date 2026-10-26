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
     - `📅 Event Dates` &rarr; Incompatible event schedules (Possible Contradiction).
     - `🏷️ Laptop Price` &rarr; Base MSRP vs. Final Checkout Invoice (Different Context).
     - `📊 Job Stats` &rarr; Opposing employment metrics without cohort data (Insufficient Context).

3. **Evidence-First AI Comparative Analysis:**
   - Evaluates both passages and classifies their relationship into 4 standard categories:
     - ⚠️ **POSSIBLE CONTRADICTION:** Incompatible claims about the same subject under comparable conditions.
     - ✅ **CONSISTENT:** Passages support similar conclusions or compatible facts.
     - ⏱️ **DIFFERENT CONTEXT:** Variations due to dates, pricing scope, definitions, or updates.
     - ❓ **INSUFFICIENT CONTEXT:** Lacks essential geographic boundaries, dates, or population details.

4. **Evidence-First Source Cards:**
   - Visual side-by-side cards displaying Source A and Source B direct quotes.
   - 1-click "Open Source ↗" links to verify the primary publisher immediately.

5. **Export & Sharing Tools:**
   - **📋 Copy Report:** Copy structured markdown report to clipboard.
   - **📥 Download .md:** Download standalone markdown research report.
   - **💾 Export JSON:** Download raw JSON comparison data for archives or programmatic pipelines.
   - **📥 Export All History:** Export complete research history as a single JSON file.

6. **History with Category Filter Pills:**
   - Filter your research history by classification: `All`, `Contradictions`, `Consistent`, `Different Context`, or `Insufficient`.
   - Real-time text search across claims, sources, and conclusions.

7. **Multi-LLM Provider Engine with 100% Offline Fallback:**
   - Intelligently routes API keys entered in settings:
     - `sk-...` &rarr; OpenAI GPT-4o / GPT-4o-mini
     - `AIza...` &rarr; Google Gemini 1.5 Pro / Flash
     - `sk-ant-...` &rarr; Anthropic Claude 3.5 Sonnet
   - **Zero API Key Needed for Demos:** ContextLens includes a built-in semantic context engine that runs 100% offline.

---

## 🏗️ Architecture

```
contextlens/
├── extension/                 # Chrome Extension (Manifest V3)
│   ├── manifest.json          # MV3 configuration & permissions
│   ├── sidepanel.html         # Main docked side panel UI (Linear/Arc aesthetic)
│   ├── sidepanel.css          # Modern dark-mode styling with glassmorphism & responsive grid
│   ├── sidepanel.js           # Extension controller, state, export tools & offline engine
│   ├── popup.html             # Compact popup view
│   ├── content.js             # On-page text selection & floating capture pill
│   ├── content.css            # Floating pill & notification styles
│   ├── background.js          # Service worker & context menus
│   └── icons/                 # Crisp vector-generated extension icons
├── backend/                   # Python FastAPI Service
│   ├── main.py                # REST API endpoints (/compare, /health, /demos)
│   ├── models.py              # Pydantic schemas
│   ├── analyzer.py            # AI engine (OpenAI / Gemini / Claude / Heuristic Fallback)
│   ├── requirements.txt       # Minimal dependencies (FastAPI, Uvicorn, Pydantic, Pytest)
│   ├── test_main.py           # Backend automated test suite (9 test cases)
│   └── .env.example           # Environment template
├── test_pages/                # Interactive Hackathon Demo Articles
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

You can view the interactive Swagger API documentation at:
**[http://localhost:8000/docs](http://localhost:8000/docs)**

*(Optional: To use live LLM models, copy `backend/.env.example` to `backend/.env` and add your `GEMINI_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY`. If left blank, ContextLens's built-in offline engine runs automatically!)*

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
