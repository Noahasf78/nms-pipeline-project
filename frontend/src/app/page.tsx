'use client';

// Standard React hooks for state management, side effects, and persistent references
import { useState, useEffect, useRef } from 'react';

// Custom hook wrapping TanStack Query for remote API communication
import { usePipelines } from '../hooks/usePipelines';

// TypeScript interfaces ensuring strict typing across backend payloads and log structures
import { PipelineStatus, LogEntry } from '../types/pipeline';

// Notification toast library for user feedback
import toast from 'react-hot-toast';

/**
 * Helper function to map pipeline status to appropriate color-coded UI badges.
 * Provides instant visual context on the lifecycle state of each processing task.
 */
const getStatusBadge = (status: PipelineStatus) => {
  switch (status) {
    case 'PENDING':
      return (
        <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-yellow-300">
          PENDING
        </span>
      );
    case 'RUNNING':
      // Pulse animation indicates active computation in the background
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

/**
 * Helper function to apply specific styling depending on log severity level.
 * Mirrors classic IDE / Linux terminal color schemes (e.g. red for errors, emerald for success).
 */
const getLogLevelColor = (level: string) => {
  switch (level) {
    case 'ERROR':
      return 'text-red-400 font-semibold';
    case 'SUCCESS':
      return 'text-emerald-400 font-semibold';
    case 'WARNING':
      return 'text-amber-400 font-semibold';
    default:
      return 'text-sky-300';
  }
};

export default function Dashboard() {
  // Controlled input form states for creating new pipeline configurations
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Tracks open/closed toggle states for the log terminal panel of each pipeline (keyed by pipeline.id)
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  // useRef stores previous status values across re-renders without triggering additional renders
  const previousStatusMap = useRef<Record<string, PipelineStatus>>({});

  // Destructure query results and mutation triggers from custom TanStack Query hook
  const {
    pipelines,
    isLoading,
    isError,
    createPipeline,
    isCreating,
    startPipeline,
  } = usePipelines();

  /**
   * Side Effect: Watches status transitions returned by live polling (every 2 seconds).
   * Fires a success or failure toast only when a transition finishes (e.g. RUNNING -> SUCCESS).
   */
  useEffect(() => {
    pipelines.forEach((pipeline) => {
      const prevStatus = previousStatusMap.current[pipeline.id];

      // Verify that status actually changed from a prior known state
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

      // Record the latest observed status for comparison on the next poll cycle
      previousStatusMap.current[pipeline.id] = pipeline.status;
    });
  }, [pipelines]);

  /**
   * Toggle visibility of the console log viewer for a targeted pipeline item.
   */
  const toggleLogs = (id: string) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  /**
   * Dispatches create pipeline request to backend API and clears input fields on success.
   */
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
        {/* Application Header */}
        <header className="border-b pb-4">
          <h1 className="text-3xl font-bold text-gray-900">NMS Pipeline Simulator</h1>
          <p className="text-gray-600">CRAI Medical Image Processing Monitoring Dashboard</p>
        </header>

        {/* Section 1: Form to register new pipelines */}
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

        {/* Section 2: Real-time list of all registered pipelines */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800">Active Pipelines</h2>
          </div>

          {/* Fallback states for initial loading, errors, and empty lists */}
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
                  className="p-6 space-y-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Pipeline summary line with controls */}
                  <div className="flex items-center justify-between">
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

                    <div className="flex items-center gap-3">
                      {/* Button to toggle collapsible terminal logs */}
                      <button
                        onClick={() => toggleLogs(pipeline.id)}
                        className="text-xs font-medium text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md transition-colors border border-gray-300"
                      >
                        {expandedLogs[pipeline.id]
                          ? 'Hide Logs'
                          : `View Logs (${pipeline.logs?.length || 0})`}
                      </button>

                      {/* Trigger button for starting simulation execution */}
                      <button
                        onClick={() => startPipeline(pipeline.id)}
                        disabled={pipeline.status === 'RUNNING'}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {pipeline.status === 'RUNNING' ? 'Processing...' : 'Start Execution'}
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Execution Log Terminal */}
                  {expandedLogs[pipeline.id] && (
                    <div className="bg-slate-950 text-slate-100 p-4 rounded-md font-mono text-xs space-y-1.5 border border-slate-800 shadow-inner max-h-56 overflow-y-auto">
                      {/* Terminal header line */}
                      <div className="text-slate-500 border-b border-slate-800 pb-1 mb-2">
                        Execution Console Logs — ID: {pipeline.id}
                      </div>

                      {/* Output each log entry with timestamp and severity tag */}
                      {pipeline.logs && pipeline.logs.length > 0 ? (
                        pipeline.logs.map((log: LogEntry, index: number) => (
                          <div key={index} className="flex items-start gap-2">
                            <span className="text-slate-500 shrink-0">
                              [{new Date(log.timestamp).toLocaleTimeString()}]
                            </span>
                            <span className={`shrink-0 ${getLogLevelColor(log.level)}`}>
                              [{log.level}]
                            </span>
                            <span className="text-slate-200">{log.message}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-600">No logs generated yet.</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}