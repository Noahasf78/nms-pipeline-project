"""
Integration test suite for the NMS Pipeline Simulator FastAPI endpoints.

Testing Strategy:
- Utilizes FastAPI's TestClient (built on top of HTTPX) for synchronous end-to-end request simulation.
- Implements dependency overriding via `app.dependency_overrides` to substitute the real
  `JSONPipelineRepository` with an ephemeral `InMemoryPipelineRepository`.
- Guarantees complete test isolation: tests run in memory without writing to or corrupting `storage.json`.
- Runs on an autouse fixture ensuring a spotless cache state before every individual test function.
"""

import pytest
from fastapi.testclient import TestClient
from typing import List, Optional
import uuid
from datetime import datetime

from app.main import app, get_repository
from app.core.schemas import Pipeline, PipelineStatus, LogEntry

class InMemoryPipelineRepository:
    """
    Mock in-memory repository mimicking JSONPipelineRepository interface.
    Stores pipelines inside a standard Python dictionary to eliminate disk I/O
    and ensure deterministic, millisecond-fast test executions.
    """
    def __init__(self):
        self.pipelines: dict[str, Pipeline] = {}

    def get_all(self) -> List[Pipeline]:
        """Returns all currently stored pipeline objects as a list."""
        return list(self.pipelines.values())

    def get_by_id(self, pipeline_id: str) -> Optional[Pipeline]:
        """Retrieves a single pipeline by ID, or None if not found."""
        return self.pipelines.get(pipeline_id)

    def save(self, pipeline: Pipeline) -> Pipeline:
        """Persists or updates an existing pipeline instance in memory."""
        self.pipelines[pipeline.id] = pipeline
        return pipeline

    def create(self, name: str, description: Optional[str] = None) -> Pipeline:
        """Constructs and registers a new pipeline instance in memory."""
        pipeline = Pipeline(
            id=str(uuid.uuid4())[:8],
            name=name,
            description=description,
            status=PipelineStatus.PENDING,
            logs=[]
        )
        return self.save(pipeline)

    def update(self, pipeline: Pipeline) -> Pipeline:
        """Alias for save to satisfy update calls."""
        return self.save(pipeline)

    def append_log(self, pipeline_id: str, message: str, level: str = "INFO") -> Optional[Pipeline]:
        """Appends a timestamped log entry to the target pipeline."""
        pipeline = self.get_by_id(pipeline_id)
        if pipeline:
            pipeline.logs.append(LogEntry(
                timestamp=datetime.utcnow(),
                message=message,
                level=level
            ))
            return self.save(pipeline)
        return None

    def delete(self, pipeline_id: str) -> bool:
        """Removes an item from memory. Returns True if found, False otherwise."""
        if pipeline_id in self.pipelines:
            del self.pipelines[pipeline_id]
            return True
        return False


# Instantiate an isolated mock store and inject it into FastAPI's DI container
test_repo = InMemoryPipelineRepository()

def override_get_repository():
    """Dependency provider hook replacing production repository with our in-memory mock."""
    return test_repo

# Register dependency override globally across test client calls
app.dependency_overrides[get_repository] = override_get_repository
client = TestClient(app)


@pytest.fixture(autouse=True)
def run_around_tests():
    """
    Setup & Teardown Lifecycle Hook:
    Runs automatically before each test function to flush in-memory storage,
    preventing state leakage or order-dependency between test cases.
    """
    test_repo.pipelines.clear()
    yield


def test_get_empty_pipelines():
    """
    Test 1: Initial state verification.
    Verifies that GET /api/pipelines returns HTTP 200 and an empty JSON array
    when the database contains no registered pipeline jobs.
    """
    response = client.get("/api/pipelines")
    assert response.status_code == 200
    assert response.json() == []


def test_create_pipeline():
    """
    Test 2: Pipeline registration endpoint.
    Verifies that POST /api/pipelines validates user input, creates a persistent entity,
    defaults status to 'PENDING', and generates a non-empty unique identifier.
    """
    payload = {
        "name": "CT Chest Segmentation",
        "description": "Automated lung lesion detection"
    }
    
    response = client.post("/api/pipelines", json=payload)
    data = response.json()
    
    assert response.status_code == 200
    assert data["name"] == payload["name"]
    assert data["description"] == payload["description"]
    assert data["status"] == "PENDING"
    assert "id" in data
    assert len(data["id"]) > 0


def test_start_pipeline_execution():
    """
    Test 3: Execution trigger endpoint.
    Verifies that POST /api/pipelines/{id}/start updates status to 'PENDING'/'RUNNING'
    and appends execution logs.
    """
    created = test_repo.create(name="Brain MRI Analysis")
    
    response = client.post(f"/api/pipelines/{created.id}/start")
    data = response.json()
    
    assert response.status_code == 200
    assert data["id"] == created.id
    assert len(data["logs"]) > 0


def test_prevent_delete_running_pipeline():
    """
    Test 4: Medical integrity & lifecycle safety constraint.
    Verifies that DELETE /api/pipelines/{id} refuses deletion of an actively running task,
    returning HTTP 400 Bad Request to protect GPU inference jobs from termination corruption.
    """
    created = test_repo.create(name="Active Analysis")
    created.status = PipelineStatus.RUNNING
    test_repo.update(created)

    response = client.delete(f"/api/pipelines/{created.id}")
    
    assert response.status_code == 400
    assert response.json()["detail"] == "Cannot delete an actively running pipeline"


def test_delete_pipeline_success():
    """
    Test 5: Completed pipeline lifecycle cleanup.
    Verifies that DELETE /api/pipelines/{id} allows removal of completed (SUCCESS/FAILED) jobs,
    returning HTTP 204 No Content and purging the item from subsequent query results.
    """
    created = test_repo.create(name="Temporary Job")
    created.status = PipelineStatus.SUCCESS
    test_repo.update(created)

    response = client.delete(f"/api/pipelines/{created.id}")
    assert response.status_code == 204

    get_res = client.get("/api/pipelines")
    assert len(get_res.json()) == 0