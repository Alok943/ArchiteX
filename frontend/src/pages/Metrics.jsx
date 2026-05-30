import { useState, useEffect } from 'react';
import { BarChart3, TrendingDown, Zap, Activity, Inbox, ShieldCheck } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { MetricDisplay } from '../components/ui/MetricDisplay';
import { getHistory } from '../lib/api';

/** Derive a 0-100 consistency score from run history */
function computeConsistency(history) {
  if (history.length === 0) return null;
  const TOTAL_VALIDATORS = 7;
  const totalPossible = history.length * TOTAL_VALIDATORS;
  const totalErrors = history.reduce((sum, h) => sum + (h.validation_errors?.length || 0), 0);
  const score = Math.max(0, Math.min(100, ((totalPossible - totalErrors) / totalPossible) * 100));

  // Per-dimension scores heuristically derived from error rules
  const ruleCounts = { feature: 0, fk: 0, crud: 0, auth: 0, entity: 0, analytics: 0, role: 0 };
  history.forEach((h) => {
    (h.validation_errors || []).forEach((err) => {
      const rule = (typeof err === 'string' ? err : err.rule || err.layer || '').toLowerCase();
      if (rule.includes('feature') || rule.includes('coverage')) ruleCounts.feature++;
      else if (rule.includes('fk') || rule.includes('foreign') || rule.includes('reference')) ruleCounts.fk++;
      else if (rule.includes('crud') || rule.includes('endpoint')) ruleCounts.crud++;
      else if (rule.includes('auth') || rule.includes('login') || rule.includes('register')) ruleCounts.auth++;
      else if (rule.includes('entity') || rule.includes('ui') || rule.includes('screen')) ruleCounts.entity++;
      else if (rule.includes('analytics') || rule.includes('metric')) ruleCounts.analytics++;
      else if (rule.includes('role') || rule.includes('premium') || rule.includes('rbac')) ruleCounts.role++;
    });
  });

  const dims = [
    { label: 'Feature Coverage',   key: 'feature',   errors: ruleCounts.feature },
    { label: 'FK Integrity',       key: 'fk',        errors: ruleCounts.fk },
    { label: 'CRUD Completeness',  key: 'crud',       errors: ruleCounts.crud },
    { label: 'Auth Completeness',  key: 'auth',       errors: ruleCounts.auth },
    { label: 'Entity–UI Mapping',  key: 'entity',     errors: ruleCounts.entity },
    { label: 'Analytics Rules',    key: 'analytics',  errors: ruleCounts.analytics },
    { label: 'Role Consistency',   key: 'role',       errors: ruleCounts.role },
  ];

  return { score: Math.round(score), dims };
}

