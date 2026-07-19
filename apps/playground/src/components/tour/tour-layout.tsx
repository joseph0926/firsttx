import type { ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { X } from 'lucide-react';
import { ProgressBar } from './progress-bar';
import { StepNavigation } from './step-navigation';
import { LanguageSwitcher } from '@/components/language-switcher';
import { TourModel } from '@/models/tour.model';
import { useI18n } from '@/hooks/use-i18n';

interface TourLayoutProps {
  children: ReactNode;
}

export function TourLayout({ children }: TourLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();

  const TOUR_STEPS = [
    { path: '/tour/problem', label: t('tour.steps.problem') },
    { path: '/tour/prepaint', label: t('tour.steps.prepaint') },
    { path: '/tour/local-first', label: t('tour.steps.localFirst') },
    { path: '/tour/tx', label: t('tour.steps.tx') },
    { path: '/tour/next', label: t('tour.steps.start') },
  ];

  const currentIndex = TOUR_STEPS.findIndex((step) => step.path === location.pathname);
  const currentStep = currentIndex + 1;
  const totalSteps = TOUR_STEPS.length;
  const isLastStep = currentStep === totalSteps;
  const isFirstStep = currentStep === 1;

  const goToPrev = () => {
    if (currentIndex > 0) {
      navigate(TOUR_STEPS[currentIndex - 1].path);
    }
  };

  const goToNext = async () => {
    if (currentIndex < TOUR_STEPS.length - 1) {
      await TourModel.patch((draft) => {
        draft.status = 'in_progress';
      });
      navigate(TOUR_STEPS[currentIndex + 1].path);
    } else {
      await TourModel.patch((draft) => {
        draft.status = 'completed';
        draft.completedAt = Date.now();
      });
      navigate('/');
    }
  };

  const goToEnd = async () => {
    await TourModel.patch((draft) => {
      draft.status = 'skipped';
      draft.skippedAt = Date.now();
    });
    navigate('/');
  };

  return (
    <div className="atlas-tour-shell">
      <header className="atlas-tour-header">
        <div>
          <Link to="/" className="atlas-brand">
            <span className="atlas-brand-mark">FT</span>
            <span>
              <strong>FirstTx</strong>
              <small>Playground</small>
            </span>
          </Link>
          <span className="atlas-tour-label">{t('common.tour')}</span>
        </div>
        <div>
          <LanguageSwitcher className="atlas-language-switch" />
          <Link
            to="/"
            onClick={(e) => {
              e.preventDefault();
              goToEnd();
            }}
            className="atlas-tour-exit"
          >
            <X aria-hidden="true" />
            {t('common.exit')}
          </Link>
        </div>
      </header>

      <ProgressBar
        current={currentStep}
        total={totalSteps}
        labels={TOUR_STEPS.map((s) => s.label)}
      />

      <main className="atlas-tour-main">{children}</main>

      <StepNavigation
        onPrev={currentStep > 1 ? goToPrev : undefined}
        onNext={goToNext}
        onSkip={goToEnd}
        nextLabel={isLastStep ? t('common.explorePlayground') : t('common.next')}
        prevLabel={t('common.back')}
        skipLabel={t('common.skipTour')}
        isLastStep={isLastStep}
        isFirstStep={isFirstStep}
      />
    </div>
  );
}
