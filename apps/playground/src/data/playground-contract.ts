export type PlaygroundPackage = 'prepaint' | 'local-first' | 'tx';

export type ScenarioDisposition =
  | 'current-contract'
  | 'expected-limitation'
  | 'demo-rewrite'
  | 'package-fix-first'
  | 'remove-until-supported';

export type MetricKind = 'contract' | 'benchmark' | 'expected-limitation';

export interface PlaygroundScenarioContract {
  id: string;
  route: string;
  title: string;
  packages: PlaygroundPackage[];
  userJob: string;
  contract: string;
  disposition: ScenarioDisposition;
  metricKinds: MetricKind[];
  testOwner: string;
  releaseCondition: string;
}

export const playgroundScenarioContracts: PlaygroundScenarioContract[] = [
  {
    id: 'prepaint-heavy',
    route: '/prepaint/heavy',
    title: 'Heavy Page',
    packages: ['prepaint'],
    userJob: '재방문 화면 재생과 React 전환 순서를 확인합니다.',
    contract:
      '조건에 맞는 스냅샷을 비상호작용 오버레이로 표시하고 React가 처음 반영된 뒤 제거합니다.',
    disposition: 'demo-rewrite',
    metricKinds: ['contract', 'benchmark'],
    testOwner: 'prepaint-handoff.spec.ts · prepaint-heavy.spec.ts',
    releaseCondition: '첫 화면 표시, 입력 가능 시점, React 전환 시점을 실제 측정값으로 표시',
  },
  {
    id: 'prepaint-route-switching',
    route: '/prepaint/route-switching',
    title: 'Route Switching',
    packages: ['prepaint', 'local-first'],
    userJob: '경로별 스냅샷 저장·재생과 허용 목록의 경계를 확인합니다.',
    contract: '정확히 일치하는 경로 정책에 따라 각 경로의 스키마 v2 스냅샷을 관리합니다.',
    disposition: 'current-contract',
    metricKinds: ['contract', 'benchmark'],
    testOwner: 'prepaint-route-switching.spec.ts',
    releaseCondition: '하위 경로 4개와 경로 정책의 출처를 한 화면에서 확인 가능',
  },
  {
    id: 'sync-instant-cart',
    route: '/sync/instant-cart',
    title: 'Optimistic Cart',
    packages: ['local-first', 'tx'],
    userJob: '낙관적 화면 반영과 서버 응답을 나누어 비교합니다.',
    contract: '낙관적 콜백을 먼저 실행하고 요청 실패 시 전달된 스냅샷을 복원합니다.',
    disposition: 'demo-rewrite',
    metricKinds: ['contract', 'benchmark'],
    testOwner: 'instant-cart.contract.spec.ts · instant-cart.metrics.spec.ts',
    releaseCondition: '입력부터 화면 반영, 서버 응답, 요청 우선 방식의 완료 시점을 각각 측정',
  },
  {
    id: 'sync-timing',
    route: '/sync/timing',
    title: 'Replace / Rollback Ordering',
    packages: ['local-first', 'tx'],
    userJob: '트랜잭션과 외부 데이터 교체 사이의 처리 순서 한계를 재현합니다.',
    contract: 'Local-First의 데이터 교체와 Tx 롤백 사이의 통합 처리 순서는 보장하지 않습니다.',
    disposition: 'expected-limitation',
    metricKinds: ['expected-limitation'],
    testOwner: 'sync-timing.contract.spec.ts',
    releaseCondition: '롤백 전·중·후 데이터 교체 사례와 각 사례의 최종 스냅샷을 공개',
  },
  {
    id: 'sync-staleness',
    route: '/sync/staleness',
    title: 'Staleness Detection',
    packages: ['local-first'],
    userJob: 'TTL과 화면 진입 시 동기화 전략의 차이를 확인합니다.',
    contract:
      'history.isStale 값과 always, stale, never 설정에 따라 화면 진입 시 동기화를 결정합니다.',
    disposition: 'current-contract',
    metricKinds: ['contract'],
    testOwner: 'sync-staleness.spec.ts',
    releaseCondition: '데모와 실제 모델의 TTL, 마지막 갱신 시각을 함께 표시',
  },
  {
    id: 'sync-suspense',
    route: '/sync/suspense',
    title: 'Suspense Cache Flow',
    packages: ['local-first'],
    userJob: '첫 방문, 유효한 캐시, 만료된 캐시의 흐름을 비교합니다.',
    contract:
      '빈 캐시는 대기 화면을 표시하고, 유효한 캐시는 저장된 데이터를 반환하며, 만료된 캐시는 데이터를 보여 주면서 다시 확인합니다.',
    disposition: 'current-contract',
    metricKinds: ['contract'],
    testOwner: 'sync-suspense.contract.spec.ts',
    releaseCondition: '첫 방문, 유효·만료 캐시, 오류와 복구 사례를 모두 제공',
  },
  {
    id: 'tx-concurrent',
    route: '/tx/concurrent',
    title: 'Overlapping Hook Calls',
    packages: ['tx', 'local-first'],
    userJob: '같은 useTx 훅을 겹쳐 호출할 때 상태가 어디까지 공유되는지 확인합니다.',
    contract: '트랜잭션 객체는 별도지만 훅의 상태와 취소 컨트롤러는 호출별로 분리되지 않습니다.',
    disposition: 'expected-limitation',
    metricKinds: ['expected-limitation', 'benchmark'],
    testOwner: 'tx-concurrent.limitation.spec.ts · tx-concurrent.metrics.spec.ts',
    releaseCondition: '공유 상태의 한계를 재현하고 호출별 상태를 보장하는 표현은 사용하지 않음',
  },
  {
    id: 'tx-rollback-chain',
    route: '/tx/rollback-chain',
    title: 'Rollback Chain',
    packages: ['tx'],
    userJob: '완료된 단계가 역순으로 보상 처리되는지 확인합니다.',
    contract: '실패 전에 완료된 단계를 역순으로 보상하며, 보상 작업 자체도 실패할 수 있습니다.',
    disposition: 'current-contract',
    metricKinds: ['contract', 'benchmark'],
    testOwner: 'tx-rollback.spec.ts',
    releaseCondition: '상태 복원과 처리 순서는 계약으로, 소요 시간은 참고 측정값으로 구분',
  },
  {
    id: 'tx-network-chaos',
    route: '/tx/network-chaos',
    title: 'Retry and Backoff',
    packages: ['tx'],
    userJob: '재시도, 대기 간격, 재시도 소진 뒤의 롤백을 확인합니다.',
    contract:
      '설정한 최대 시도 횟수와 대기 방식을 적용하고, 모두 실패하면 완료된 단계를 보상합니다.',
    disposition: 'current-contract',
    metricKinds: ['contract', 'benchmark'],
    testOwner: 'tx-network-chaos.spec.ts',
    releaseCondition: '고정된 실패 순서를 사용하고 실행 결과만 성공·재시도·실패로 집계',
  },
];

export function getScenarioContract(id: string) {
  return playgroundScenarioContracts.find((scenario) => scenario.id === id);
}
