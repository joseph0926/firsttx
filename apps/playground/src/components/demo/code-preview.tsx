import { useState } from 'react';
import { Check, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CodePreviewProps {
  code: string;
  language?: string;
  title?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function CodePreview({
  code,
  language = 'typescript',
  title,
  collapsible = false,
  defaultCollapsed = false,
}: CodePreviewProps) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-zinc-900">
      <div className="flex items-center justify-between border-b border-border bg-zinc-800/50 px-4 py-2">
        <div className="flex items-center gap-2">
          {collapsible && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-muted-foreground hover:text-foreground"
            >
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          )}
          <span className="text-xs font-medium text-muted-foreground">
            {title || language.toUpperCase()}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-zinc-700 hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {!collapsed && (
        <div className="overflow-x-auto">
          <pre className="p-4 text-sm leading-relaxed">
            <code className={cn('language-' + language, 'text-zinc-300')}>{code.trim()}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

interface CodeComparisonProps {
  before: {
    code: string;
    title?: string;
    highlight?: string;
  };
  after: {
    code: string;
    title?: string;
    highlight?: string;
  };
}

export function CodeComparison({ before, after }: CodeComparisonProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-xs text-red-400">
            1
          </span>
          <span className="text-sm font-medium text-red-400">{before.title || 'Before'}</span>
        </div>
        <CodePreview code={before.code} title={before.title} />
      </div>
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20 text-xs text-green-400">
            2
          </span>
          <span className="text-sm font-medium text-green-400">{after.title || 'After'}</span>
        </div>
        <CodePreview code={after.code} title={after.title} />
      </div>
    </div>
  );
}
