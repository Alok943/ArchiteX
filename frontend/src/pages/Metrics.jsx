import { BarChart3, TrendingDown, Coins, Zap, Activity } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { MetricDisplay } from '../components/ui/MetricDisplay';

export function Metrics() {
  return (
    <div className="flex flex-col gap-6 h-full animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline-lg primary-gradient-text">Evaluation Metrics</h1>
          <p className="text-on-surface-variant mt-2 font-code-sm">Analytics on token cost, latency, and consistency scores.</p>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex bg-surface-container-lowest rounded-lg p-1 border border-outline-variant/50">
          <button className="px-4 py-1.5 font-label-xs rounded text-on-surface-variant hover:text-on-surface transition-colors">24h</button>
          <button className="px-4 py-1.5 font-label-xs rounded bg-surface-variant text-on-surface shadow">7d</button>
          <button className="px-4 py-1.5 font-label-xs rounded text-on-surface-variant hover:text-on-surface transition-colors">30d</button>
        </div>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricDisplay label="Total Cost" value="$14.28" trend="-2.1%" icon={Coins} />
        <MetricDisplay label="Avg Latency" value="1.1s" trend="-0.3s" icon={Zap} />
        <MetricDisplay label="Success Rate" value="99.1%" trend="+0.5%" icon={Activity} />
        <MetricDisplay label="API Calls" value="12.4k" trend="+1.2k" icon={BarChart3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[400px]">
        {/* Main Chart Area */}
        <GlassCard className="lg:col-span-2 p-panel-padding flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-headline-md text-on-surface">Latency vs Cost</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 font-label-xs text-on-surface-variant">
                <div className="w-3 h-3 rounded bg-primary"></div> Latency
              </div>
              <div className="flex items-center gap-2 font-label-xs text-on-surface-variant">
                <div className="w-3 h-3 rounded bg-[#00e0ff]"></div> Cost
              </div>
            </div>
          </div>
          
          {/* Simulated Bar Chart */}
          <div className="flex-1 relative flex items-end justify-between pt-8 pb-6 border-b border-l border-outline-variant/30 pl-4">
            
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 pl-4">
              <div className="w-full border-t border-outline-variant/10"></div>
              <div className="w-full border-t border-outline-variant/10"></div>
              <div className="w-full border-t border-outline-variant/10"></div>
              <div className="w-full border-t border-outline-variant/10"></div>
            </div>

            {/* Bars */}
            {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
              <div key={i} className="flex flex-col items-center gap-2 w-12 group relative z-10">
                {/* Tooltip */}
                <div className="absolute -top-12 bg-surface-container-highest px-3 py-1.5 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 border border-outline-variant">
                  Day {i+1}
                </div>
                
                <div className="flex items-end gap-1 w-full h-[200px]">
                  <div className="w-1/2 bg-primary rounded-t-sm transition-all duration-700 ease-out group-hover:bg-primary/80" style={{ height: `${h}%` }}></div>
                  <div className="w-1/2 bg-[#00e0ff] rounded-t-sm transition-all duration-700 ease-out group-hover:bg-[#00e0ff]/80" style={{ height: `${Math.max(20, h - 20)}%` }}></div>
                </div>
                <span className="font-label-xs text-on-surface-variant mt-2">D{i+1}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Side Panel: Top Errors */}
        <GlassCard className="p-panel-padding flex flex-col">
          <h2 className="font-headline-md text-on-surface mb-6 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-error" /> Top Errors
          </h2>
          
          <div className="flex flex-col gap-4">
            {[
              { type: 'ValidationError', path: 'response.data.users', count: 142 },
              { type: 'TimeoutError', path: 'LLM API', count: 28 },
              { type: 'ParseError', path: 'JSON Decoder', count: 12 },
            ].map((err, i) => (
              <div key={i} className="bg-surface-container-lowest p-3 rounded-lg border border-error/20 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <span className="font-code-sm text-error font-bold">{err.type}</span>
                  <span className="font-label-xs bg-surface-variant px-2 py-0.5 rounded text-on-surface">{err.count}</span>
                </div>
                <span className="font-code-sm text-xs text-on-surface-variant">{err.path}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
