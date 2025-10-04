# FirstTx

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-alpha-orange.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)

빈 화면 없이, 오프라인에서도, 일관성 있게 동작하는 CSR 앱

---

## 현재 CSR의 문제

**1. 빈 화면**  
번들 로드 전까지 사용자는 빈 화면을 봅니다.

**2. 상태 소실**  
새로고침/오프라인 시 작업 내용이 사라집니다.

**3. 복잡한 일관성**  
낙관 업데이트, 롤백, 캐시 무효화를 각각 관리해야 합니다.

---

## FirstTx의 해결 방식

**Prepaint** - 메인 번들 전에 초소형 스크립트가 실제 데이터로 UI를 그립니다.

**Local-First** - IndexedDB 기반 모델로 상태를 보관하고 멀티탭에서 동기화합니다.

**Transaction** - 변이/라우팅/캐시 무효화를 하나의 원자적 단위로 처리합니다.

---

## 요구사항

- Node.js 22+
- React 18+
- 지원 브라우저: Chrome/Edge/Safari (IndexedDB 필요)

---

## 빠른 시작

### 설치

```bash
pnpm add @fristtx/prepaint @fristtx/local-first @fristtx/tx
# or
npm install @fristtx/prepaint @fristtx/local-first @fristtx/tx
```

### 1. 모델 정의

```typescript
// models/cart.ts
import { defineModel } from '@fristtx/local-first';

export const cartModel = defineModel({
  name: 'cart',
  initial: { items: [] },
  ttl: 3600,
});
```

### 2. Prepaint 작성

```tsx
// routes/cart.prepaint.tsx
'use prepaint';

export default prepaint(async () => {
  const cart = await cartModel.getSnapshot();
  return <CartView items={cart.items} />;
});
```

### 3. 트랜잭션 사용

```typescript
import { startTransaction } from '@fristtx/tx';

const tx = startTransaction('장바구니 담기');

tx.run(
  () => {
    cartModel.patch((draft) => {
      draft.items.push(newItem);
    });
  },
  { optimistic: true },
);

await tx.commit();
```

### 4. Vite 설정

```typescript
// vite.config.ts
import { prepaint } from '@fristtx/prepaint/vite';

export default defineConfig({
  plugins: [prepaint()],
});
```

완료! 이제 빈 화면 없이 즉시 UI가 나타납니다.

---

## 언제 사용하나요?

### ✅ 적합한 경우

- CSR(Client-Side Rendering) 기반 앱
- IndexedDB를 사용할 수 있는 브라우저 환경
- 상태 변경이 빈번하고 즉각적인 피드백이 필요한 경우
- 오프라인 동작이 요구되는 경우

### ❌ 부적합한 경우

- SEO가 필수적인 경우 (SSR/SSG 권장)
- 브라우저 저장소를 사용할 수 없는 환경
- 서버 중심 상태 관리가 필요한 경우

---

## 참고

- [전체 문서](./docs/getting-started.md)
- [예제 프로젝트](./apps/demo)
- [API 레퍼런스](./docs/api)
- [이슈/토론](https://github.com/joseph0926/firsttx/issues)

---

## 라이선스

MIT

---

## 문의

- Repository: [https://github.com/joseph0926/firsttx](https://github.com/joseph0926/firsttx)
- Email: joseph0926.dev@gmail.com
