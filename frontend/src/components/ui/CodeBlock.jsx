import clsx from 'clsx';

export function CodeBlock({ code, language = 'json', className }) {
  return (
    <div className={clsx("bg-[#0e0e10] p-4 rounded-lg border border-outline-variant/50 overflow-x-auto", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-label-xs text-on-surface-variant uppercase">{language}</span>
      </div>
      <pre className="font-code-sm text-[#d2bbff] whitespace-pre-wrap break-words leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
