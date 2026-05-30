import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, Wrench, TerminalSquare, Inbox } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { CodeBlock } from '../components/ui/CodeBlock';
import { StatusBadge } from '../components/ui/StatusBadge';
import { getLastRun } from '../lib/api';

export function Validation() {
  const [lastRun, setLastRun] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLastRun(getLastRun());
  }, []);

  const hasErrors = lastRun?.validation_errors?.length > 0;
  const retryCount = lastRun?.retry_count || 0;

  // No data at all
  if (!lastRun) {
    return (
      <div className="flex flex-col gap-6 h-full animate-in fade-in duration-500">
        <header>
          <h1 className="font-headline-lg primary-gradient-text">Validation Engine</h1>
          <p className="text-on-surface-variant mt-2 font-code-sm">Pydantic v2 error inspection and surgical repair.</p>
        </header>
        <GlassCard className="p-panel-padding flex-1 flex flex-col items-center justify-center gap-4">
          <Inbox className="w-12 h-12 text-on-surface-variant/40" />
          <p className="text-on-surface-variant font-label-xs">No compilation data yet.</p>
          <button onClick={() => navigate('/playground')} className="text-primary font-label-xs hover:underline">
            Go to Playground →
          </button>
        </GlassCard>
      </div>
    );
  }

  // All validations passed
  if (!hasErrors) {
    return (
      <div className="flex flex-col gap-6 h-full animate-in fade-in duration-500">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-headline-lg primary-gradient-text">Validation Engine</h1>
            <p className="text-on-surface-variant mt-2 font-code-sm">Pydantic v2 error inspection and surgical repair.</p>
          </div>
          <StatusBadge status="success" label="All Passed" />
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
          <GlassCard className="p-panel-padding border-green-500/30 relative overflow-hidden flex flex-col items-center justify-center gap-4">
            <div className="absolute inset-0 bg-green-500/5 z-0 pointer-events-none" />
            <ShieldCheck className="w-16 h-16 text-green-400 relative z-10" />
            <h2 className="font-headline-md text-green-400 relative z-10">All Validations Passed</h2>
            <p className="text-on-surface-variant font-code-sm relative z-10 text-center">
              The last compilation produced a schema with zero validation errors.
            </p>
          </GlassCard>

          <GlassCard className="p-panel-padding flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <Wrench className="w-6 h-6 text-[#00e0ff]" />
              <h2 className="font-headline-md text-on-surface">Repair Log</h2>
            </div>
            <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg p-4 font-code-sm text-on-surface-variant overflow-y-auto flex flex-col gap-2">
              <div className="flex gap-2">
                <span className="text-primary">[System]</span>
                <span>Compilation completed successfully.</span>
              </div>
              <div className="flex gap-2">
                <span className="text-green-400">[Validator]</span>
                <span>Schema passed all Pydantic v2 checks.</span>
              </div>
              {retryCount > 0 && (
                <div className="flex gap-2">
                  <span className="text-[#00e0ff]">[Repair]</span>
                  <span>{retryCount} repair cycle(s) were needed before passing.</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="text-secondary">[Result]</span>
                <span>Final schema is valid. No further repairs required.</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 text-on-surface-variant font-label-xs">
              <span>Retries: <strong className="text-on-surface">{retryCount}</strong></span>
              <span>•</span>
              <span>Errors: <strong className="text-green-400">0</strong></span>
              <span>•</span>
              <span>Status: <strong className="text-green-400">Passed</strong></span>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  // Has validation errors
  return (
    <div className="flex flex-col gap-6 h-full animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline-lg primary-gradient-text">Validation Engine</h1>
          <p className="text-on-surface-variant mt-2 font-code-sm">Pydantic v2 error inspection and surgical repair.</p>
        </div>
        <StatusBadge status="failed" label={`${lastRun.validation_errors.length} Validation Error(s)`} />
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        
        {/* Left Pane: Error Inspector */}
        <div className="flex flex-col gap-6">
          <GlassCard className="p-panel-padding border-error/50 relative overflow-hidden">
            {/* Red glow for error state */}
            <div className="absolute inset-0 bg-error/5 pulse-dot z-0 pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <ShieldAlert className="w-6 h-6 text-error" />
                <h2 className="font-headline-md text-error">Schema Errors</h2>
              </div>
              
              <div className="flex flex-col gap-3">
                {lastRun.validation_errors.map((err, i) => (
                  <div key={i} className="bg-error-container/30 border border-error/20 p-4 rounded-lg">
                    <div className="font-code-sm text-on-error-container mb-1">
                      <span className="text-error font-bold">Error {i + 1}</span>
                    </div>
                    <div className="font-code-sm text-on-surface-variant text-sm whitespace-pre-wrap">
                      {typeof err === 'string' ? err : JSON.stringify(err, null, 2)}
                    </div>
                  </div>
                ))}
              </div>

              {lastRun.result && (
                <>
                  <h3 className="font-label-xs text-on-surface-variant uppercase tracking-wider mt-6 mb-2">Generated Output (excerpt)</h3>
                  <CodeBlock 
                    language="json"
                    className="border-error/30"
                    code={JSON.stringify(lastRun.result, null, 2).slice(0, 500) + (JSON.stringify(lastRun.result, null, 2).length > 500 ? '\n  ...' : '')}
                  />
                </>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Right Pane: Repair Log */}
        <div className="flex flex-col gap-6">
          <GlassCard className="p-panel-padding flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div className="flex items-center gap-3">
                <Wrench className="w-6 h-6 text-[#00e0ff]" />
                <h2 className="font-headline-md text-on-surface">Repair Engine Log</h2>
              </div>
              <StatusBadge status={retryCount > 0 ? 'running' : 'failed'} label={retryCount > 0 ? `${retryCount} Repair(s)` : 'Unrepaired'} />
            </div>

            <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg p-4 font-code-sm text-on-surface-variant overflow-y-auto flex flex-col gap-2 relative">
              <div className="flex gap-2">
                <span className="text-primary">[System]</span>
                <span>Detected {lastRun.validation_errors.length} validation error(s) from LLM output.</span>
              </div>
              {lastRun.validation_errors.map((err, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-[#00e0ff]">[Analyzer]</span>
                  <span>Error {i + 1}: {typeof err === 'string' ? err.slice(0, 80) : 'Schema mismatch detected'}</span>
                </div>
              ))}
              {retryCount > 0 && (
                <>
                  <div className="flex gap-2">
                    <span className="text-secondary">[Generator]</span>
                    <span>Constructed localized prompt for surgical repair.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-primary">[System]</span>
                    <span>Dispatched {retryCount} repair cycle(s) to model.</span>
                  </div>
                </>
              )}
              <div className="flex gap-2">
                <span className="text-primary">[System]</span>
                <span>{lastRun.status === 'success' ? 'Repairs completed. Residual warnings remain.' : 'Repair limit reached. Some errors persist.'}</span>
              </div>
              
              {/* Terminal fade effect at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-surface-container-lowest to-transparent pointer-events-none" />
            </div>
            
            <div className="mt-4 flex gap-4 shrink-0">
               <button 
                 onClick={() => navigate('/playground')}
                 className="flex-1 bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary px-4 py-2 rounded-lg font-label-xs tracking-widest uppercase transition-colors neon-focus flex items-center justify-center gap-2"
               >
                 <TerminalSquare className="w-4 h-4" />
                 Retry in Playground
               </button>
            </div>
          </GlassCard>
        </div>

      </div>
    </div>
  );
}
