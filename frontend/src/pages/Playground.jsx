import { Settings2, Send, Cpu, Braces } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { CodeBlock } from '../components/ui/CodeBlock';

export function Playground() {
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        
        {/* Left Pane: Input */}
        <div className="flex flex-col gap-6">
          <GlassCard className="p-panel-padding flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline-md text-on-surface flex items-center gap-2">
                <span className="text-primary">&gt;</span> Input
              </h2>
              <span className="font-label-xs text-on-surface-variant">Tokens: ~42</span>
            </div>
            
            <textarea 
              className="w-full flex-1 bg-surface-container-lowest border border-outline-variant/50 rounded-lg p-4 text-on-surface font-body-md resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all neon-focus mb-4 placeholder:text-on-surface-variant/50"
              placeholder="Describe the desired output structure..."
              defaultValue="Extract the user's name, age, and a list of their recent purchase IDs from the following text: 'Alice is 25 years old. Yesterday she bought items #8812 and #9941.'"
            />
            
            <div className="flex items-center justify-between">
              <select className="bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-label-xs neon-focus">
                <option>Model: Gemini 1.5 Pro</option>
                <option>Model: Gemini 1.5 Flash</option>
              </select>
              
              <button className="bg-primary hover:bg-primary/90 text-on-primary px-6 py-2 rounded-lg font-label-xs font-bold tracking-widest flex items-center gap-2 transition-colors neon-glow neon-focus">
                <span>Compile</span>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </GlassCard>

          <GlassCard className="p-panel-padding shrink-0">
            <h3 className="font-label-xs text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-2">
              <Braces className="w-4 h-4" /> Target Schema
            </h3>
            <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 p-3 font-code-sm text-[#a5eeff] overflow-x-auto">
              class UserData(BaseModel):<br/>
              &nbsp;&nbsp;name: str<br/>
              &nbsp;&nbsp;age: int<br/>
              &nbsp;&nbsp;purchase_ids: list[int]
            </div>
          </GlassCard>
        </div>

        {/* Right Pane: Output Viewer */}
        <div className="flex flex-col gap-6">
          <GlassCard className="p-panel-padding flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline-md text-on-surface flex items-center gap-2">
                <Cpu className="w-5 h-5 text-secondary" /> Output
              </h2>
              
              {/* Fake Tabs */}
              <div className="flex bg-surface-container-lowest rounded-lg p-1 border border-outline-variant/30">
                <button className="px-3 py-1 font-label-xs rounded bg-surface-variant text-on-surface shadow">JSON</button>
                <button className="px-3 py-1 font-label-xs rounded text-on-surface-variant hover:text-on-surface transition-colors">Raw</button>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <CodeBlock 
                language="json" 
                className="flex-1 h-full overflow-y-auto"
                code={`{
  "name": "Alice",
  "age": 25,
  "purchase_ids": [
    8812,
    9941
  ]
}`} 
              />
            </div>
            
            <div className="mt-4 flex items-center justify-between text-on-surface-variant border-t border-outline-variant/30 pt-4">
              <span className="font-code-sm text-xs flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#00e0ff] inline-block"></span> Validated against schema</span>
              <span className="font-code-sm text-xs">Latency: 842ms</span>
            </div>
          </GlassCard>
        </div>

      </div>
    </div>
  );
}
