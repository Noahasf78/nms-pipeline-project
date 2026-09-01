'use client';

import { useState, useEffect, useRef } from 'react';
import { usePipelines } from '../hooks/usePipelines';
import { PipelineStatus } from '../types/pipeline';
import toast from 'react-hot-toast';

// Helper function to color code different status states
const getStatusBadge = (status: PipelineStatus) => {
  switch (status) {
    case 'PENDING':
      return (
        <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-yellow-300">
          PENDING
        </span>
      );
    case 'RUNNING':
      return (
        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-blue-300 animate-pulse">
          RUNNING...
        </span>
      );
    case 'SUCCESS':
      return (
        <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-green-300">
          SUCCESS
        </span>
      );
    case 'FAILED':
      return (
        <span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-red-300">
          FAILED
        </span>
      );
  }
};

export default function Dashboard() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Track previous statuses to detect real-time transitions
  const previousStatusMap = useRef<Record<string, PipelineStatus>>({});

  const {
    pipelines,
    isLoading,
    isError,
    createPipeline,
    isCreating,
    startPipeline,
  } = usePipelines();

  // Side-effect: Listen for status changes and trigger toasts on completion or failure
  useEffect(() => {
    pipelines.forEach((pipeline) => {
      const prevStatus = previousStatusMap.current[pipeline.id];

      if (prevStatus && prevStatus !== pipeline.status) {
        if (pipeline.status === 'FAILED') {
          toast.error(`Pipeline "${pipeline.name}" failed execution!`, {
            duration: 4000,
          });
        } else if (pipeline.status === 'SUCCESS') {
          toast.success(`Pipeline "${pipeline.name}" completed successfully!`, {
            duration: 4000,
          });
        }
      }

      // Update ref with current status
      previousStatusMap.current[pipeline.id] = pipeline.status;
    });
  }, [pipelines]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createPipeline(
      { name, description },
      {
        onSuccess: () => {
          toast.success('Pipeline created successfully');
          setName('');
          setDescription('');
        },
      }
    );
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="border-b pb-4">
          <h1 className="text-3xl font-bold text-gray-900">NMS Pipeline Simulator</h1>
          <p className="text-gray-600">CRAI Medical Image Processing Monitoring Dashboard</p>
        </header>

        {/* Create Pipeline Form */}
        <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Create New Pipeline</h2>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Pipeline Name (e.g. Brain MRI Segmentation)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 border rounded-md px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex-1 border rounded-md px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isCreating}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-md text-sm transition-colors disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Pipeline'}
            </button>
          </form>
        </section>

        {/* Pipelines List */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800">Active Pipelines</h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading pipelines...</div>
          ) : isError ? (
            <div className="p-8 text-center text-red-500">
              Failed to connect to backend server. Make sure FastAPI is running!
            </div>
          ) : pipelines.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No pipelines created yet. Create one above to get started.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {pipelines.map((pipeline) => (
                <div
                  key={pipeline.id}
                  className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{pipeline.name}</h3>
                      {getStatusBadge(pipeline.status)}
                    </div>
                    {pipeline.description && (
                      <p className="text-sm text-gray-600">{pipeline.description}</p>
                    )}
                    <p className="text-xs text-gray-400">ID: {pipeline.id}</p>
                  </div>

                  <div>
                    <button
                      onClick={() => startPipeline(pipeline.id)}
                      disabled={pipeline.status === 'RUNNING'}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {pipeline.status === 'RUNNING' ? 'Processing...' : 'Start Execution'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}