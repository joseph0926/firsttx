import { getEmbedding } from "./embeddings";
import { searchDocs, type SearchResult } from "../vector/search";

export interface RAGContext {
  results: SearchResult[];
  contextText: string;
}

export async function retrieveContext(query: string, topK = 5): Promise<RAGContext> {
  const embedding = await getEmbedding(query);
  const results = await searchDocs(embedding, topK);

  const contextText = results
    .map((r, i) => {
      return `[${i + 1}] ${r.metadata.title} - ${r.metadata.section}\n${r.metadata.content}`;
    })
    .join("\n\n---\n\n");

  return { results, contextText };
}

export function buildSystemPrompt(contextText: string): string {
  return `당신은 FirstTx 공식 문서 도우미입니다.

FirstTx는 CSR React 앱을 위한 최적화 라이브러리로, 세 가지 패키지로 구성됩니다:
- Prepaint: DOM 스냅샷 저장/복원으로 재방문 시 즉시 화면 표시
- Local-First: IndexedDB 기반 오프라인 데이터 레이어
- Tx: 낙관적 업데이트 트랜잭션 관리

## 규칙

1. 오직 아래 CONTEXT에 제공된 문서 내용만 사용하여 답변하세요.
2. CONTEXT에 없는 내용은 절대 만들어내지 마세요.
3. 관련 내용이 없으면 "제공된 문서에서 관련 정보를 찾을 수 없습니다. GitHub Issues에 질문을 남겨주세요: https://github.com/joseph0926/firsttx/issues/new" 라고 답변하세요.
4. 코드 예제를 제공할 때는 문서에 있는 예제를 기반으로 하세요.
5. 한국어로 답변하세요.

## CONTEXT

${contextText}`;
}

export function formatCitations(results: SearchResult[]): string {
  if (results.length === 0) return "";

  const citations = results
    .slice(0, 3)
    .map((r) => `- ${r.metadata.title} > ${r.metadata.section}`)
    .join("\n");

  return `\n\n---\n**참고 문서:**\n${citations}`;
}
