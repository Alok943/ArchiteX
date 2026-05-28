import { AlertTriangle, Wrench, TerminalSquare, ShieldAlert } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { CodeBlock } from '../components/ui/CodeBlock';
import { StatusBadge } from '../components/ui/StatusBadge';

export function Validation() {
  return (
    <div className="flex flex-col gap-6 h-full animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline-lg primary-gradient-text">Validation Engine</h1>
          <p className="text-on-surface-variant mt-2 font-code-sm">Pydantic v2 error inspection and surgical repair.</p>
        </div>
        <StatusBadge status="failed" label="Validation Error" />
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
                <h2 className="font-headline-md text-error">Schema Mismatch</h2>
              </div>
              
              <div className="bg-error-container/30 border border-error/20 p-4 rounded-lg mb-6">
                <div className="font-code-sm text-on-error-container mb-2">
                  <span className="text-error font-bold">ValidationError</span>: 1 validation error for ResponseModel
                </div>
                <div className="font-code-sm text-on-surface-variant">
                  <span className="text-[#00e0ff]">users.0.age</span><br/>
                  Input should be a valid integer, unable to parse string as an integer [type=int_parsing, input_value='twenty-five', input_type=str]
                </div>
              </div>

              <h3 className="font-label-xs text-on-surface-variant uppercase tracking-wider mb-2">Generated Output</h3>
              <CodeBlock 
                language="json"
                className="border-error/30"
                code={`{
  "users": [
    {
      "name": "Alice",
      "age": "twenty-five", // ERROR: Expected int
      "role": "admin"
    }
  ]
}`}
              />
            </div>
          </GlassCard>
        </div>

        {/* Right Pane: Surgical Repair */}
        <div className="flex flex-col gap-6">
          <GlassCard className="p-panel-padding flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div className="flex items-center gap-3">
                <Wrench className="w-6 h-6 text-[#00e0ff]" />
                <h2 className="font-headline-md text-on-surface">Repair Engine Log</h2>
              </div>
              <StatusBadge status="running" label="Repairing" />
            </div>

            <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg p-4 font-code-sm text-on-surface-variant overflow-y-auto flex flex-col gap-2 relative">
              <div className="flex gap-2">
                <span className="text-primary">[System]</span>
                <span>Detected Validation Error from LLM Output.</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[#00e0ff]">[Analyzer]</span>
                <span>Isolating error path: `users.0.age`.</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[#00e0ff]">[Analyzer]</span>
                <span>Type mismatch: received `str` ("twenty-five"), expected `int`.</span>
              </div>
              <div className="flex gap-2">
                <span className="text-secondary">[Generator]</span>
                <span>Constructing localized prompt for surgical repair...</span>
              </div>
              <div className="flex gap-2">
                <span className="text-primary">[System]</span>
                <span>Dispatching repair request to model. Waiting for response<span className="pulse-dot">...</span></span>
              </div>
              
              {/* Terminal fade effect at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-surface-container-lowest to-transparent pointer-events-none" />
            </div>
            
            <div className="mt-4 flex gap-4 shrink-0">
               <button className="flex-1 bg-surface-container hover:bg-surface-container-highest border border-outline-variant text-on-surface px-4 py-2 rounded-lg font-label-xs tracking-widest uppercase transition-colors neon-focus">
                 Abort Repair
               </button>
               <button className="flex-1 bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary px-4 py-2 rounded-lg font-label-xs tracking-widest uppercase transition-colors neon-focus flex items-center justify-center gap-2">
                 <TerminalSquare className="w-4 h-4" />
                 View Raw Prompt
               </button>
            </div>
          </GlassCard>
        </div>

      </div>
    </div>
  );
}
