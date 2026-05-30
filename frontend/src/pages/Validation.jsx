import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, Wrench, TerminalSquare, Inbox, AlertTriangle, Info } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { CodeBlock } from '../components/ui/CodeBlock';
import { StatusBadge } from '../components/ui/StatusBadge';
import { getLastRun } from '../lib/api';

/** Parse a single validation error (object or string) into { tag, rule, message, severity } */
function parseError(err) {
  if (typeof err === 'string') {
    // Try to detect rule codes inside the string (e.g. "FK_REFERENCE_INVALID")
    const ruleMatch = err.match(/([A-Z][A-Z0-9_]{3,})/);
    return {
      tag: 'Analyzer',
      rule: ruleMatch ? ruleMatch[1] : 'VALIDATION_ERROR',
      message: err.length > 100 ? err.slice(0, 100) + '…' : err,
      severity: 'error',
    };
  }
  // Structured object from backend: { layer, rule, message }
  const layer = err.layer || 'global';
  const rule  = err.rule  || err.code || err.type || 'SCHEMA_INVALID';
  const msg   = err.message || err.msg || JSON.stringify(err);
  const tagMap = {
    api:    'API',
    ui:     'UI',
    db:     'DB',
    auth:   'Auth',
    global: 'Analyzer',
  };
  return {
    tag: tagMap[layer] || 'Analyzer',
    rule: rule.toUpperCase().replace(/ /g, '_'),
    message: msg.length > 120 ? msg.slice(0, 120) + '…' : msg,
    severity: err.severity || 'error',
  };
}

/** Build the full repair log lines from run data */
function buildRepairLog(lastRun) {
  const errors = lastRun?.validation_errors || [];
  const retryCount = lastRun?.retry_count || 0;
  const lines = [];

  lines.push({ tag: 'System', color: 'text-primary', text: `Pipeline completed. Detected ${errors.length} validation issue(s).` });

  // Show each error with real rule names
  errors.forEach((err, i) => {
    const parsed = parseError(err);
    lines.push({
      tag: parsed.tag,
      color: parsed.severity === 'error' ? 'text-error' : 'text-[#f59e0b]',
      text: `${parsed.rule}${parsed.message ? ` — ${parsed.message}` : ''}`,
    });
  });

  // Show repair cycles
  if (retryCount > 0) {
    for (let i = 1; i <= Math.min(retryCount, 3); i++) {
      lines.push({ tag: 'Repair',    color: 'text-[#f97316]', text: `Attempt #${i} — constructing localized repair prompt` });
      lines.push({ tag: 'Generator', color: 'text-secondary',  text: `Dispatching surgical repair to Gemini model` });
      lines.push({ tag: 'Validator', color: 'text-[#00e0ff]',  text: `Re-running all 7 business consistency checks` });
      if (i < retryCount) {
        lines.push({ tag: 'Analyzer', color: 'text-error', text: `Residual errors detected — escalating to attempt #${i + 1}` });
      }
    }
  }

  // Final result line
  const passed = lastRun?.status === 'success';
  lines.push({
    tag: 'Result',
    color: passed ? 'text-green-400' : 'text-error',
    text: passed
      ? `Schema validated successfully after ${retryCount} repair cycle(s).`
      : `Repair limit reached. ${errors.length} error(s) persist in final schema.`,
  });

  return lines;
}

