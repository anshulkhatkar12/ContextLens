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
   - Evaluates both passages and classifies their relationship into 4 standard categories:
     - ⚠️ **POSSIBLE CONTRADICTION:** Incompatible claims about the same subject under comparable conditions.
     - ✅ **CONSISTENT:** Passages support similar conclusions or compatible facts.
     - ⏱️ **DIFFERENT CONTEXT:** Variations due to dates, pricing scope, definitions, or updates.
     - ❓ **INSUFFICIENT CONTEXT:** Lacks essential geographic boundaries, dates, or population details.

3. **Structured Research Output:**
   - **Executive Summary:** Plain-language synthesis.
   - **Key Differences:** Specific factual divergences itemized as bullets.
   - **Missing Context:** Exactly what parameters need to be verified.
   - **Suggested Verification Questions:** Actionable follow-up questions for the researcher.
   - **Source Links:** Direct backlinks to open and verify the original webpage.

4. **1-Click Demonstration Mode (Offline Ready):**
   - 3 pre-configured scenarios ready to showcase in presentations:
     - **Scenario A:** Possible Contradiction (Conference date: Friday vs. Saturday).
     - **Scenario B:** Different Context (Product price: Base MSRP $499 vs. Checkout $549).
     - **Scenario C:** Insufficient Context (Opposing youth employment statistics).
   - Functions 100% offline with zero dependencies or API keys needed.

5. **Local Research History:**
   - Searchable local storage (`chrome.storage.local`).
   - Review past analyses, copy markdown summaries, and reopen source links anytime.

6. **Privacy by Design:**
   - Zero background tracking or browsing monitoring.
   - Text is captured strictly upon explicit user interaction.
   - Operates locally; only sends passages to the backend when you click "Compare".

---

## 🏗️ Architecture

```
contextlens/
├── extension/                 # Chrome Extension (Manifest V3)
│   ├── manifest.json          # MV3 configuration & permissions
│   ├── sidepanel.html         # Main docked side panel UI (Linear/Arc aesthetic)
│   ├── sidepanel.css          # Modern dark-mode styling with subtle glows
│   ├── sidepanel.js           # Extension controller, state, & offline engine
│   ├── popup.html             # Compact popup view
│   ├── content.js             # On-page text selection & floating capture pill
│   ├── content.css            # Floating pill & notification styles
│   ├── background.js          # Service worker & context menus
│   └── icons/                 # Crisp vector-generated extension icons
├── backend/                   # Python FastAPI Service
│   ├── main.py                # REST API endpoints (/compare, /health, /demos)
│   ├── models.py              # Pydantic schemas
│   ├── analyzer.py            # AI integration (Gemini / OpenAI / Claude / Fallback)
│   ├── requirements.txt       # Minimal dependencies
│   ├── test_main.py           # Backend automated test suite
│   └── .env.example           # Environment template
├── test_pages/                # Interactive Hackathon Demo Articles
│   ├── article_a.html         # TechNews Daily (Claims keynote is Friday)
│   └── article_b.html         # EventHub Official (Confirms keynote is Saturday)
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

*(Optional: If you want to use live LLMs, copy `backend/.env.example` to `backend/.env` and add your `GEMINI_API_KEY` or `OPENAI_API_KEY`. If left blank, the built-in context analysis engine runs automatically!)*

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
