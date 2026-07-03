from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

# Define allowed statuses to prevent typos (strict typing)
class PipelineStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"

# Base fields shared across creation and reading
class PipelineBase(BaseModel):
    name: str
    description: Optional[str] = None

# Schema used when creating a new pipeline via POST requests
class PipelineCreate(PipelineBase):
    pass

# Complete schema representing how a pipeline looks in storage/responses
class Pipeline(PipelineBase):
    id: str
    status: PipelineStatus = PipelineStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Enables Pydantic to parse data from standard Python objects/dicts
    class Config:
        from_attributes = True