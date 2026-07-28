import api from './axiosInstance';
import { Pipeline, PipelineCreate } from '@/types/pipeline';

// Fetch all existing pipelines from the backend
export const fetchPipelines = async (): Promise<Pipeline[]> => {
  const response = await api.get<Pipeline[]>('/pipelines');
  return response.data;
};

// Create a brand new pipeline entry
export const createPipeline = async (data: PipelineCreate): Promise<Pipeline> => {
  const response = await api.post<Pipeline>('/pipelines', data);
  return response.data;
};

// Trigger asynchronous background execution for a given pipeline
export const startPipeline = async (pipelineId: string): Promise<Pipeline> => {
  const response = await api.post<Pipeline>(`/pipelines/${pipelineId}/start`);
  return response.data;
};