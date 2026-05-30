import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Activity, Clock, FileJson2, Cpu, Inbox, Brain, Layers, ShieldCheck, CheckCircle } from 'lucide-react';
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

const PIPELINE_STAGES = [
  { id: 1, name: 'Intent',   label: 'Intent Extraction',   icon: Brain,       color: 'text-primary',   border: 'border-primary/60',   bg: 'bg-primary/10'   },
  { id: 2, name: 'Design',   label: 'System Design',       icon: Cpu,         color: 'text-secondary', border: 'border-secondary/60', bg: 'bg-secondary/10' },
  { id: 3, name: 'Schema',   label: 'Schema Generation',   icon: FileJson2,   color: 'text-tertiary',  border: 'border-tertiary/60',  bg: 'bg-tertiary/10'  },
  { id: 4, name: 'Validate', label: 'Business Validation', icon: ShieldCheck, color: 'text-[#f59e0b]', border: 'border-[#f59e0b]/60',  bg: 'bg-[#f59e0b]/10' },
  { id: 5, name: 'Repair',   label: 'Surgical Repair',     icon: Layers,      color: 'text-[#f97316]', border: 'border-[#f97316]/60',  bg: 'bg-[#f97316]/10' },
  { id: 6, name: 'Output',   label: 'Schema Output',       icon: CheckCircle, color: 'text-green-400', border: 'border-green-400/60',  bg: 'bg-green-400/10' },
];

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
        {/* 6-Stage Pipeline Visualization */}
        <GlassCard className="lg:col-span-2 p-panel-padding">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-headline-md text-on-surface">Compiler Pipeline</h2>
            <StatusBadge status="running" label="6-Stage Architecture" />
          </div>
          
          {/* Pipeline stages — horizontal scroll on mobile */}
          <div className="relative bg-surface-container-lowest rounded-lg border border-outline-variant/30 p-6 overflow-x-auto">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] rounded-lg" />

            <div className="relative z-10 flex items-center min-w-[560px]">
              {PIPELINE_STAGES.map((stage, idx) => {
                const Icon = stage.icon;
                const isCenter = idx === 2; // Schema is the "core" stage
                return (
                  <div key={stage.id} className="flex items-center flex-1">
                    {/* Stage Node */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <div className={`
                        relative flex items-center justify-center rounded-xl border-2 transition-all duration-300
                        ${isCenter ? 'w-14 h-14' : 'w-11 h-11'}
                        ${stage.bg} ${stage.border}
                        ${isCenter ? 'shadow-[0_0_20px_rgba(176,198,255,0.2)]' : ''}
                      `}>
                        {isCenter && (
                          <div className={`absolute inset-0 rounded-xl ${stage.bg} pulse-dot opacity-50`} />
                        )}
                        <Icon className={`${isCenter ? 'w-7 h-7' : 'w-5 h-5'} ${stage.color} relative z-10`} />
                      </div>
                      <div className="text-center">
                        <div className={`font-label-xs font-bold tracking-wider ${stage.color} text-[10px] uppercase`}>
                          {stage.name}
                        </div>
                        <div className="font-label-xs text-on-surface-variant text-[9px] mt-0.5 hidden lg:block whitespace-nowrap">
                          {stage.label}
                        </div>
                      </div>
                    </div>

                    {/* Connector arrow (not on last stage) */}
                    {idx < PIPELINE_STAGES.length - 1 && (
                      <div className="flex-1 relative h-px mx-2">
                        <svg className="absolute w-full h-full overflow-visible" preserveAspectRatio="none">
                          <line
                            x1="0" y1="0" x2="100%" y2="0"
                            stroke={`var(--color-outline-variant)`}
                            strokeWidth="1.5"
                            strokeDasharray="4 4"
                            className="animated-line"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Stage labels row (bottom) */}
            <div className="relative z-10 flex items-start mt-4 min-w-[560px]">
              {PIPELINE_STAGES.map((stage, idx) => (
                <div key={stage.id} className="flex-1 flex flex-col items-center">
                  <span className="font-code-sm text-on-surface-variant/50 text-[10px]">
                    Stage {stage.id}
                  </span>
                </div>
              ))}
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
