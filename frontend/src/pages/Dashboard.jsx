import { Play, Activity, Clock, FileJson2, Cpu } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { MetricDisplay } from '../components/ui/MetricDisplay';

export function Dashboard() {
  return (
    <div className="flex flex-col gap-8 h-full animate-in fade-in duration-500">
      
      {/* Header Area */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline-lg primary-gradient-text">Architex Pipeline</h1>
          <p className="text-on-surface-variant mt-2 font-code-sm">Compiler pipeline overview and recent job history.</p>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-on-primary px-6 py-2.5 rounded-lg font-label-xs font-bold tracking-widest flex items-center justify-center gap-2 transition-colors neon-glow neon-focus">
          <Play className="w-4 h-4" />
          <span>New Compilation</span>
        </button>
      </header>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricDisplay label="Active Jobs" value="3" icon={Activity} />
        <MetricDisplay label="Avg Latency" value="1.2s" trend="-0.4s" icon={Clock} />
        <MetricDisplay label="Success Rate" value="98.4%" trend="+1.2%" icon={CheckCircle} />
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
            <div className="flex flex-col gap-3">
              {[
                { id: 'job_4821', time: 'Just now', status: 'running', schema: 'User_Profile' },
                { id: 'job_4820', time: '2m ago', status: 'success', schema: 'Payment_Event' },
                { id: 'job_4819', time: '15m ago', status: 'success', schema: 'Auth_Token' },
                { id: 'job_4818', time: '1h ago', status: 'failed', schema: 'Legacy_Import' },
                { id: 'job_4817', time: '2h ago', status: 'success', schema: 'Invoice_Gen' },
              ].map((job) => (
                <div key={job.id} className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/30 flex items-center justify-between hover:border-primary/50 transition-colors cursor-pointer group">
                  <div>
                    <div className="font-code-sm text-on-surface group-hover:text-primary transition-colors">{job.id}</div>
                    <div className="font-label-xs text-on-surface-variant mt-1">{job.schema} • {job.time}</div>
                  </div>
                  <StatusBadge status={job.status} label={job.status === 'success' ? 'OK' : job.status} />
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>

    </div>
  );
}

function CheckCircle(props) {
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
