import uuid
from typing import List
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks  # Alt samlet på én linje!
from fastapi.middleware.cors import CORSMiddleware
from app.core.schemas import Pipeline, PipelineCreate, PipelineStatus
from app.repositories.pipeline_repository import JSONPipelineRepository
import asyncio
import random

app = FastAPI(title="NMS Pipeline Simulator API")

# Enable CORS so our Next.js frontend (on another port) can safely talk to the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],    # Restrict to frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency Injection provider for the repository layer
def get_repository() -> JSONPipelineRepository:
    return JSONPipelineRepository()

# Endpoint to fetch all pipelines
@app.get("/api/pipelines", response_model=List[Pipeline])
def get_pipelines(repo: JSONPipelineRepository = Depends(get_repository)):
    return repo.get_all()

# Endpoint to create a new pipeline
@app.post("/api/pipelines", response_model=Pipeline)
def create_pipeline(payload: PipelineCreate, repo: JSONPipelineRepository = Depends(get_repository)):
    new_pipeline = Pipeline(
        id=str(uuid.uuid4())[:8],   # Generate a short unique ID
        name=payload.name,
        description=payload.description,
        status=PipelineStatus.PENDING
    )
    return repo.save(new_pipeline)

async def simulate_pipeline_execution(pipeline_id: str, repo: JSONPipelineRepository):
    """
    Simulates a heavy medical image analysis in the background.
    Steps: PENDING -> RUNNING -> SUCCESS (or FAILED)
    """
    # 1. Stay in PENDING for 3 seconds, then transition to RUNNING
    await asyncio.sleep(3)
    pipeline = repo.get_by_id(pipeline_id)
    if pipeline:
        pipeline.status = PipelineStatus.RUNNING
        repo.save(pipeline)
        print(f"Pipeline {pipeline_id} is now RUNNING.")

    # 2. Simulate processing time (e.g., AI model interpreting a scan)
    await asyncio.sleep(5)
    pipeline = repo.get_by_id(pipeline_id)
    if pipeline:
        # 90% chance of SUCCESS, 10% chance of FAILED to test error responses later
        pipeline.status = PipelineStatus.SUCCESS if random.random() > 0.1 else PipelineStatus.FAILED
        repo.save(pipeline)
        print(f"Pipeline {pipeline_id} finished with status: {pipeline.status}")

# Endpoint to start a pipeline execution
@app.post("/api/pipelines/{pipeline_id}/start", response_model=Pipeline)
def start_pipeline(
    pipeline_id: str, 
    background_tasks: BackgroundTasks, 
    repo: JSONPipelineRepository = Depends(get_repository)
):
    """
    Triggers the pipeline execution asynchronously in the background.
    """
    pipeline = repo.get_by_id(pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # Validation: Prevent starting a pipeline that is already processing
    if pipeline.status == PipelineStatus.RUNNING:
        raise HTTPException(status_code=400, detail="Pipeline is already running")

    # Set initial state back to PENDING when started
    pipeline.status = PipelineStatus.PENDING
    repo.save(pipeline)

    # Hand over the simulation job to FastAPI's background task manager
    background_tasks.add_task(simulate_pipeline_execution, pipeline_id, repo)
    
    # Return immediately so the API stays non-blocking
    return pipeline