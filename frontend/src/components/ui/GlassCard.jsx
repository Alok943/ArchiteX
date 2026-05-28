import clsx from 'clsx';

export function GlassCard({ children, className, glow = true, ...props }) {
  return (
    <div 
      className={clsx(
        "glass-panel rounded-xl flex flex-col overflow-hidden",
        glow && "inner-glow",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
