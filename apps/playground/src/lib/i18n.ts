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
        'Prepaint, Local-First, and Tx cover revisit snapshot replay, persistent client state, and compensating rollback.',
      prepaintPackage: 'Prepaint Package',
      localFirstPackage: 'Local-First Package',
      txPackage: 'Tx Package',
    },
    home: {
      tagline: 'Test FirstTx against its current contract',
      description:
        'Run the demos for snapshot replay, local persistence, retries, and rollback. Each scenario states what is supported and what is still limited.',
      fiveMinTour: 'Guided Tour',
      prepaint: 'Prepaint',
      prepaintDescription: 'Revisit snapshot replay',
      sync: 'Sync',
      syncDescription: 'Server reconciliation',
      tx: 'Tx',
      txDescription: 'Retry and compensation',
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
        title: 'Common CSR failure modes',
        description:
          'Compare a request-first implementation with the behavior that each FirstTx package currently provides.',
        blankScreenOnRefresh: 'Blank Screen on Refresh',
        blankScreenOnRefreshDescription:
          'A revisit waits for JavaScript before rendering the current screen',
        dataLostOnNavigation: 'Data Lost on Navigation',
        dataLostOnNavigationDescription: 'Form data and state disappear when users navigate',
        manualErrorRecovery: 'Manual Error Recovery',
        manualErrorRecoveryDescription: 'Network failures require users to manually retry',
      },
      prepaint: {
        title: 'Prepaint: Revisit snapshot replay',
        description:
          'Prepaint stores an eligible visual snapshot and can show it on a revisit before React commits the current screen.',
        tryThis: 'Try This',
        tryThisDescription:
          'Refresh both panels and compare the request-first screen with the stored visual snapshot shown before the current React screen.',
        traditionalCsr: 'Traditional CSR',
        traditionalCsrDescription:
          'Every refresh shows a blank screen while JavaScript loads and executes.',
        withPrepaint: 'With Prepaint',
        withPrepaintDescription:
          'An eligible snapshot is displayed as a non-interactive overlay until React commits.',
      },
      localFirst: {
        title: 'Local-First: Data Persistence',
        description:
          'Local-First stores this demo state in IndexedDB and runs the configured server synchronization path.',
        tryThis: 'Try This',
        tryThisDescription:
          'Add items to cart, then click "Close Tab". Traditional loses everything, while Local-First preserves your data.',
        traditionalState: 'Traditional State',
        traditionalStateDescription:
          'React state lives in memory. Close the tab and your data is gone.',
        withLocalFirst: 'With Local-First',
        withLocalFirstDescription:
          'The demo reads its cached state from IndexedDB when the screen opens again.',
        dataPersistence: 'Data Persistence',
        none: 'None',
        automatic: 'Automatic',
      },
      tx: {
        title: 'Tx: Auto-Rollback',
        description:
          'Tx runs an optimistic callback and invokes the configured rollback when that transaction fails.',
        tryThis: 'Try This',
        tryThisDescription:
          'Click +1 on both panels. Traditional requires manual retry, while Tx automatically rolls back on failure.',
        traditionalUpdates: 'Traditional Updates',
        traditionalUpdatesDescription:
          'Wait for server response. On error, show error message and require manual retry.',
        withTx: 'With Tx',
        withTxDescription:
          'Apply the optimistic change first. When the request fails, run the registered rollback callback.',
        errorHandling: 'Error Handling',
        manual: 'Manual',
        userAction: 'User Action',
        required: 'Required',
      },
      next: {
        title: 'Continue with the scenarios',
        description:
          'Open a scenario to inspect its code, supported behavior, known limits, and test owner.',
        prepaintDemos: 'Prepaint Demos',
        prepaintDemosDescription: '100+ product grid, route switching',
        localFirstDemos: 'Local-First Demos',
        localFirstDemosDescription: 'Instant cart, TTL, Suspense',
        txDemos: 'Tx Demos',
        txDemosDescription: 'Overlapping calls, rollback chain, retry and backoff',
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
        'Prepaint, Local-First, Tx로 재방문 화면 재생, 클라이언트 상태 저장, 보상 롤백을 다룹니다.',
      prepaintPackage: 'Prepaint 패키지',
      localFirstPackage: 'Local-First 패키지',
      txPackage: 'Tx 패키지',
    },
    home: {
      tagline: '현재 계약에 맞춰 FirstTx를 확인하세요',
      description:
        '스냅샷 재생, 로컬 저장, 재시도, 롤백 동작을 실행해 볼 수 있습니다. 각 시나리오에는 지원 범위와 알려진 한계를 함께 적었습니다.',
      fiveMinTour: '둘러보기',
      prepaint: 'Prepaint',
      prepaintDescription: '재방문 스냅샷 재생',
      sync: 'Sync',
      syncDescription: '서버 동기화',
      tx: 'Tx',
      txDescription: '재시도와 보상 처리',
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
        title: 'CSR 앱에서 자주 겪는 문제',
        description: '요청을 기다리는 구현과 FirstTx 패키지가 현재 제공하는 동작을 비교합니다.',
        blankScreenOnRefresh: '새로고침 시 빈 화면',
        blankScreenOnRefreshDescription: '재방문 화면이 JavaScript 실행 뒤에 표시됨',
        dataLostOnNavigation: '네비게이션 시 데이터 손실',
        dataLostOnNavigationDescription: '사용자가 이동하면 폼 데이터와 상태가 사라짐',
        manualErrorRecovery: '수동 에러 복구',
        manualErrorRecoveryDescription: '네트워크 실패 시 사용자가 수동으로 재시도해야 함',
      },
      prepaint: {
        title: 'Prepaint: 재방문 화면 재생',
        description:
          'Prepaint는 조건에 맞는 화면 스냅샷을 저장하고, 재방문 시 현재 React 화면이 반영되기 전에 보여 줄 수 있습니다.',
        tryThis: '확인 방법',
        tryThisDescription:
          '두 패널을 새로고침해 요청을 기다리는 화면과 저장된 시각 스냅샷이 먼저 표시되는 화면을 비교하세요.',
        traditionalCsr: '기존 CSR',
        traditionalCsrDescription:
          '매 새로고침마다 JavaScript가 로드되고 실행되는 동안 빈 화면을 보여줍니다.',
        withPrepaint: 'Prepaint 적용',
        withPrepaintDescription:
          '조건에 맞는 스냅샷을 비상호작용 오버레이로 표시하고 React가 반영되면 제거합니다.',
      },
      localFirst: {
        title: 'Local-First: 데이터 지속성',
        description:
          '이 데모는 Local-First로 상태를 IndexedDB에 저장하고 설정된 서버 동기화 경로를 실행합니다.',
        tryThis: '확인 방법',
        tryThisDescription:
          '장바구니에 항목을 추가한 다음 "탭 닫기"를 클릭하세요. 기존 방식은 모든 것을 잃지만, Local-First는 데이터를 보존합니다.',
        traditionalState: '기존 상태 관리',
        traditionalStateDescription:
          'React 상태는 메모리에 있습니다. 탭을 닫으면 데이터가 사라집니다.',
        withLocalFirst: 'Local-First 적용',
        withLocalFirstDescription: '화면을 다시 열 때 IndexedDB에 저장된 데모 상태를 읽습니다.',
        dataPersistence: '데이터 지속성',
        none: '없음',
        automatic: '자동',
      },
      tx: {
        title: 'Tx: 자동 롤백',
        description:
          'Tx는 낙관적 콜백을 실행하고 해당 트랜잭션이 실패하면 등록된 롤백 콜백을 호출합니다.',
        tryThis: '확인 방법',
        tryThisDescription:
          '두 패널에서 +1을 클릭하세요. 기존 방식은 수동 재시도가 필요하지만, Tx는 실패 시 자동으로 롤백합니다.',
        traditionalUpdates: '기존 업데이트',
        traditionalUpdatesDescription:
          '서버 응답을 기다립니다. 오류 시 오류 메시지를 표시하고 수동 재시도가 필요합니다.',
        withTx: 'Tx 적용',
        withTxDescription: '낙관적 변경을 먼저 반영하고 요청이 실패하면 등록된 롤백을 실행합니다.',
        errorHandling: '에러 처리',
        manual: '수동',
        userAction: '사용자 액션',
        required: '필요',
      },
      next: {
        title: '시나리오에서 더 확인하기',
        description:
          '각 시나리오에서 코드, 지원 동작, 알려진 한계, 담당 테스트를 확인할 수 있습니다.',
        prepaintDemos: 'Prepaint 데모',
        prepaintDemosDescription: '100개 이상의 제품 그리드, 라우트 전환',
        localFirstDemos: 'Local-First 데모',
        localFirstDemosDescription: '낙관적 장바구니, TTL, Suspense',
        txDemos: 'Tx 데모',
        txDemosDescription: '겹치는 호출, 롤백 체인, 재시도와 백오프',
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
  document.documentElement.lang = currentLocale;
}

export function setLocale(locale: Locale) {
  currentLocale = locale;
  i18n.locale(locale);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
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
