import clsx from 'clsx';
import { GlassCard } from './GlassCard';

export function MetricDisplay({ label, value, trend, icon: Icon }) {
  return (
    <GlassCard className="p-panel-padding relative group hover:-translate-y-1 transition-transform duration-300">
      <div className="flex justify-between items-start mb-4">
        <span className="font-label-xs text-on-surface-variant uppercase tracking-wider">{label}</span>
        {Icon && <Icon className="w-5 h-5 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display-lg primary-gradient-text tracking-tighter">{value}</span>
        {trend && (
          <span className={clsx(
            "font-code-sm text-xs",
            trend.startsWith('+') ? "text-error" : "text-[#00e0ff]" // lower latency/cost is better, so minus is good (cyan)
          )}>
            {trend}
          </span>
        )}
      </div>
      {/* Decorative background accent */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
    </GlassCard>
  );
}
