export const ARTIFACT_VERSION = 1;

export type ArtifactLocale = "ko" | "en";

export interface ArtifactChunk {
  id: string;
  title: string;
  section: string;
  source: string;
  content: string;
  locale: ArtifactLocale;
}

export interface PackedIndexArtifact {
  artifactVersion: number;
  embeddingModel: string;
  indexContractVersion: string;
  dimensions: number;
  revisions: Record<ArtifactLocale, string>;
  chunks: ArtifactChunk[];
  embeddings: string;
}

export function embeddingInputFor(chunk: Pick<ArtifactChunk, "title" | "section" | "content">): string {
  return `${chunk.title} - ${chunk.section}\n\n${chunk.content}`;
}

export function encodeEmbeddings(vectors: number[][]): string {
  if (vectors.length === 0) return "";

  const dimensions = vectors[0].length;
  const packed = new Float32Array(vectors.length * dimensions);

  vectors.forEach((vector, index) => {
    if (vector.length !== dimensions) {
      throw new Error(`Embedding at index ${index} has ${vector.length} dimensions, expected ${dimensions}`);
    }
    packed.set(vector, index * dimensions);
  });

  return Buffer.from(packed.buffer, packed.byteOffset, packed.byteLength).toString("base64");
}

export function decodeEmbeddings(encoded: string, expectedCount: number, dimensions: number): Float32Array {
  if (expectedCount === 0) return new Float32Array(0);

  const buffer = Buffer.from(encoded, "base64");
  const decoded = new Float32Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));

  if (decoded.length !== expectedCount * dimensions) {
    throw new Error(`Artifact embeddings hold ${decoded.length} floats, expected ${expectedCount * dimensions}`);
  }

  return decoded;
}

export function cosineSimilarity(query: number[], packed: Float32Array, offset: number, dimensions: number): number {
  let dot = 0;
  let queryNorm = 0;
  let chunkNorm = 0;

  for (let i = 0; i < dimensions; i++) {
    const left = query[i];
    const right = packed[offset + i];
    dot += left * right;
    queryNorm += left * left;
    chunkNorm += right * right;
  }

  if (queryNorm === 0 || chunkNorm === 0) return 0;

  return dot / (Math.sqrt(queryNorm) * Math.sqrt(chunkNorm));
}

export function normalizeScore(cosine: number): number {
  return (1 + cosine) / 2;
}
