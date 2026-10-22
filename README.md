# LangGraph Research Agent

A local research assistant powered by Ollama and orchestrated by LangGraph.
Research questions run as parallel graph tasks; findings are reduced into shared
state; human review pauses the graph; and SQLite checkpoints let you resume a
run later. The app calls Ollama through Python's standard-library HTTP client,
without a LangChain model adapter.

**LangGraph is required.** This app has no plain-Python workflow fallback;
without LangGraph it will stop with an installation message.

See [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) for project scope, workflow,
stakeholders, risks, and a from-scratch explanation of LangGraph in this app.

```text
                 ┌─ Research question 1 ─┐
Planner ─────────├─ Research question 2 ─┤── Writer ── Human review
                 └─ Research question N ─┘                  │
                                      revise / research_more ┘
                                                approve ── Publisher
```

## Setup

### 1. Install Python and Ollama

Install Python 3.10+ and Ollama:

- Python: https://www.python.org/downloads/
- Ollama: https://ollama.com/download

Download the local model:

```powershell
ollama pull llama3
```

Keep Ollama running while using the app. No cloud API key is needed.

### 2. Install project dependencies

From the project folder, activate your virtual environment and install the
LangGraph runtime and SQLite checkpoint saver:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

### 3. Start a research run

```powershell
python main.py "How does RAG work?"
```

The workflow:

1. Plans focused research questions.
2. Fans those questions out to parallel LangGraph tasks.
3. Merges the findings through a state reducer and writes a report.
4. Pauses at a LangGraph human-review interrupt.
5. Revises, researches more, or publishes based on your decision.

## Checkpoints and resume

Each run receives a thread ID and is checkpointed in
`research_checkpoints.sqlite`. The thread ID is printed when the run starts.
If you stop the program while it is waiting for review, resume that exact graph
state with:

```powershell
python main.py --resume THREAD_ID
```

The SQLite database is local and should be kept private. Do not delete it if
you want to resume saved runs.

The workflow caps parallel question tasks at three to avoid overloading a
local model. Review choices use LangGraph conditional routes: revise the draft,
fan out another research task, or approve and publish.

## Ollama configuration

The defaults are model `llama3` and server `http://localhost:11434`. Override
them in PowerShell if needed:

```powershell
$env:OLLAMA_MODEL = "your-installed-model"
$env:OLLAMA_HOST = "http://localhost:11434"
```

## Project structure

| File | Responsibility |
|---|---|
| `state.py` | Typed graph state and parallel-findings reducer |
| `nodes.py` | Planner, parallel researcher, writer, review interrupt, publisher, Ollama HTTP client |
| `graph.py` | StateGraph topology, fan-out, and conditional review routing |
| `main.py` | CLI, SQLite checkpointer, and interrupt resume flow |

This demo researches from the local model's existing knowledge; it does not
perform web search or independently verify citations.

## LangGraph features used

- **StateGraph** defines the workflow and typed state.
- **Send** fans out independent question research in parallel.
- A state **reducer** merges findings from parallel tasks.
- **Interrupts** pause at review and accept a decision when resumed.
- The **SQLite checkpointer** persists graph state across process exits.
- **Conditional routing** loops back to revision or research, or finishes by
  publishing the approved report.
