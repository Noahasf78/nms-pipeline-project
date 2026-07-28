// Enum representing the allowed pipeline status states from the FastAPI backend
export type PipelineStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';

// Interface for creating a new pipeline (Payload sent to POST /api/pipelines)
export interface PipelineCreate {
  name: string;
  description?: string;
}

// Interface for a complete Pipeline object returned by the API
export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  status: PipelineStatus;
  created_at: string;
  updated_at: string;
}