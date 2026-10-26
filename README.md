# LangGraph Research Agent — Full Stack

A full-stack AI research assistant with a **Next.js** interactive frontend and a **FastAPI + LangGraph** backend, powered by your local **Ollama** LLM.

## Architecture

```
┌─────────────────────┐       ┌──────────────────────────┐
│   Next.js Frontend  │──────▶│   FastAPI Backend         │
│   (port 3000)       │  API  │   (port 8000)            │
│                     │◀──────│                          │
│  • Topic input      │       │  • LangGraph StateGraph  │
│  • Workflow tracker │       │  • Planner → Researcher  │
│  • Draft viewer     │       │    → Writer → Reviewer   │
│  • Review panel     │       │    → Publisher            │
│  • Findings panel   │       │  • Ollama LLM client     │
└─────────────────────┘       └──────────┬───────────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │   Ollama (local LLM)  │
                              │   (port 11434)        │
                              │   llama3.1 model      │
                              └──────────────────────┘
```

## Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **Ollama** installed and running with a model pulled:
  ```bash
  ollama pull llama3.1
  ```

## Quick Start

### 1. Backend (Terminal 1)

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

### 2. Frontend (Terminal 2)

```bash
cd frontend
npm install
npm run dev
```

### 3. Open the app

Go to **http://localhost:3000** in your browser.

## How It Works

1. **Enter a topic** on the landing page
2. **Watch the workflow** — the left sidebar shows the agent's progress through Planning → Researching → Writing → Reviewing
3. **Expand research findings** — click each sub-question to see the answer and sources
4. **Review the draft** — read the generated report
5. **Take action:**
   - ✅ **Approve** — publishes the final report
   - ✏️ **Revise** — sends feedback back to the Writer
   - 🔍 **Dig Deeper** — sends the Researcher to investigate more
6. **Get the final report** — marked as published with a green badge

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/research/start` | Start a new research thread |
| POST | `/api/research/review` | Submit a review decision |
| GET | `/api/research/{thread_id}` | Get thread status |
| GET | `/api/health` | Health check |

## Project Structure

```
langgraph-fullstack/
├── backend/
│   ├── server.py          # FastAPI server with API routes
│   ├── graph.py           # LangGraph workflow definition
│   ├── nodes.py           # Agent nodes (planner, researcher, writer, reviewer, publisher)
│   ├── state.py           # Shared state TypedDict
│   ├── requirements.txt   # Python dependencies
│   └── .env.example       # Environment config template
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx       # Main page with research UI
│   │   │   ├── layout.tsx     # Root layout
│   │   │   └── globals.css    # Global styles (dark theme)
│   │   └── components/
│   │       ├── WorkflowTracker.tsx  # Step-by-step progress sidebar
│   │       ├── ReviewPanel.tsx      # Human review buttons + feedback
│   │       └── FindingsPanel.tsx    # Expandable research findings
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.js     # Proxy API calls to backend
└── README.md
```

## Changing LLM Provider

Edit `backend/nodes.py` — the `OllamaClient` class connects to your local Ollama. To use a different model:

```bash
# In .env or environment:
OLLAMA_MODEL=llama3.1      # or mistral, codellama, etc.
OLLAMA_HOST=http://localhost:11434
```
