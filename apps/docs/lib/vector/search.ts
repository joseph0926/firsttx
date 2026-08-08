import artifactJson from "./index-artifact.json";
import { cosineSimilarity, decodeEmbeddings, normalizeScore, type PackedIndexArtifact } from "./artifact-contract";

export type Locale = "ko" | "en";

export interface SearchResult {
  id: string;
  score: number;
  metadata: {
    title: string;
    section: string;
    content: string;
    source: string;
  };
}

const artifact = artifactJson as unknown as PackedIndexArtifact;

let packedEmbeddings: Float32Array | null = null;

function getEmbeddings(): Float32Array {
  if (!packedEmbeddings) {
    packedEmbeddings = decodeEmbeddings(artifact.embeddings, artifact.chunks.length, artifact.dimensions);
    if (!Object.isFrozen(artifact)) {
      artifact.embeddings = "";
    }
  }

  return packedEmbeddings;
}

export function getIndexSummary() {
  return {
    embeddingModel: artifact.embeddingModel,
    indexContractVersion: artifact.indexContractVersion,
    dimensions: artifact.dimensions,
    chunkCount: artifact.chunks.length,
    revisions: artifact.revisions,
  };
}

export function searchDocs(embedding: number[], topK = 5, minScore = 0.5, locale: Locale = "ko"): SearchResult[] {
  const packed = getEmbeddings();
  const scored: SearchResult[] = [];

  for (let index = 0; index < artifact.chunks.length; index++) {
    const chunk = artifact.chunks[index];
    if (chunk.locale !== locale) continue;

    const similarity = cosineSimilarity(embedding, packed, index * artifact.dimensions, artifact.dimensions);

    scored.push({
      id: chunk.id,
      score: normalizeScore(similarity),
      metadata: {
        title: chunk.title,
        section: chunk.section,
        content: chunk.content,
        source: chunk.source,
      },
    });
  }

  return scored
    .sort((left, right) => right.score - left.score)
    .slice(0, topK)
    .filter((result) => result.score >= minScore);
}
