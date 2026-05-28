import clsx from 'clsx';

const statusStyles = {
  running: {
    bg: 'bg-primary/20',
    text: 'text-primary',
    dot: 'bg-primary pulse-dot'
  },
  success: {
    bg: 'bg-[#00e0ff]/20', // Neon Cyan
    text: 'text-[#00e0ff]',
    dot: 'bg-[#00e0ff]'
  },
  failed: {
    bg: 'bg-error/20',
    text: 'text-error',
    dot: 'bg-error'
  }
};

export function StatusBadge({ status, label }) {
  const styles = statusStyles[status] || statusStyles.running;
  
  return (
    <div className={clsx("flex items-center px-2 py-1 rounded-full", styles.bg)}>
      <div className={clsx("w-2 h-2 rounded-full mr-2", styles.dot)} />
      <span className={clsx("font-label-xs tracking-widest uppercase", styles.text)}>
        {label}
      </span>
    </div>
  );
}
