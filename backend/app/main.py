import uuid
from typing import List
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.core.schemas import Pipeline, PipelineCreate, PipelineStatus
from app.repositories.pipeline_repository import JSONPipelineRepository

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

# Endpoint to start a pipeline execution
@app.post("/api/pipelines/{pipeline_id}/start", response_model=Pipeline)
def start_pipeline(pipeline_id: str, repo: JSONPipelineRepository = Depends(get_repository)):
    pipeline = repo.get_by_id(pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline ikke funnet")
    
    # Temporary placeholder: Changes status instantly. 
    # Will be replaced with an async background simulation on Day 2!
    pipeline.status = PipelineStatus.RUNNING
    return repo.save(pipeline)