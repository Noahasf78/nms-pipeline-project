import json
import os
from datetime import datetime
from typing import List, Optional
from app.core.schemas import Pipeline, LogEntry

class JSONPipelineRepository:
    def __init__(self, file_path: str = "data/storage.json"):
        self.file_path = file_path
        self._ensure_storage_exists()
        
    # Create directory and empty JSON list if file doesn't exist
    def _ensure_storage_exists(self):
        os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
        if not os.path.exists(self.file_path):
            with open(self.file_path, "w") as f:
                json.dump([], f)
                
    # Helper method to read raw data from the JSON file
    def _read_file(self) -> List[dict]:
        with open(self.file_path, "r") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []

    # Helper method to save raw data back to the JSON file
    def _write_file(self, data: List[dict]):
        with open(self.file_path, "w") as f:
            json.dump(data, f, indent=4, default=str)

    # Fetch all pipelines and convert them to Pydantic objects
    def get_all(self) -> List[Pipeline]:
        raw_data = self._read_file()
        return [Pipeline(**item) for item in raw_data]

    # Find a specific pipeline by its unique ID
    def get_by_id(self, pipeline_id: str) -> Optional[Pipeline]:
        pipelines = self.get_all()
        for p in pipelines:
            if p.id == pipeline_id:
                return p
        return None

    # Handle both creating new pipelines and updating existing ones
    def save(self, pipeline: Pipeline) -> Pipeline:
        pipelines = self.get_all()
        pipeline.updated_at = datetime.utcnow()
        
        # If pipeline exists, update it in place
        for i, p in enumerate(pipelines):
            if p.id == pipeline.id:
                pipelines[i] = pipeline
                self._write_file([p.model_dump() for p in pipelines])
                return pipeline
        
        # If it's new, append it to the list
        pipelines.append(pipeline)
        self._write_file([p.model_dump() for p in pipelines])
        return pipeline

    # Append a structured log message to a specific pipeline
    def append_log(self, pipeline_id: str, message: str, level: str = "INFO") -> Optional[Pipeline]:
        pipeline = self.get_by_id(pipeline_id)
        if not pipeline:
            return None
        
        new_log = LogEntry(message=message, level=level, timestamp=datetime.utcnow())
        pipeline.logs.append(new_log)
        return self.save(pipeline)
    
    # Delete a pipeline by ID from storage
    def delete(self, pipeline_id: str) -> bool:
        pipelines = self.get_all()
        initial_count = len(pipelines)
        
        # Filter out the pipeline to be removed
        filtered_pipelines = [p for p in pipelines if p.id != pipeline_id]
        
        # If lengths match, the ID was not found
        if len(filtered_pipelines) == initial_count:
            return False
            
        self._write_file([p.model_dump() for p in filtered_pipelines])
        return True