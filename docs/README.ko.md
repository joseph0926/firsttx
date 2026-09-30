<p align="center">
  <img src="https://res.cloudinary.com/dx25hswix/image/upload/v1759570576/firsttx_logo_github_wbrocl.png" alt="FirstTx 로고" width="720" />
</p>

# FirstTx

[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/joseph0926/firsttx/badge)](https://scorecard.dev/viewer/?uri=github.com/joseph0926/firsttx)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 영문 버전은 [README.md](../README.md)를 확인하세요.

**마지막 시각적 상태를 재생해 CSR 재방문 시 빈 화면 시간을 줄입니다**

FirstTx는 SSR이나 Next.js 런타임을 도입하기 어려워 클라이언트 렌더링을 유지해야 하는
재방문 빈도가 높은 React 앱을 위한 도구입니다. 사용 빈도가 낮은 앱에서는 스냅샷
계층을 추가할 만큼의 이점이 크지 않습니다.

<table>
<tr>
<td align="center">Prepaint 없음</td>
<td align="center">Prepaint 적용</td>
</tr>
<tr>
<td><img src="https://res.cloudinary.com/dx25hswix/image/upload/v1760316819/firsttx-01_vi2svy.gif" alt="느린 4G 재방문에서 빈 화면 노출" /></td>
<td><img src="https://res.cloudinary.com/dx25hswix/image/upload/v1760316819/firsttx-02_tfmsy7.gif" alt="느린 4G 재방문에서 스냅샷 재생" /></td>
</tr>
</table>

## 설치

```bash
pnpm add @firsttx/prepaint
```

> ESM 전용입니다. CommonJS에서는 동적 `import()`를 사용하세요.

## 빠른 시작

### 1. Vite 플러그인

```ts
// vite.config.ts
import { firstTx } from '@firsttx/prepaint/plugin/vite';

export default defineConfig({
  plugins: [
    firstTx({
      policy: { routes: ['/dashboard', '/cart'] },
    }),
  ],
});
```

> `policy.routes`에 경로를 명시하기 전까지 Prepaint는 꺼져 있습니다. 경로는 정확히 일치해야 합니다. 스냅샷 복원은 항상 React root 바깥의 상호작용 불가 오버레이를 사용합니다.

### 2. 진입점

```tsx
// main.tsx
import { createFirstTxRoot } from '@firsttx/prepaint';

createFirstTxRoot(document.getElementById('root')!, <App />);
```

전체 API는 [Prepaint README](../packages/prepaint/README.md)를 참고하세요.

## 사용 시점

| FirstTx 사용                | 대안 고려                            |
| --------------------------- | ------------------------------------ |
| 내부 도구(CRM, 대시보드)    | 공개 랜딩 페이지 → SSR/SSG           |
| 잦은 재방문(하루 10회 이상) | 첫 방문 성능이 중요 → SSR            |
| SEO 요구 없음               | 항상 최신 데이터 필요 → 서버 주도 UI |

## 브라우저 지원

| 브라우저    | 최소 버전 | ViewTransition   |
| ----------- | --------- | ---------------- |
| Chrome/Edge | 111+      | 전체 지원        |
| Firefox     | 최신      | 점진적 대체 동작 |
| Safari      | 16+       | 점진적 대체 동작 |

## 문제 해결

**새로고침 시 UI 중복**: `@firsttx/prepaint@0.11.0` 이상으로 업그레이드하고 `createFirstTxRoot`로 React를 마운트하세요. 별도 오버레이 옵션은 필요하지 않습니다.

**자주 바뀌는 스냅샷 콘텐츠**: 캡처한 시각적 스냅샷에서 비워야 할 콘텐츠에 `data-firsttx-volatile`을 추가하세요.

**TypeScript 오류**: `declare const __FIRSTTX_DEV__: boolean`을 추가하세요.

더 많은 내용은 [GitHub Issues](https://github.com/joseph0926/firsttx/issues)에서 확인하세요.

## 라이선스

MIT © [joseph0926](https://github.com/joseph0926)