export function Metrics() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const totalRuns = history.length;
  const successRuns = history.filter((h) => h.status === 'success').length;
  const failedRuns = totalRuns - successRuns;
  const successRate = totalRuns > 0 ? ((successRuns / totalRuns) * 100).toFixed(1) : '0.0';
  const avgLatency =
    totalRuns > 0
      ? (history.reduce((sum, h) => sum + (h.latency_ms || 0), 0) / totalRuns / 1000).toFixed(2)
      : '0';
  const avgRetries =
    totalRuns > 0
      ? (history.reduce((sum, h) => sum + (h.retry_count || 0), 0) / totalRuns).toFixed(1)
      : '0';

  // Compute error types from history
  const errorCounts = {};
  history.forEach((h) => {
    if (h.validation_errors && h.validation_errors.length > 0) {
      h.validation_errors.forEach((err) => {
        const errType = typeof err === 'string' 
          ? (err.includes('type=') ? err.match(/type=(\w+)/)?.[1] || 'ValidationError' : 'ValidationError')
          : 'ValidationError';
        errorCounts[errType] = (errorCounts[errType] || 0) + 1;
      });
    }
    if (h.error_message) {
      const errType = h.error_message.includes('timeout') ? 'TimeoutError' 
        : h.error_message.includes('parse') ? 'ParseError' 
        : 'PipelineError';
      errorCounts[errType] = (errorCounts[errType] || 0) + 1;
    }
  });
  const topErrors = Object.entries(errorCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Consistency score
  const consistency = computeConsistency(history);

  // Build chart data from last 7 runs (or fewer)
  const chartRuns = history.slice(0, 7).reverse();
  const maxLatency = chartRuns.length > 0
    ? Math.max(...chartRuns.map((r) => r.latency_ms || 0), 1)
    : 1;

  return (
    <div className="flex flex-col gap-6 h-full animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline-lg primary-gradient-text">Evaluation Metrics</h1>
          <p className="text-on-surface-variant mt-2 font-code-sm">Analytics on latency, retries, and consistency scores.</p>
        </div>
        
        {/* Info */}
        <div className="flex items-center gap-2 font-label-xs text-on-surface-variant">
          <span>{totalRuns} total run(s)</span>
        </div>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricDisplay label="Total Runs" value={String(totalRuns)} icon={BarChart3} />
        <MetricDisplay label="Avg Latency" value={`${avgLatency}s`} trend={totalRuns > 0 ? `${avgRetries} avg retries` : undefined} icon={Zap} />
        <MetricDisplay label="Success Rate" value={`${successRate}%`} trend={totalRuns > 0 ? `${failedRuns} failed` : undefined} icon={Activity} />
        <MetricDisplay label="Avg Retries" value={avgRetries} icon={BarChart3} />
      </div>

      {totalRuns === 0 ? (
        <GlassCard className="p-panel-padding flex-1 flex flex-col items-center justify-center gap-4">
          <Inbox className="w-12 h-12 text-on-surface-variant/40" />
          <p className="text-on-surface-variant font-label-xs">No compilation data yet. Run a compilation to see metrics.</p>
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-6">

          {/* Consistency Score Panel */}
          {consistency && (
            <GlassCard className="p-panel-padding">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <ShieldCheck className={`w-6 h-6 ${consistency.score >= 80 ? 'text-green-400' : consistency.score >= 60 ? 'text-[#f59e0b]' : 'text-error'}`} />
                  <h2 className="font-headline-md text-on-surface">Consistency Score</h2>
                </div>
                <div className={`text-3xl font-bold font-code-sm ${
                  consistency.score >= 80 ? 'text-green-400' : consistency.score >= 60 ? 'text-[#f59e0b]' : 'text-error'
                }`}>{consistency.score}%</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {consistency.dims.map((dim) => {
                  const maxErrors = Math.max(...consistency.dims.map(d => d.errors), 1);
                  const dimScore = Math.round(Math.max(0, 100 - (dim.errors / Math.max(history.length, 1)) * 100));
                  const color = dimScore >= 80 ? 'bg-green-400' : dimScore >= 60 ? 'bg-[#f59e0b]' : 'bg-error';
                  return (
                    <div key={dim.key} className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/30">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-label-xs text-on-surface-variant text-[10px] uppercase tracking-wider">{dim.label}</span>
                        <span className={`font-code-sm text-xs font-bold ${
                          dimScore >= 80 ? 'text-green-400' : dimScore >= 60 ? 'text-[#f59e0b]' : 'text-error'
                        }`}>{dimScore}%</span>
                      </div>
                      <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${color}`}
                          style={{ width: `${dimScore}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[400px]">
          {/* Main Chart Area */}
          <GlassCard className="lg:col-span-2 p-panel-padding flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-headline-md text-on-surface">Latency per Run</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 font-label-xs text-on-surface-variant">
                  <div className="w-3 h-3 rounded bg-primary"></div> Latency (ms)
                </div>
                <div className="flex items-center gap-2 font-label-xs text-on-surface-variant">
                  <div className="w-3 h-3 rounded bg-[#00e0ff]"></div> Retries
                </div>
              </div>
            </div>
            
            {/* Chart */}
            <div className="flex-1 relative flex items-end justify-between pt-8 pb-6 border-b border-l border-outline-variant/30 pl-4">
              
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 pl-4">
                <div className="w-full border-t border-outline-variant/10"></div>
                <div className="w-full border-t border-outline-variant/10"></div>
                <div className="w-full border-t border-outline-variant/10"></div>
                <div className="w-full border-t border-outline-variant/10"></div>
              </div>

              {/* Bars */}
              {chartRuns.length > 0 ? (
                chartRuns.map((run, i) => {
                  const latencyPct = Math.max(5, ((run.latency_ms || 0) / maxLatency) * 100);
                  const retryPct = Math.max(5, ((run.retry_count || 0) / Math.max(...chartRuns.map(r => r.retry_count || 0), 1)) * 100);
                  return (
                    <div key={i} className="flex flex-col items-center gap-2 w-12 group relative z-10">
                      {/* Tooltip */}
                      <div className="absolute -top-14 bg-surface-container-highest px-3 py-1.5 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 border border-outline-variant">
                        {((run.latency_ms || 0) / 1000).toFixed(1)}s • {run.retry_count || 0} retries
                      </div>
                      
                      <div className="flex items-end gap-1 w-full h-[200px]">
                        <div
                          className={`w-1/2 rounded-t-sm transition-all duration-700 ease-out group-hover:opacity-80 ${run.status === 'success' ? 'bg-primary' : 'bg-red-400'}`}
                          style={{ height: `${latencyPct}%` }}
                        ></div>
                        <div
                          className="w-1/2 bg-[#00e0ff] rounded-t-sm transition-all duration-700 ease-out group-hover:opacity-80"
                          style={{ height: `${retryPct}%` }}
                        ></div>
                      </div>
                      <span className="font-label-xs text-on-surface-variant mt-2">R{i + 1}</span>
                    </div>
                  );
                })
              ) : (
                <div className="flex-1 flex items-center justify-center text-on-surface-variant font-label-xs">
                  No data
                </div>
              )}
            </div>
          </GlassCard>

          {/* Side Panel: Top Errors */}
          <GlassCard className="p-panel-padding flex flex-col">
            <h2 className="font-headline-md text-on-surface mb-6 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-error" /> Top Errors
            </h2>
            
            {topErrors.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-on-surface-variant">
                <p className="font-label-xs">No errors recorded 🎉</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {topErrors.map((err, i) => (
                  <div key={i} className="bg-surface-container-lowest p-3 rounded-lg border border-error/20 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="font-code-sm text-error font-bold">{err.type}</span>
                      <span className="font-label-xs bg-surface-variant px-2 py-0.5 rounded text-on-surface">{err.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
          </div>
      )}
    </div>
  );
}
