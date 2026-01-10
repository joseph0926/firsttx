import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Rocket, Copy, Check, Zap, Database, Shield, ExternalLink } from 'lucide-react';
import { TourStep } from '@/components/tour';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';

function InstallCommand() {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const command = 'npm install @firsttx/prepaint @firsttx/local-first @firsttx/tx';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-zinc-900">
      <div className="flex items-center justify-between border-b border-border bg-zinc-800/50 px-4 py-2">
        <span className="text-xs text-muted-foreground">{t('common.terminal')}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-zinc-700 hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-400" />
              <span className="text-green-400">{t('common.copied')}</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>{t('common.copy')}</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4">
        <code className="font-mono text-sm text-green-400">$ {command}</code>
      </div>
    </div>
  );
}

export default function StepNext() {
  const { t, getDocsUrl } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const SCENARIOS = [
    {
      icon: <Zap className="h-5 w-5" />,
      title: t('tour.next.prepaintDemos'),
      description: t('tour.next.prepaintDemosDescription'),
      path: '/prepaint/heavy',
      color: 'text-yellow-400',
      borderColor: 'border-yellow-500/30 hover:border-yellow-500/50',
    },
    {
      icon: <Database className="h-5 w-5" />,
      title: t('tour.next.localFirstDemos'),
      description: t('tour.next.localFirstDemosDescription'),
      path: '/sync/instant-cart',
      color: 'text-blue-400',
      borderColor: 'border-blue-500/30 hover:border-blue-500/50',
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: t('tour.next.txDemos'),
      description: t('tour.next.txDemosDescription'),
      path: '/tx/concurrent',
      color: 'text-green-400',
      borderColor: 'border-green-500/30 hover:border-green-500/50',
    },
  ];

  return (
    <TourStep
      title={t('tour.next.title')}
      description={t('tour.next.description')}
      icon={<Rocket className="h-8 w-8" />}
    >
      <div
        className={cn(
          'space-y-8 transition-opacity duration-500',
          mounted ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div>
          <h3 className="mb-3 text-lg font-semibold">{t('common.install')}</h3>
          <InstallCommand />
        </div>

        <div>
          <h3 className="mb-3 text-lg font-semibold">{t('common.exploreMoreScenarios')}</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {SCENARIOS.map((scenario) => (
              <Link
                key={scenario.path}
                to={scenario.path}
                className={cn(
                  'group rounded-xl border bg-card p-4 transition-all',
                  scenario.borderColor,
                )}
              >
                <div className={cn('mb-3', scenario.color)}>{scenario.icon}</div>
                <h4 className="mb-1 font-medium group-hover:text-primary">{scenario.title}</h4>
                <p className="text-sm text-muted-foreground">{scenario.description}</p>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-lg font-semibold">{t('common.resources')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href={getDocsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <div>
                <div className="font-medium">{t('common.documentation')}</div>
                <div className="text-sm text-muted-foreground">
                  {t('common.sourceCodeAndDocumentation')}
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
            <Link
              to="/getting-started"
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <div>
                <div className="font-medium">{t('common.gettingStartedGuide')}</div>
                <div className="text-sm text-muted-foreground">
                  {t('common.stepByStepSetupInstructions')}
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </div>
    </TourStep>
  );
}
