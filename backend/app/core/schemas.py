from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

# Define allowed statuses to prevent typos (strict typing)
class PipelineStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"

# Structured log model for execution history
class LogEntry(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    message: str
    level: str = "INFO"  # INFO, WARNING, ERROR, SUCCESS

    class Config:
        from_attributes = True

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
    logs: List[LogEntry] = Field(default_factory=list)

    # Enables Pydantic to parse data from standard Python objects/dicts
    class Config:
        from_attributes = True