/** Single log line component */
function LogLine({ tag, color, text }) {
  return (
    <div className="flex gap-2 leading-relaxed">
      <span className={`${color} font-bold shrink-0`}>[{tag}]</span>
      <span className="text-on-surface-variant">{text}</span>
    </div>
  );
}

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
          <p className="text-on-surface-variant mt-2 font-code-sm">Business rule enforcement and surgical self-repair.</p>
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

  const repairLog = buildRepairLog(lastRun);

  // All validations passed (no errors)
  if (!hasErrors) {
    return (
      <div className="flex flex-col gap-6 h-full animate-in fade-in duration-500">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-headline-lg primary-gradient-text">Validation Engine</h1>
            <p className="text-on-surface-variant mt-2 font-code-sm">Business rule enforcement and surgical self-repair.</p>
          </div>
          <StatusBadge status="success" label="All Passed" />
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
          <GlassCard className="p-panel-padding border-green-500/30 relative overflow-hidden flex flex-col items-center justify-center gap-4">
            <div className="absolute inset-0 bg-green-500/5 z-0 pointer-events-none" />
            <ShieldCheck className="w-16 h-16 text-green-400 relative z-10" />
            <h2 className="font-headline-md text-green-400 relative z-10">All 7 Validators Passed</h2>
            <p className="text-on-surface-variant font-code-sm relative z-10 text-center">
              The last compilation produced a schema with zero business rule violations.
            </p>
            <div className="relative z-10 w-full max-w-xs flex flex-col gap-1.5 mt-2">
              {['Entity Coverage', 'FK Integrity', 'CRUD Completeness', 'Auth Rules', 'Analytics', 'Role Consistency', 'Feature Coverage'].map((check) => (
                <div key={check} className="flex items-center gap-2 text-xs font-code-sm text-green-400/80">
                  <span className="text-green-400">✓</span> {check}
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-panel-padding flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <Wrench className="w-6 h-6 text-[#00e0ff]" />
              <h2 className="font-headline-md text-on-surface">Repair Engine Log</h2>
            </div>
            <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg p-4 font-code-sm text-sm overflow-y-auto flex flex-col gap-2">
              {repairLog.map((line, i) => (
                <LogLine key={i} {...line} />
              ))}
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
  const parsedErrors = lastRun.validation_errors.map(parseError);

  return (
    <div className="flex flex-col gap-6 h-full animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline-lg primary-gradient-text">Validation Engine</h1>
          <p className="text-on-surface-variant mt-2 font-code-sm">Business rule enforcement and surgical self-repair.</p>
        </div>
        <StatusBadge status="failed" label={`${lastRun.validation_errors.length} Rule Violation(s)`} />
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        
        {/* Left Pane: Error Inspector */}
        <div className="flex flex-col gap-6">
          <GlassCard className="p-panel-padding border-error/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-error/5 pulse-dot z-0 pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <ShieldAlert className="w-6 h-6 text-error" />
                <h2 className="font-headline-md text-error">Schema Rule Violations</h2>
              </div>
              
              <div className="flex flex-col gap-3">
                {parsedErrors.map((parsed, i) => (
                  <div key={i} className={`border p-4 rounded-lg ${
                    parsed.severity === 'error'
                      ? 'bg-error-container/20 border-error/30'
                      : 'bg-[#f59e0b]/10 border-[#f59e0b]/30'
                  }`}>
                    <div className="flex items-start gap-2 mb-1">
                      {parsed.severity === 'error'
                        ? <AlertTriangle className="w-3.5 h-3.5 text-error mt-0.5 shrink-0" />
                        : <Info className="w-3.5 h-3.5 text-[#f59e0b] mt-0.5 shrink-0" />
                      }
                      <div className="font-code-sm">
                        <span className={`font-bold ${parsed.severity === 'error' ? 'text-error' : 'text-[#f59e0b]'}`}>
                          [{parsed.tag}]
                        </span>
                        <span className="text-on-surface ml-2 font-bold">{parsed.rule}</span>
                      </div>
                    </div>
                    <div className="font-code-sm text-on-surface-variant text-sm ml-5">
                      {parsed.message}
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

            <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg p-4 font-code-sm text-sm overflow-y-auto flex flex-col gap-2 relative">
              {repairLog.map((line, i) => (
                <LogLine key={i} {...line} />
              ))}
              {/* Terminal fade effect at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-surface-container-lowest to-transparent pointer-events-none" />
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
