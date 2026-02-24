### 분석 요약

모노레포의 공통 태스크는 `turbo.json`에 정의되어 있지만, 일부 패키지에서 해당 스크립트가 누락되어 태스크 그래프에 `<NONEXISTENT>`가 발생할 수 있는 상태였다. Topic 1 논의에서 우선순위 높은 보강안 2건(typecheck 실태스크화, shared lint 보강)을 수용했고, 실제 스크립트 추가와 태스크 실행 검증까지 완료했다.

### 현재 구현

- 공통 파이프라인: `turbo.json:23`, `turbo.json:27`, `turbo.json:31`
- docs 앱 스크립트: `apps/docs/package.json:14`, `apps/docs/package.json:15`
- playground 앱 스크립트: `apps/playground/package.json:13`, `apps/playground/package.json:14`
- shared 패키지 스크립트: `packages/shared/package.json:22`, `packages/shared/package.json:23`, `packages/shared/package.json:24`

### 개선 제안

| 우선순위 | 제안                                                       | 근거                                                                                       | 상태       |
| -------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------- |
| P1       | `apps/docs`, `apps/playground`에 `typecheck` 실태스크 추가 | `turbo.json:27` + `apps/docs/package.json:15` + `apps/playground/package.json:13`          | 수용(완료) |
| P2       | `@firsttx/shared`에 `lint` 실태스크 추가                   | `turbo.json:23` + `packages/shared/package.json:22`                                        | 수용(완료) |
| P3       | playground React Hooks 경고 해소                           | `apps/playground/src/pages/sync/instant-cart.tsx` lint 경고(`react-hooks/exhaustive-deps`) | 보류       |

### 논의 기록

- 사용자 요청으로 Topic 1(모노레포 구조/빌드 파이프라인)부터 순차 논의를 진행했다.
- 제안 1(typecheck 실태스크화)의 구체 보강 범위를 설명했고, 사용자 수용 후 즉시 반영/검증했다.
- 제안 2(shared lint 보강)도 사용자 수용 후 반영/검증했다.
- 현재는 반영 완료 지점까지 정리 요청에 따라 문서화 및 체크리스트 갱신을 수행했다.

### 최종 결정

- [수용] `apps/docs`에 `typecheck` 스크립트 추가
- [수용] `apps/playground`에 `typecheck` 스크립트 추가
- [수용] `@firsttx/shared`에 `lint` 스크립트 추가
- [보류] playground `react-hooks/exhaustive-deps` 경고 정리
