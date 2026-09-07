import uuid
import asyncio
import random
from typing import List
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from app.core.schemas import Pipeline, PipelineCreate, PipelineStatus, LogEntry
from app.repositories.pipeline_repository import JSONPipelineRepository

app = FastAPI(title="NMS Pipeline Simulator API")

# Enable CORS so Next.js frontend can safely talk to the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency Injection provider for repository
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
        id=str(uuid.uuid4())[:8],
        name=payload.name,
        description=payload.description,
        status=PipelineStatus.PENDING,
        logs=[
            LogEntry(
                message="Pipeline initialized and registered in system.",
                level="INFO"
            )
        ]
    )
    return repo.save(new_pipeline)

async def simulate_pipeline_execution(pipeline_id: str, repo: JSONPipelineRepository):
    """
    Simulates a 3-step medical image analysis in the background with continuous logging.
    """
    # Step 1: Initialize execution
    await asyncio.sleep(2)
    pipeline = repo.get_by_id(pipeline_id)
    if pipeline:
        pipeline.status = PipelineStatus.RUNNING
        repo.save(pipeline)
        repo.append_log(pipeline_id, "Execution started. Processing container spawned.", "INFO")

    # Step 2: Ingest & Preprocess DICOM
    await asyncio.sleep(2.5)
    repo.append_log(pipeline_id, "Step 1/3: Ingesting DICOM series and normalizing voxel intensities.", "INFO")

    # Step 3: Run AI Model Inference
    await asyncio.sleep(2.5)
    repo.append_log(pipeline_id, "Step 2/3: Executing 3D UNet segmentation model on GPU.", "INFO")

    # Step 4: Finalize and export
    await asyncio.sleep(2)
    pipeline = repo.get_by_id(pipeline_id)
    if pipeline:
        is_success = random.random() > 0.10  # 90% success rate
        if is_success:
            pipeline.status = PipelineStatus.SUCCESS
            repo.save(pipeline)
            repo.append_log(pipeline_id, "Step 3/3: Segmentation mask exported to PACS successfully.", "SUCCESS")
        else:
            pipeline.status = PipelineStatus.FAILED
            repo.save(pipeline)
            repo.append_log(pipeline_id, "Step 3/3: Process terminated: Out of VRAM during mask reconstruction.", "ERROR")

# Endpoint to start pipeline execution
@app.post("/api/pipelines/{pipeline_id}/start", response_model=Pipeline)
def start_pipeline(
    pipeline_id: str, 
    background_tasks: BackgroundTasks, 
    repo: JSONPipelineRepository = Depends(get_repository)
):
    pipeline = repo.get_by_id(pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    if pipeline.status == PipelineStatus.RUNNING:
        raise HTTPException(status_code=400, detail="Pipeline is already running")

    # Reset status to PENDING and append start request log
    pipeline.status = PipelineStatus.PENDING
    repo.save(pipeline)
    repo.append_log(pipeline_id, "Execution queued by user.", "INFO")

    # Dispatch to background tasks
    background_tasks.add_task(simulate_pipeline_execution, pipeline_id, repo)
    return pipeline

# Endpoint to delete an existing pipeline
@app.delete("/api/pipelines/{pipeline_id}", status_code=204)
def delete_pipeline(pipeline_id: str, repo: JSONPipelineRepository = Depends(get_repository)):
    """
    Deletes a pipeline and its execution history by unique ID.
    """
    pipeline = repo.get_by_id(pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
        
    # Prevent deleting a pipeline currently executing in the background
    if pipeline.status == PipelineStatus.RUNNING:
        raise HTTPException(status_code=400, detail="Cannot delete an actively running pipeline")

    deleted = repo.delete(pipeline_id)
    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete pipeline")
        
    return None