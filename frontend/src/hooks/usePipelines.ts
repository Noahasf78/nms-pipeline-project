import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPipelines, createPipeline, startPipeline } from '../api/pipelineApi';
import { Pipeline, PipelineCreate } from '../types/pipeline';

export const usePipelines = () => {
  const queryClient = useQueryClient();

  // Polling query: fetches all pipelines every 2 seconds
  const pipelinesQuery = useQuery({
    queryKey: ['pipelines'],
    queryFn: fetchPipelines,
    refetchInterval: 2000,
  });

  // Create Pipeline Mutation with Optimistic Update
  const createMutation = useMutation({
    mutationFn: (newPipeline: PipelineCreate) => createPipeline(newPipeline),
    onMutate: async (newPipeline) => {
      // 1. Cancel ongoing outgoing queries to prevent cache overwrite
      await queryClient.cancelQueries({ queryKey: ['pipelines'] });

      // 2. Snapshot previous cache state for rollback on error
      const previousPipelines = queryClient.getQueryData<Pipeline[]>(['pipelines']);

      // 3. Optimistically update local cache with a temporary pipeline object
      if (previousPipelines) {
        const optimisticEntry: Pipeline = {
          id: `temp-${Date.now()}`,
          name: newPipeline.name,
          description: newPipeline.description,
          status: 'PENDING',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        queryClient.setQueryData<Pipeline[]>(['pipelines'], [
          optimisticEntry,
          ...previousPipelines,
        ]);
      }

      return { previousPipelines };
    },
    // Rollback to previous state if the API call fails
    onError: (_err, _newPipeline, context) => {
      if (context?.previousPipelines) {
        queryClient.setQueryData(['pipelines'], context.previousPipelines);
      }
    },
    // Always refetch from server on completion to ensure perfect synchronization
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });

  // Start Pipeline Mutation with Optimistic Update
  const startMutation = useMutation({
    mutationFn: (pipelineId: string) => startPipeline(pipelineId),
    onMutate: async (pipelineId) => {
      // 1. Cancel ongoing queries
      await queryClient.cancelQueries({ queryKey: ['pipelines'] });

      // 2. Snapshot previous state
      const previousPipelines = queryClient.getQueryData<Pipeline[]>(['pipelines']);

      // 3. Optimistically flip status to RUNNING locally in cache
      if (previousPipelines) {
        queryClient.setQueryData<Pipeline[]>(
          ['pipelines'],
          previousPipelines.map((p) =>
            p.id === pipelineId ? { ...p, status: 'RUNNING' } : p
          )
        );
      }

      return { previousPipelines };
    },
    onError: (_err, _pipelineId, context) => {
      if (context?.previousPipelines) {
        queryClient.setQueryData(['pipelines'], context.previousPipelines);
      }
    },
    onSettled: () => {
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