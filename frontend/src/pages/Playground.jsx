import { useState } from 'react';
import { Settings2, Send, Cpu, Braces, Loader2, Copy, Check, CheckCircle, XCircle, Circle } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { CodeBlock } from '../components/ui/CodeBlock';
import { generateConfigStream, addToHistory } from '../lib/api';

// Maps backend numeric stage number → frontend stage entry
const PIPELINE_STAGES = [
  { key: 1, name: 'Intent Extraction' },
  { key: 2, name: 'System Design' },
  { key: 3, name: 'Schema Generation' },
  { key: 4, name: 'Validation + Repair' },
];

function StageIcon({ status }) {
  if (status === 'running') return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
  if (status === 'completed') return <CheckCircle className="w-4 h-4 text-green-400" />;
  if (status === 'failed') return <XCircle className="w-4 h-4 text-red-400" />;
  return <Circle className="w-4 h-4 text-on-surface-variant/30" />;
}

export function Playground() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [stages, setStages] = useState([]);

  function resetStages() {
    return PIPELINE_STAGES.map((s) => ({ ...s, status: 'pending', data: null }));
  }

  async function handleCompile() {
    setLoading(true);
    setResult(null);
    setError(null);
    const initialStages = resetStages();
    setStages(initialStages);
    const startTime = Date.now();

    try {
      const finalResult = await generateConfigStream(prompt, (event) => {
        // Skip non-stage events ("complete", "error")
        if (typeof event.stage !== 'number') return;

        setStages((prev) => {
          const updated = prev.map((s) => {
            if (event.stage === s.key) {
              return { ...s, status: event.status, data: event.data || null };
            }
            return s;
          });

          // When a stage goes 'running', ensure previous stages are marked completed
          if (event.status === 'running') {
            return updated.map((s) =>
              s.key < event.stage && s.status === 'pending'
                ? { ...s, status: 'completed' }
                : s
            );
          }

          return updated;
        });
      });

      const latencyMs = Date.now() - startTime;

      if (finalResult?.data) {
        setResult(finalResult.data);
        // Ensure final stage is marked completed (in case its 'completed' event arrived before this)
        setStages((prev) => prev.map((s) => s.status === 'running' ? { ...s, status: 'completed' } : s));
        // Save to history
        addToHistory({
          id: `job_${Date.now().toString(36)}`,
          time: new Date().toISOString(),
          status: 'success',
          prompt: prompt.slice(0, 120),
          retry_count: finalResult.data.retry_count || 0,
          validation_errors_count: finalResult.data.validation_errors?.length || 0,
          validation_errors: finalResult.data.validation_errors || [],
          latency_ms: latencyMs,
          result: finalResult.data,
        });
      } else {
        throw { detail: { error: 'NO_RESULT', message: 'Pipeline returned no result.' } };
      }
    } catch (err) {
      setError(err.detail || { error: 'UNKNOWN', message: 'Pipeline failed. Try again.' });
      setStages((prev) =>
        prev.map((s) => (s.status === 'running' ? { ...s, status: 'failed' } : s))
      );
      // Save failed run to history
      addToHistory({
        id: `job_${Date.now().toString(36)}`,
        time: new Date().toISOString(),
        status: 'failed',
        prompt: prompt.slice(0, 120),
        retry_count: 0,
        validation_errors_count: 0,
        validation_errors: [],
        latency_ms: Date.now() - startTime,
        error_message: err.detail?.message || 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-6 h-full animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline-lg primary-gradient-text">Prompt Playground</h1>
          <p className="text-on-surface-variant mt-2 font-code-sm">Interactive sandbox for testing natural language compilation.</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-on-surface-variant hover:text-primary transition-colors neon-focus p-2 rounded-full">
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Top Bar: Input + Compile (always visible) */}
      <GlassCard className="p-panel-padding shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-headline-md text-on-surface flex items-center gap-2">
            <span className="text-primary">&gt;</span> Input
          </h2>
          <span className="font-label-xs text-on-surface-variant">Tokens: ~{prompt.trim() ? Math.ceil(prompt.length / 4) : 0}</span>
        </div>
        
        <textarea 
          className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg p-4 text-on-surface font-body-md resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all neon-focus mb-4 placeholder:text-on-surface-variant/50"
          rows={3}
          placeholder="Describe your app in natural language... e.g. 'Build a CRM with contacts, deals, and role-based access'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <select className="bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-label-xs neon-focus">
              <option>Gemini 2.5 Flash (Simple)</option>
              <option>Gemini 3.1 Flash (Complex)</option>
            </select>
            <div className="hidden md:flex items-center gap-2 text-on-surface-variant font-label-xs">
              <Braces className="w-3.5 h-3.5" />
              <span>4-stage pipeline</span>
            </div>
          </div>
          
          <button 
            onClick={handleCompile}
            disabled={loading || !prompt.trim()}
            className={`bg-primary hover:bg-primary/90 text-on-primary px-6 py-2 rounded-lg font-label-xs font-bold tracking-widest flex items-center gap-2 transition-all neon-glow neon-focus ${loading ? 'opacity-60 cursor-not-allowed animate-pulse' : ''} ${!prompt.trim() ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Compiling...</span>
              </>
            ) : (
              <>
                <span>Compile</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </GlassCard>

      {/* Pipeline Progress Tracker */}
      {stages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stages.map((stage, i) => (
            <div
              key={stage.key}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                stage.status === 'completed'
                  ? 'bg-green-500/10 border-green-500/30'
                  : stage.status === 'running'
                  ? 'bg-primary/10 border-primary/30'
                  : stage.status === 'failed'
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-surface-container-lowest border-outline-variant/30'
              }`}
            >
              <StageIcon status={stage.status} />
              <div className="min-w-0">
                <p className={`font-label-xs text-xs truncate ${
                  stage.status === 'completed' ? 'text-green-400' :
                  stage.status === 'running' ? 'text-primary' :
                  stage.status === 'failed' ? 'text-red-400' :
                  'text-on-surface-variant'
                }`}>
                  {stage.name}
                </p>
                <p className="font-label-xs text-[10px] text-on-surface-variant/60 uppercase tracking-wider">
                  {stage.status === 'pending' ? `Stage ${i + 1}` : stage.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Output Section */}
      <GlassCard className="p-panel-padding flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline-md text-on-surface flex items-center gap-2">
            <Cpu className="w-5 h-5 text-secondary" /> Output
          </h2>
          
          <div className="flex items-center gap-3">
            {/* Copy Button */}
            {result && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg font-label-xs text-on-surface-variant hover:text-on-surface border border-outline-variant/30 hover:border-primary/50 transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-green-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}

            {/* Tabs */}
            <div className="flex bg-surface-container-lowest rounded-lg p-1 border border-outline-variant/30">
              <button className="px-3 py-1 font-label-xs rounded bg-surface-variant text-on-surface shadow">JSON</button>
              <button className="px-3 py-1 font-label-xs rounded text-on-surface-variant hover:text-on-surface transition-colors">Raw</button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4 shrink-0">
            <p className="text-red-400 font-label-xs font-bold uppercase tracking-wider mb-1">
              {error.error === 'CLARIFICATION_NEEDED' ? '⚠ Clarification Needed' : '✕ Pipeline Error'}
            </p>
            <p className="text-red-300/80 font-code-sm text-sm whitespace-pre-wrap">
              {error.error === 'CLARIFICATION_NEEDED'
                ? error.questions?.join('\n')
                : error.message || 'Pipeline failed. Try again.'}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && !stages.some(s => s.status !== 'pending') && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="font-code-sm text-sm animate-pulse">Running 4-stage pipeline...</p>
          </div>
        )}

        {/* Result Display */}
        {!loading && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            <CodeBlock 
              language="json" 
              className="flex-1 h-full"
              code={result 
                ? JSON.stringify(result, null, 2) 
                : '// Output will appear here after compilation...'
              } 
            />
          </div>
        )}

        {/* Loading with stages active — show partial output */}
        {loading && stages.some(s => s.status !== 'pending') && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="font-code-sm text-sm animate-pulse">Processing stages...</p>
          </div>
        )}
        
        <div className="mt-4 flex items-center justify-between text-on-surface-variant border-t border-outline-variant/30 pt-4 shrink-0">
          <span className="font-code-sm text-xs flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full inline-block ${result ? 'bg-[#00e0ff]' : error ? 'bg-red-400' : 'bg-on-surface-variant/30'}`}></span>
            {result ? `Validated • ${result.retry_count || 0} repair(s)` : error ? 'Failed' : 'Idle'}
          </span>
          {result && (
            <span className="font-code-sm text-xs">
              {result.validation_errors?.length ? `${result.validation_errors.length} warning(s)` : '0 errors'}
            </span>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
