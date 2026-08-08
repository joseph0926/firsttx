import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { readCanonicalMdxDocuments } from "./canonical-mdx";
import { createIndexPlan } from "./index-plan";
import { EMBEDDING_MODEL_ID, INDEX_CONTRACT_VERSION } from "../lib/ai/index-contract";
import { ARTIFACT_VERSION, decodeEmbeddings, type PackedIndexArtifact } from "../lib/vector/artifact-contract";

const ARTIFACT_PATH = fileURLToPath(new URL("../lib/vector/index-artifact.json", import.meta.url));

function main(): void {
  if (!fs.existsSync(ARTIFACT_PATH)) {
    throw new Error("lib/vector/index-artifact.json이 없습니다. pnpm ai:build-index를 실행하고 커밋하세요.");
  }

  const artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, "utf8")) as PackedIndexArtifact;
  const documents = readCanonicalMdxDocuments();
  const problems: string[] = [];

  if (artifact.artifactVersion !== ARTIFACT_VERSION) {
    problems.push(`artifactVersion ${artifact.artifactVersion} != ${ARTIFACT_VERSION}`);
  }

  if (artifact.embeddingModel !== EMBEDDING_MODEL_ID) {
    problems.push(`embeddingModel "${artifact.embeddingModel}" != "${EMBEDDING_MODEL_ID}"`);
  }

  if (artifact.indexContractVersion !== INDEX_CONTRACT_VERSION) {
    problems.push(`indexContractVersion "${artifact.indexContractVersion}" != "${INDEX_CONTRACT_VERSION}"`);
  }

  if (!Number.isInteger(artifact.dimensions) || artifact.dimensions <= 0) {
    problems.push(`dimensions가 유효하지 않음: ${artifact.dimensions}`);
  } else {
    try {
      const decoded = decodeEmbeddings(artifact.embeddings, artifact.chunks.length, artifact.dimensions);
      if (decoded.some((value) => !Number.isFinite(value))) {
        problems.push("embeddings payload에 유한하지 않은 값이 포함됨");
      }
    } catch (error) {
      problems.push(`embeddings payload 손상: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  for (const locale of ["ko", "en"] as const) {
    const plan = createIndexPlan(documents, locale);

    if (artifact.revisions[locale] !== plan.contentRevision) {
      problems.push(`${locale} content revision 불일치: artifact ${artifact.revisions[locale].slice(0, 12)} != 문서 ${plan.contentRevision.slice(0, 12)}`);
    }

    const chunkCount = artifact.chunks.filter((chunk) => chunk.locale === locale).length;
    if (chunkCount !== plan.expectedChunkCount) {
      problems.push(`${locale} chunk 수 불일치: artifact ${chunkCount} != 문서 ${plan.expectedChunkCount}`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`index artifact가 canonical 문서와 어긋납니다.\n${problems.map((problem) => `  - ${problem}`).join("\n")}\n\npnpm --filter @firsttx/docs ai:build-index를 실행하고 결과를 커밋하세요.`);
  }

  console.log(`index artifact 최신 상태 (chunks ${artifact.chunks.length}, ko ${artifact.revisions.ko.slice(0, 12)}, en ${artifact.revisions.en.slice(0, 12)})`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
