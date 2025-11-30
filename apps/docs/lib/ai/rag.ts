import { getEmbedding } from "./embeddings";
import { searchDocs, type SearchResult } from "../vector/search";

export interface RAGContext {
  results: SearchResult[];
  contextText: string;
}

export async function retrieveContext(query: string, topK = 8): Promise<RAGContext> {
  const embedding = await getEmbedding(query);
  const results = await searchDocs(embedding, topK);

  const MAX_CONTEXT_CHARS = 4000;
  let used = 0;
  const parts: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const block = `[${i + 1}] ${r.metadata.title} - ${r.metadata.section}\n${r.metadata.content}`;
    if (used + block.length > MAX_CONTEXT_CHARS) break;
    parts.push(block);
    used += block.length;
  }

  const contextText = parts.join("\n\n---\n\n");

  return { results, contextText };
}

export function buildSystemPrompt(contextText: string): string {
  const hasContext = contextText.trim().length > 0;
  const contextDescription = hasContext ? contextText : "(관련 문서가 검색되지 않았습니다. 이 경우 UNKNOWN 규칙을 반드시 따르세요.)";

  return `당신은 FirstTx 공식 문서 도우미입니다. 사용자의 질문에 정확하게 답변하세요.

## FirstTx 소개

FirstTx는 CSR React 앱을 위한 최적화 라이브러리입니다:
- **Prepaint**: 페이지 이탈 시 DOM 스냅샷을 IndexedDB에 저장하고, 재방문 시 React 로드 전에 복원하여 빈 화면 방지
- **Local-First**: IndexedDB 기반 오프라인 우선 데이터 레이어
- **Tx**: 낙관적 업데이트 트랜잭션 관리

## 핵심 규칙 (반드시 준수)

### CONTEXT 기반 답변
- 아래 CONTEXT 섹션에 있는 내용**만** 사용하여 답변하세요
- CONTEXT에 있는 내용을 그대로 인용하거나 요약하세요
- CONTEXT에 코드 예제가 있으면 그것을 사용하세요

### 절대 금지 사항
- CONTEXT에 없는 함수명, 컴포넌트명, 훅 이름, 옵션명, 타입명을 만들어내지 마세요
- CONTEXT에 없는 API 사용법을 추측하지 마세요
- 존재하지 않는 컴포넌트(예: <Prepaint />, <FirstTx />)를 만들지 마세요
- 문서에 없는 import 경로를 추측하지 마세요

### UNKNOWN 규칙
질문에 대한 답이 CONTEXT에 없으면 반드시 다음과 같이 답변하세요:
"해당 내용은 현재 문서에서 찾을 수 없습니다. GitHub Issues에서 질문해 주세요: https://github.com/joseph0926/firsttx/issues/new"

### 답변 형식
- 한국어로 답변하세요
- 코드 예제는 CONTEXT에 있는 것만 사용하세요
- 확실하지 않은 내용은 "문서에서 확인이 필요합니다"라고 명시하세요

## CONTEXT

${contextDescription}`;
}

export function formatCitations(results: SearchResult[]): string {
  if (results.length === 0) return "";

  const citations = results
    .slice(0, 3)
    .map((r) => `- ${r.metadata.title} > ${r.metadata.section}`)
    .join("\n");

  return `\n\n---\n**참고 문서:**\n${citations}`;
}
