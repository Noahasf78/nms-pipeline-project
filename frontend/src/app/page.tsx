'use client';

// Standard React hooks for state management, computed values, side effects, and persistent references
import { useState, useEffect, useRef, useMemo } from 'react';

// Custom hook wrapping TanStack Query for remote API communication
import { usePipelines } from '../hooks/usePipelines';

// TypeScript interfaces ensuring strict typing across backend payloads and log structures
import { PipelineStatus, LogEntry } from '../types/pipeline';

// Notification toast library for user feedback
import toast from 'react-hot-toast';

// Filter options supported in the dashboard view
type FilterStatus = 'ALL' | PipelineStatus;

/**
 * Helper function to map pipeline status to appropriate color-coded UI badges.
 */
const getStatusBadge = (status: PipelineStatus) => {
  switch (status) {
    case 'PENDING':
      return (
        <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-yellow-300">
          PENDING
        </span>
      );
    case 'RUNNING':
      return (
        <span className="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-blue-300 animate-pulse">
          RUNNING...
        </span>
      );
    case 'SUCCESS':
      return (
        <span className="bg-green-100 text-green-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-green-300">
          SUCCESS
        </span>
      );
    case 'FAILED':
      return (
        <span className="bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-red-300">
          FAILED
        </span>
      );
  }
};

