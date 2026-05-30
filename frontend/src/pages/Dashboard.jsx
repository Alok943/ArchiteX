import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Activity, Clock, FileJson2, Cpu, Inbox } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { MetricDisplay } from '../components/ui/MetricDisplay';
import { getHistory } from '../lib/api';

function formatTimeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function Dashboard() {
  const [history, setHistory] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const totalRuns = history.length;
  const successRuns = history.filter((h) => h.status === 'success').length;
  const successRate = totalRuns > 0 ? ((successRuns / totalRuns) * 100).toFixed(1) : '0.0';
  const avgRetries =
    totalRuns > 0
      ? (history.reduce((sum, h) => sum + (h.retry_count || 0), 0) / totalRuns).toFixed(1)
      : '0';
  const avgLatency =
    totalRuns > 0
      ? (history.reduce((sum, h) => sum + (h.latency_ms || 0), 0) / totalRuns / 1000).toFixed(1)
      : '0';

  return (
    <div className="flex flex-col gap-8 h-full animate-in fade-in duration-500">
      
      {/* Header Area */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline-lg primary-gradient-text">Architex Pipeline</h1>
          <p className="text-on-surface-variant mt-2 font-code-sm">Compiler pipeline overview and recent job history.</p>
        </div>
        <button
          onClick={() => navigate('/playground')}
          className="bg-primary hover:bg-primary/90 text-on-primary px-6 py-2.5 rounded-lg font-label-xs font-bold tracking-widest flex items-center justify-center gap-2 transition-colors neon-glow neon-focus"
        >
          <Play className="w-4 h-4" />
          <span>New Compilation</span>
        </button>
      </header>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricDisplay label="Total Runs" value={String(totalRuns)} icon={Activity} />
        <MetricDisplay label="Avg Latency" value={`${avgLatency}s`} trend={totalRuns > 1 ? `${avgRetries} avg retries` : undefined} icon={Clock} />
        <MetricDisplay label="Success Rate" value={`${successRate}%`} trend={totalRuns > 0 ? `${successRuns}/${totalRuns} passed` : undefined} icon={CheckCircleIcon} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pipeline Visualization */}
        <GlassCard className="lg:col-span-2 p-panel-padding">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-headline-md text-on-surface">Live Pipeline Topology</h2>
            <StatusBadge status="running" label="System Healthy" />
          </div>
          
          <div className="relative h-64 bg-surface-container-lowest rounded-lg border border-outline-variant/30 flex items-center justify-between p-8 overflow-hidden">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            
            {/* Node 1 */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-surface-container-highest border border-outline flex items-center justify-center neon-glow">
                <FileJson2 className="w-8 h-8 text-primary" />
              </div>
              <span className="mt-4 font-label-xs text-on-surface-variant">NL Prompt</span>
            </div>

            {/* Connector 1 */}
            <div className="relative flex-1 h-px mx-4">
              <svg className="absolute w-full h-full overflow-visible" preserveAspectRatio="none">
                <line x1="0" y1="0" x2="100%" y2="0" stroke="var(--color-primary)" strokeWidth="2" className="animated-line" />
              </svg>
            </div>

            {/* Node 2 */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/20 border-2 border-primary flex items-center justify-center relative">
                <div className="absolute inset-0 rounded-2xl bg-primary pulse-dot opacity-20"></div>
                <Cpu className="w-10 h-10 text-primary z-10" />
              </div>
              <span className="mt-4 font-label-xs text-primary">Compiler Core</span>
            </div>

            {/* Connector 2 */}
            <div className="relative flex-1 h-px mx-4">
              <svg className="absolute w-full h-full overflow-visible" preserveAspectRatio="none">
                <line x1="0" y1="0" x2="100%" y2="0" stroke="var(--color-primary)" strokeWidth="2" strokeDasharray="4 4" className="animated-line opacity-50" />
              </svg>
            </div>

            {/* Node 3 */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-surface-container-highest border border-outline flex items-center justify-center">
                <FileJson2 className="w-8 h-8 text-on-surface-variant" />
              </div>
              <span className="mt-4 font-label-xs text-on-surface-variant">Schema Out</span>
            </div>
          </div>
        </GlassCard>

        {/* Recent Runs Table */}
        <GlassCard className="p-panel-padding flex flex-col h-[400px]">
          <h2 className="font-headline-md text-on-surface mb-6">Recent Jobs</h2>
          
          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-on-surface-variant">
                <Inbox className="w-10 h-10 opacity-40" />
                <p className="font-label-xs text-center">No compilations yet.</p>
                <button
                  onClick={() => navigate('/playground')}
                  className="text-primary font-label-xs hover:underline"
                >
                  Go to Playground →
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {history.slice(0, 10).map((job) => (
                  <div key={job.id} className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/30 flex items-center justify-between hover:border-primary/50 transition-colors cursor-pointer group">
                    <div className="min-w-0 flex-1">
                      <div className="font-code-sm text-on-surface group-hover:text-primary transition-colors truncate">{job.id}</div>
                      <div className="font-label-xs text-on-surface-variant mt-1 truncate">{job.prompt?.slice(0, 40) || 'N/A'} • {formatTimeAgo(job.time)}</div>
                    </div>
                    <StatusBadge status={job.status} label={job.status === 'success' ? 'OK' : job.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>
      </div>

    </div>
  );
}

function CheckCircleIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
