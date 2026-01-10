import rosetta from 'rosetta';

export type Locale = 'en' | 'ko';

const translations = {
  en: {
    common: {
      exit: 'Exit',
      tour: 'Tour',
      next: 'Next',
      back: 'Back',
      skipTour: 'Skip Tour',
      explorePlayground: 'Explore Playground',
      loading: 'Loading...',
      contentLoaded: 'Content loaded!',
      clickRefreshToSimulate: 'Click refresh to simulate',
      refresh: 'Refresh (F5)',
      refreshPage: 'Refresh Page',
      cartItems: 'Cart Items',
      navigateAway: 'Navigate Away',
      dataLostOnNavigation: 'Data lost on navigation!',
      readyToSubmit: 'Ready to submit',
      submitting: 'Submitting...',
      networkError: 'Network Error',
      manualRetryRequired: 'Manual retry required',
      submitForm: 'Submit Form',
      loadTime: 'Load Time',
      blankScreen: 'Blank screen...',
      visit: 'Visit',
      restoringSnapshot: 'Restoring snapshot...',
      loadCart: 'Load Cart',
      loadingCart: 'Loading cart...',
      closeTabSimulate: 'Close Tab (Simulate)',
      cartDataWasLost: 'Cart data was lost!',
      syncingToServer: 'Syncing to server...',
      dataRestoredFromIndexedDB: 'Data restored from IndexedDB!',
      inventoryCount: 'Inventory Count',
      updating: 'Updating...',
      networkErrorUpdateFailed: 'Network error! Update failed.',
      retry: 'Retry',
      clickToTriggerNetworkError: 'Click +1 to trigger a network error',
      waitingForServerResponse: 'Waiting for server response...',
      optimisticUpdateApplied: 'Optimistic update applied, syncing...',
      networkFailedRollingBack: 'Network failed - rolling back automatically...',
      clickToSeeOptimisticUpdate: 'Click +1 to see optimistic update + auto-rollback',
      install: 'Install',
      terminal: 'Terminal',
      copied: 'Copied!',
      copy: 'Copy',
      exploreMoreScenarios: 'Explore More Scenarios',
      resources: 'Resources',
      githubRepository: 'GitHub Repository',
      sourceCodeAndDocumentation: 'Source code and documentation',
      gettingStartedGuide: 'Getting Started Guide',
      stepByStepSetupInstructions: 'Step-by-step setup instructions',
      documentation: 'Documentation',
      aboutFirstTx: 'About FirstTx',
      aboutFirstTxDescription:
        'A unified system that makes CSR revisit experiences feel like SSR. Combines Prepaint, Local-First, and Tx layers.',
      prepaintPackage: 'Prepaint Package',
      localFirstPackage: 'Local-First Package',
      txPackage: 'Tx Package',
    },
    home: {
      tagline: 'Make CSR Feel Like SSR',
      description:
        'No blank screens on refresh. No data loss on navigation. Automatic error recovery. Experience the difference in 5 minutes.',
      fiveMinTour: '5 Minute Tour',
      prepaint: 'Prepaint',
      prepaintDescription: 'Instant replay',
      sync: 'Sync',
      syncDescription: 'Server reconciliation',
      tx: 'Tx',
      txDescription: 'Atomic updates',
      prepaintWarmFcp: 'Prepaint Warm FCP',
      prepaintWarmFcpDescription: 'Blank screen on revisit (ms)',
      instantCartTimeSaved: 'Instant Cart Time Saved',
      instantCartTimeSavedDescription: 'Per interaction (ms)',
      higherIsBetter: 'Higher is better',
      concurrentSuccessRate: 'Concurrent Success Rate',
      txCompletion: 'Tx completion',
      scenarios: 'scenarios',
    },
    tour: {
      problem: {
        title: 'Familiar Problems?',
        description:
          "These common CSR issues frustrate users and developers alike. Let's see how FirstTx solves them.",
        blankScreenOnRefresh: 'Blank Screen on Refresh',
        blankScreenOnRefreshDescription: 'Users see nothing for 2-3 seconds while JavaScript loads',
        dataLostOnNavigation: 'Data Lost on Navigation',
        dataLostOnNavigationDescription: 'Form data and state disappear when users navigate',
        manualErrorRecovery: 'Manual Error Recovery',
        manualErrorRecoveryDescription: 'Network failures require users to manually retry',
      },
      prepaint: {
        title: 'Prepaint: 0ms Load',
        description:
          'Prepaint saves your UI to IndexedDB and restores it instantly before React even loads.',
        tryThis: 'Try This',
        tryThisDescription:
          'Click "Refresh Page" on both panels. Traditional CSR shows a blank screen for 2 seconds, while Prepaint restores the UI in under 20ms.',
        traditionalCsr: 'Traditional CSR',
        traditionalCsrDescription:
          'Every refresh shows a blank screen while JavaScript loads and executes.',
        withPrepaint: 'With Prepaint',
        withPrepaintDescription:
          'Cached DOM snapshot is restored instantly. React hydrates in the background.',
      },
      localFirst: {
        title: 'Local-First: Data Persistence',
        description:
          'Local-First stores data in IndexedDB with automatic server sync. Your data survives refreshes and tab closes.',
        tryThis: 'Try This',
        tryThisDescription:
          'Add items to cart, then click "Close Tab". Traditional loses everything, while Local-First preserves your data.',
        traditionalState: 'Traditional State',
        traditionalStateDescription:
          'React state lives in memory. Close the tab and your data is gone.',
        withLocalFirst: 'With Local-First',
        withLocalFirstDescription:
          'Data is cached in IndexedDB. Reopen the tab and everything is still there.',
        dataPersistence: 'Data Persistence',
        none: 'None',
        automatic: 'Automatic',
      },
      tx: {
        title: 'Tx: Auto-Rollback',
        description:
          'Tx provides optimistic updates with automatic rollback on failure. Users see instant feedback while data stays consistent.',
        tryThis: 'Try This',
        tryThisDescription:
          'Click +1 on both panels. Traditional requires manual retry, while Tx automatically rolls back on failure.',
        traditionalUpdates: 'Traditional Updates',
        traditionalUpdatesDescription:
          'Wait for server response. On error, show error message and require manual retry.',
        withTx: 'With Tx',
        withTxDescription:
          'Apply optimistic update immediately. On error, rollback automatically without user intervention.',
        errorHandling: 'Error Handling',
        manual: 'Manual',
        userAction: 'User Action',
        required: 'Required',
      },
      next: {
        title: 'Ready to Start?',
        description:
          "You've seen how FirstTx solves common CSR problems. Here's how to get started.",
        prepaintDemos: 'Prepaint Demos',
        prepaintDemosDescription: '100+ product grid, route switching',
        localFirstDemos: 'Local-First Demos',
        localFirstDemosDescription: 'Instant cart, TTL, Suspense',
        txDemos: 'Tx Demos',
        txDemosDescription: 'Concurrent, rollback, network chaos',
      },
      steps: {
        problem: 'Problem',
        prepaint: 'Prepaint',
        localFirst: 'Local-First',
        tx: 'Tx',
        start: 'Start',
      },
    },
  },
  ko: {
    common: {
      exit: '나가기',
      tour: '투어',
      next: '다음',
      back: '뒤로',
      skipTour: '투어 건너뛰기',
      explorePlayground: 'Playground 둘러보기',
      loading: '로딩 중...',
      contentLoaded: '콘텐츠 로드 완료!',
      clickRefreshToSimulate: '새로고침을 클릭하여 시뮬레이션',
      refresh: '새로고침 (F5)',
      refreshPage: '페이지 새로고침',
      cartItems: '장바구니 항목',
      navigateAway: '페이지 이동',
      dataLostOnNavigation: '페이지 이동 시 데이터 손실!',
      readyToSubmit: '제출 준비 완료',
      submitting: '제출 중...',
      networkError: '네트워크 오류',
      manualRetryRequired: '수동 재시도 필요',
      submitForm: '폼 제출',
      loadTime: '로드 시간',
      blankScreen: '빈 화면...',
      visit: '방문',
      restoringSnapshot: '스냅샷 복원 중...',
      loadCart: '장바구니 로드',
      loadingCart: '장바구니 로딩 중...',
      closeTabSimulate: '탭 닫기 (시뮬레이션)',
      cartDataWasLost: '장바구니 데이터가 손실되었습니다!',
      syncingToServer: '서버와 동기화 중...',
      dataRestoredFromIndexedDB: 'IndexedDB에서 데이터 복원!',
      inventoryCount: '재고 수량',
      updating: '업데이트 중...',
      networkErrorUpdateFailed: '네트워크 오류! 업데이트 실패.',
      retry: '재시도',
      clickToTriggerNetworkError: '+1을 클릭하여 네트워크 오류 발생',
      waitingForServerResponse: '서버 응답 대기 중...',
      optimisticUpdateApplied: '낙관적 업데이트 적용, 동기화 중...',
      networkFailedRollingBack: '네트워크 실패 - 자동 롤백 중...',
      clickToSeeOptimisticUpdate: '+1을 클릭하여 낙관적 업데이트 + 자동 롤백 확인',
      install: '설치',
      terminal: '터미널',
      copied: '복사됨!',
      copy: '복사',
      exploreMoreScenarios: '더 많은 시나리오 탐색',
      resources: '리소스',
      githubRepository: 'GitHub 저장소',
      sourceCodeAndDocumentation: '소스 코드 및 문서',
      gettingStartedGuide: '시작 가이드',
      stepByStepSetupInstructions: '단계별 설정 안내',
      documentation: '문서',
      aboutFirstTx: 'FirstTx 소개',
      aboutFirstTxDescription:
        'CSR 재방문 경험을 SSR처럼 느끼게 만드는 통합 시스템. Prepaint, Local-First, Tx 레이어를 결합.',
      prepaintPackage: 'Prepaint 패키지',
      localFirstPackage: 'Local-First 패키지',
      txPackage: 'Tx 패키지',
    },
    home: {
      tagline: 'CSR을 SSR처럼 느끼게',
      description:
        '새로고침 시 빈 화면 없음. 네비게이션 시 데이터 손실 없음. 자동 에러 복구. 5분 안에 차이를 경험하세요.',
      fiveMinTour: '5분 투어',
      prepaint: 'Prepaint',
      prepaintDescription: '즉시 재생',
      sync: 'Sync',
      syncDescription: '서버 동기화',
      tx: 'Tx',
      txDescription: '원자적 업데이트',
      prepaintWarmFcp: 'Prepaint Warm FCP',
      prepaintWarmFcpDescription: '재방문 시 빈 화면 (ms)',
      instantCartTimeSaved: 'Instant Cart 절약 시간',
      instantCartTimeSavedDescription: '인터랙션당 (ms)',
      higherIsBetter: '높을수록 좋음',
      concurrentSuccessRate: '동시성 성공률',
      txCompletion: 'Tx 완료',
      scenarios: '시나리오',
    },
    tour: {
      problem: {
        title: '익숙한 문제들?',
        description:
          '이러한 일반적인 CSR 문제는 사용자와 개발자 모두를 좌절시킵니다. FirstTx가 어떻게 해결하는지 살펴보겠습니다.',
        blankScreenOnRefresh: '새로고침 시 빈 화면',
        blankScreenOnRefreshDescription: 'JavaScript가 로드되는 동안 2-3초간 아무것도 보이지 않음',
        dataLostOnNavigation: '네비게이션 시 데이터 손실',
        dataLostOnNavigationDescription: '사용자가 이동하면 폼 데이터와 상태가 사라짐',
        manualErrorRecovery: '수동 에러 복구',
        manualErrorRecoveryDescription: '네트워크 실패 시 사용자가 수동으로 재시도해야 함',
      },
      prepaint: {
        title: 'Prepaint: 0ms 로드',
        description:
          'Prepaint는 UI를 IndexedDB에 저장하고 React가 로드되기도 전에 즉시 복원합니다.',
        tryThis: '이것을 시도해보세요',
        tryThisDescription:
          '두 패널에서 "페이지 새로고침"을 클릭하세요. 기존 CSR은 2초 동안 빈 화면을 보여주지만, Prepaint는 20ms 이내에 UI를 복원합니다.',
        traditionalCsr: '기존 CSR',
        traditionalCsrDescription:
          '매 새로고침마다 JavaScript가 로드되고 실행되는 동안 빈 화면을 보여줍니다.',
        withPrepaint: 'Prepaint 적용',
        withPrepaintDescription:
          '캐시된 DOM 스냅샷이 즉시 복원됩니다. React는 백그라운드에서 하이드레이트합니다.',
      },
      localFirst: {
        title: 'Local-First: 데이터 지속성',
        description:
          'Local-First는 자동 서버 동기화와 함께 IndexedDB에 데이터를 저장합니다. 데이터는 새로고침과 탭 닫기에도 유지됩니다.',
        tryThis: '이것을 시도해보세요',
        tryThisDescription:
          '장바구니에 항목을 추가한 다음 "탭 닫기"를 클릭하세요. 기존 방식은 모든 것을 잃지만, Local-First는 데이터를 보존합니다.',
        traditionalState: '기존 상태 관리',
        traditionalStateDescription:
          'React 상태는 메모리에 있습니다. 탭을 닫으면 데이터가 사라집니다.',
        withLocalFirst: 'Local-First 적용',
        withLocalFirstDescription:
          '데이터는 IndexedDB에 캐시됩니다. 탭을 다시 열면 모든 것이 그대로 있습니다.',
        dataPersistence: '데이터 지속성',
        none: '없음',
        automatic: '자동',
      },
      tx: {
        title: 'Tx: 자동 롤백',
        description:
          'Tx는 실패 시 자동 롤백과 함께 낙관적 업데이트를 제공합니다. 사용자는 데이터 일관성을 유지하면서 즉각적인 피드백을 받습니다.',
        tryThis: '이것을 시도해보세요',
        tryThisDescription:
          '두 패널에서 +1을 클릭하세요. 기존 방식은 수동 재시도가 필요하지만, Tx는 실패 시 자동으로 롤백합니다.',
        traditionalUpdates: '기존 업데이트',
        traditionalUpdatesDescription:
          '서버 응답을 기다립니다. 오류 시 오류 메시지를 표시하고 수동 재시도가 필요합니다.',
        withTx: 'Tx 적용',
        withTxDescription:
          '낙관적 업데이트를 즉시 적용합니다. 오류 시 사용자 개입 없이 자동으로 롤백합니다.',
        errorHandling: '에러 처리',
        manual: '수동',
        userAction: '사용자 액션',
        required: '필요',
      },
      next: {
        title: '시작할 준비가 되셨나요?',
        description:
          'FirstTx가 일반적인 CSR 문제를 어떻게 해결하는지 보셨습니다. 시작하는 방법은 다음과 같습니다.',
        prepaintDemos: 'Prepaint 데모',
        prepaintDemosDescription: '100개 이상의 제품 그리드, 라우트 전환',
        localFirstDemos: 'Local-First 데모',
        localFirstDemosDescription: '즉시 장바구니, TTL, Suspense',
        txDemos: 'Tx 데모',
        txDemosDescription: '동시성, 롤백 체인, 네트워크 카오스',
      },
      steps: {
        problem: '문제',
        prepaint: 'Prepaint',
        localFirst: 'Local-First',
        tx: 'Tx',
        start: '시작',
      },
    },
  },
} as const;

const i18n = rosetta(translations);

const STORAGE_KEY = 'firsttx-locale';

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'ko') return stored;
  const browserLang = navigator.language.split('-')[0];
  return browserLang === 'ko' ? 'ko' : 'en';
}

let currentLocale: Locale = 'en';

if (typeof window !== 'undefined') {
  currentLocale = getInitialLocale();
  i18n.locale(currentLocale);
}

export function setLocale(locale: Locale) {
  currentLocale = locale;
  i18n.locale(locale);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, locale);
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const result = i18n.t(key, params);
  return typeof result === 'string' ? result : key;
}

export { i18n };