/**
 * Helper function to apply specific styling depending on log severity level.
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
  // Theme state persisted in browser storage
  const [darkMode, setDarkMode] = useState(false);

  // Controlled input form states for creating new pipeline configurations
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Search query and active category filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');

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
    deletePipeline,
    isDeleting,
  } = usePipelines();

  /**
   * Load saved theme from localStorage on initial page mount.
   */
  useEffect(() => {
    const savedTheme = localStorage.getItem('nms_theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  /**
   * Toggle between Dark Mode and Light Mode with class application and persistence.
   */
  const handleToggleTheme = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);

    if (nextMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('nms_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('nms_theme', 'light');
    }
  };

  /**
   * Watch status transitions returned by live polling (every 2 seconds) and trigger toasts.
   */
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

      previousStatusMap.current[pipeline.id] = pipeline.status;
    });
  }, [pipelines]);

  /**
   * Compute aggregated metrics for KPI overview cards.
   */
  const metrics = useMemo(() => {
    const total = pipelines.length;
    const running = pipelines.filter((p) => p.status === 'RUNNING').length;
    const success = pipelines.filter((p) => p.status === 'SUCCESS').length;
    const failed = pipelines.filter((p) => p.status === 'FAILED').length;
    const completed = success + failed;
    const successRate = completed > 0 ? Math.round((success / completed) * 100) : 0;

    return { total, running, success, failed, successRate };
  }, [pipelines]);

  /**
   * Filter pipeline list based on search keywords and status tab selection.
   */
  const filteredPipelines = useMemo(() => {
    return pipelines.filter((pipeline) => {
      const matchesStatus =
        statusFilter === 'ALL' ? true : pipeline.status === statusFilter;

      const normalizedQuery = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !normalizedQuery ||
        pipeline.name.toLowerCase().includes(normalizedQuery) ||
        pipeline.id.toLowerCase().includes(normalizedQuery) ||
        (pipeline.description && pipeline.description.toLowerCase().includes(normalizedQuery));

      return matchesStatus && matchesSearch;
    });
  }, [pipelines, statusFilter, searchQuery]);

  const toggleLogs = (id: string) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

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

  const handleDelete = (id: string, pipelineName: string, status: PipelineStatus) => {
    if (status === 'RUNNING') {
      toast.error('Cannot delete an actively running pipeline');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete "${pipelineName}"?`);
    if (confirmed) {
      deletePipeline(id, {
        onSuccess: () => {
          toast.success(`Pipeline "${pipelineName}" deleted`);
        },
        onError: () => {
          toast.error('Failed to delete pipeline');
        },
      });
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 p-8 transition-colors">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Application Header with Theme Toggle */}
        <header className="border-b border-gray-200 dark:border-slate-800 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">NMS Pipeline Simulator</h1>
            <p className="text-gray-600 dark:text-slate-400">CRAI Medical Image Processing Monitoring Dashboard</p>
          </div>

          <button
            onClick={handleToggleTheme}
            aria-label="Toggle Theme"
            className="p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 transition-colors shadow-sm cursor-pointer"
          >
            {darkMode ? (
              <span className="flex items-center gap-2 text-sm font-medium">
                ☀️ Light Mode
              </span>
            ) : (
              <span className="flex items-center gap-2 text-sm font-medium">
                🌙 Dark Mode
              </span>
            )}
          </button>
        </header>

        {/* Analytics & Metrics Overview */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Total Pipelines</span>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{metrics.total}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Active Executions</span>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{metrics.running}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Success Rate</span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{metrics.successRate}%</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Failed Jobs</span>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{metrics.failed}</div>
          </div>
        </section>

        {/* Pipeline Creation Form */}
        <section className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-slate-100">Create New Pipeline</h2>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Pipeline Name (e.g. Brain MRI Segmentation)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-md px-4 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex-1 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-md px-4 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isCreating}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-md text-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isCreating ? 'Creating...' : 'Create Pipeline'}
            </button>
          </form>
        </section>

        {/* Pipelines Search, Filter & List Section */}
        <section className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100">Active Pipelines</h2>

              {/* Search Bar */}
              <input
                type="text"
                placeholder="Search name, description, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-72 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-md px-3 py-1.5 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
              {(['ALL', 'PENDING', 'RUNNING', 'SUCCESS', 'FAILED'] as FilterStatus[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                    statusFilter === tab
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* List States */}
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-slate-400">Loading pipelines...</div>
          ) : isError ? (
            <div className="p-8 text-center text-red-500 dark:text-red-400">
              Failed to connect to backend server. Make sure FastAPI is running!
            </div>
          ) : filteredPipelines.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-slate-400">
              {pipelines.length === 0
                ? 'No pipelines created yet. Create one above to get started.'
                : 'No pipelines match your current search and filter criteria.'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-800">
              {filteredPipelines.map((pipeline) => (
                <div
                  key={pipeline.id}
                  className="p-6 space-y-4 hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{pipeline.name}</h3>
                        {getStatusBadge(pipeline.status)}
                      </div>
                      {pipeline.description && (
                        <p className="text-sm text-gray-600 dark:text-slate-400">{pipeline.description}</p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-slate-500">ID: {pipeline.id}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleLogs(pipeline.id)}
                        className="text-xs font-medium text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 px-3 py-2 rounded-md transition-colors border border-gray-300 dark:border-slate-700 cursor-pointer"
                      >
                        {expandedLogs[pipeline.id]
                          ? 'Hide Logs'
                          : `View Logs (${pipeline.logs?.length || 0})`}
                      </button>

                      <button
                        onClick={() => startPipeline(pipeline.id)}
                        disabled={pipeline.status === 'RUNNING'}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {pipeline.status === 'RUNNING' ? 'Processing...' : 'Start Execution'}
                      </button>

                      <button
                        onClick={() => handleDelete(pipeline.id, pipeline.name, pipeline.status)}
                        disabled={pipeline.status === 'RUNNING' || isDeleting}
                        className="bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 font-medium px-3 py-2 rounded-md text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Execution Log Terminal */}
                  {expandedLogs[pipeline.id] && (
                    <div className="bg-slate-950 text-slate-100 p-4 rounded-md font-mono text-xs space-y-1.5 border border-slate-800 shadow-inner max-h-56 overflow-y-auto">
                      <div className="text-slate-500 border-b border-slate-800 pb-1 mb-2">
                        Execution Console Logs — ID: {pipeline.id}
                      </div>

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