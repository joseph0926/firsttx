import "./env";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chunkMarkdown } from "./chunk-md";
import { readCanonicalMdxDocuments } from "./canonical-mdx";
import { createIndexPlan } from "./index-plan";
import { embed } from "./embed";
import type { Chunk } from "./types";
import { EMBEDDING_MODEL_ID, INDEX_CONTRACT_VERSION } from "../lib/ai/index-contract";
import { ARTIFACT_VERSION, embeddingInputFor, encodeEmbeddings, type PackedIndexArtifact } from "../lib/vector/artifact-contract";

const ARTIFACT_PATH = fileURLToPath(new URL("../lib/vector/index-artifact.json", import.meta.url));
const EMBED_CONCURRENCY = 4;

async function buildPackedArtifact(onProgress?: (done: number, total: number) => void): Promise<PackedIndexArtifact> {
  const documents = readCanonicalMdxDocuments();
  const chunks: Chunk[] = documents.flatMap((document) => chunkMarkdown(document.content, document.docId, document.source, document.locale));

  const vectors: number[][] = [];

  for (let i = 0; i < chunks.length; i += EMBED_CONCURRENCY) {
    const batch = chunks.slice(i, i + EMBED_CONCURRENCY);
    const embedded = await Promise.all(batch.map((chunk) => embed(embeddingInputFor(chunk))));

    vectors.push(...embedded);
    onProgress?.(vectors.length, chunks.length);
  }

  return {
    artifactVersion: ARTIFACT_VERSION,
    embeddingModel: EMBEDDING_MODEL_ID,
    indexContractVersion: INDEX_CONTRACT_VERSION,
    dimensions: vectors[0]?.length ?? 0,
    revisions: {
      ko: createIndexPlan(documents, "ko").contentRevision,
      en: createIndexPlan(documents, "en").contentRevision,
    },
    chunks: chunks.map((chunk) => ({
      id: chunk.id,
      title: chunk.title,
      section: chunk.section,
      source: chunk.source,
      content: chunk.content,
      locale: chunk.locale,
    })),
    embeddings: encodeEmbeddings(vectors),
  };
}

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("ai:build-index requires OPENAI_API_KEY");
  }

  console.log("canonical MDX를 읽고 전체 chunk를 임베딩합니다...");

  const artifact = await buildPackedArtifact((done, total) => {
    if (done % 40 === 0 || done === total) console.log(`  ${done}/${total}`);
  });

  fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
  fs.writeFileSync(ARTIFACT_PATH, `${JSON.stringify(artifact)}\n`);

  const bytes = fs.statSync(ARTIFACT_PATH).size;

  console.log(`\n${path.relative(process.cwd(), ARTIFACT_PATH)} 생성 완료`);
  console.log(`  chunks ${artifact.chunks.length}, dimensions ${artifact.dimensions}, ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  revision ko ${artifact.revisions.ko.slice(0, 12)} / en ${artifact.revisions.en.slice(0, 12)}`);
  console.log("\n이 파일을 커밋해야 배포에 반영됩니다.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
