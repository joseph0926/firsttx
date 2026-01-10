import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n();

  return (
    <div className={cn('flex items-center gap-1 rounded-lg border border-border p-0.5', className)}>
      <button
        onClick={() => setLocale('en')}
        className={cn(
          'rounded-md px-2 py-1 text-xs font-medium transition-colors',
          locale === 'en'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        EN
      </button>
      <button
        onClick={() => setLocale('ko')}
        className={cn(
          'rounded-md px-2 py-1 text-xs font-medium transition-colors',
          locale === 'ko'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        KO
      </button>
    </div>
  );
}
