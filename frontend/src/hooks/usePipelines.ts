import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPipelines, createPipeline, startPipeline } from '../api/pipelineApi';
import { PipelineCreate } from '../types/pipeline';

export const usePipelines = () => {
  const queryClient = useQueryClient();

  // Query to automatically fetch pipelines and poll every 2 seconds
  const pipelinesQuery = useQuery({
    queryKey: ['pipelines'],
    queryFn: fetchPipelines,
    refetchInterval: 2000,
  });

  // Mutation to create a new pipeline
  const createMutation = useMutation({
    mutationFn: (newPipeline: PipelineCreate) => createPipeline(newPipeline),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });

  // Mutation to start an existing pipeline
  const startMutation = useMutation({
    mutationFn: (pipelineId: string) => startPipeline(pipelineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });

  return {
    pipelines: pipelinesQuery.data || [],
    isLoading: pipelinesQuery.isLoading,
    isError: pipelinesQuery.isError,
    createPipeline: createMutation.mutate,
    isCreating: createMutation.isPending,
    startPipeline: startMutation.mutate,
    isStarting: startMutation.isPending,
  };
};