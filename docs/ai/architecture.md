# 아키텍처 개요

FirstTx는 SSR 없이 CSR 재방문 UX를 개선하는 툴킷입니다. 세 가지 레이어를 조합합니다.

## 핵심 레이어

1. Prepaint
   - 페이지 이탈 시 DOM 스냅샷을 저장
   - JS 로드 전 마지막 화면을 즉시 복원
   - React 하이드레이션 또는 클린 렌더로 핸드오프

2. Local-First
   - IndexedDB 모델 정의 + 동기 메타데이터 제공
   - React 훅으로 동기 스냅샷 제공
   - 스테일니스/머지/동기화 트리거 관리

3. Tx
   - 낙관적 단계 실행 + 보상(compensation)
   - 실패 시 역순 롤백
   - 재시도/백오프 및 ViewTransition 통합

## 보조 컴포넌트

- DevTools: Prepaint/Local-First/Tx 이벤트를 DevTools 패널로 스트리밍
- Playground: 시나리오 기반 데모 앱
- Docs: Next.js + MDX 문서 사이트
