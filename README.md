# NMS Pipeline Simulator

A full-stack medical image processing pipeline simulator built with **FastAPI** and **Next.js**.

The system simulates asynchronous DICOM inference workloads such as organ segmentation and anomaly detection in a clinical research environment. It provides real-time pipeline monitoring, execution logs, safety guardrails, and operational metrics.

## Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                   Next.js Frontend                      │
│                                                         │
│   React 19 · TypeScript · Tailwind CSS                  │
│   TanStack Query · Axios                                │
└────────────────────────────┬────────────────────────────┘
                             │
                       HTTP REST / JSON
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                   FastAPI Backend                       │
│                                                         │
│   Pydantic v2 · BackgroundTasks                         │
│   Dependency Injection                                  │
└────────────────────────────┬────────────────────────────┘
                             │
                          File I/O
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│               JSON Pipeline Repository                  │
│                                                         │
│   Persistent storage.json                               │
│   In-memory repository for testing                      │
└─────────────────────────────────────────────────────────┘
```

## Features

- **Real-time monitoring** - TanStack Query polls the backend every 2 seconds for pipeline state changes.
- **Asynchronous execution** - FastAPI background tasks simulate multi-stage medical inference workloads.
- **Execution logs** - Timestamped `INFO`, `WARNING`, `SUCCESS`, and `ERROR` events.
- **Safety guardrails** - Prevents destructive operations on pipelines currently in `RUNNING` state.
- **Dashboard analytics** - KPI cards, search, filtering, success rates, and failure tracking.
- **Dark / Light mode** - Persistent theme preference using `localStorage`.
- **Automated testing** - Backend integration tests using `pytest` and isolated in-memory repositories.

### Pipeline Lifecycle

```text
PENDING → RUNNING → SUCCESS
                  ↘ FAILED
```

A simulated execution can include:

```text
1. Load DICOM series
2. Normalize image data
3. Run model inference
4. Post-process output
5. Export result
```

## Tech Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| **Data Fetching** | TanStack Query v5, Axios |
| **Backend** | Python 3.13, FastAPI, Uvicorn, Pydantic v2 |
| **Testing** | Pytest, HTTPX |
| **Persistence** | JSON filesystem repository |

## Project Structure

```text
nms-pipeline-project/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   └── schemas.py
│   │   ├── repositories/
│   │   │   └── pipeline_repository.py
│   │   └── main.py
│   ├── data/
│   │   └── storage.json
│   ├── tests/
│   │   └── test_pipelines.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── axiosInstance.ts
│   │   │   └── pipelineApi.ts
│   │   ├── app/
│   │   │   ├── favicon.ico
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── hooks/
│   │   │   └── usePipelines.ts
│   │   ├── providers/
│   │   │   └── QueryProvider.tsx
│   │   └── types/
│   │       └── pipeline.ts
│   └── package.json
│
└── README.md
```

## Getting Started

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
```

Activate the environment:

**Windows**

```powershell
.\venv\Scripts\Activate.ps1
```

**macOS / Linux**

```bash
source venv/bin/activate
```

Install dependencies and start the API:

```bash
pip install fastapi uvicorn pydantic pytest httpx
uvicorn app.main:app --reload
```

The FastAPI documentation is available at:

`http://127.0.0.1:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open:

`http://localhost:3000`

## Running Tests

Run the backend integration tests with:

```bash
cd backend
python -m pytest -v
```

Tests use an isolated `InMemoryPipelineRepository` through FastAPI's `dependency_overrides`, ensuring that test runs do not modify the persistent `storage.json` file.

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/pipelines` | Fetch all pipelines |
| `POST` | `/api/pipelines` | Create a pipeline |
| `POST` | `/api/pipelines/{id}/start` | Start pipeline execution |
| `DELETE` | `/api/pipelines/{id}` | Delete a pipeline unless it is running |

## Development Context

This project was developed as a simulation of an asynchronous medical AI pipeline monitoring system in the context of **Computational Radiology & Artificial Intelligence (CRAI)**.

The application focuses on software architecture and operational concepts around medical AI workflows rather than performing real clinical inference.

---

**NMS Pipeline Simulator** - FastAPI · Next.js · TanStack Query