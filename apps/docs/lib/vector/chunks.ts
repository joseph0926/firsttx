import artifactJson from "./index-artifact.json";
import type { ArtifactChunk, PackedIndexArtifact } from "./artifact-contract";

export const INDEX_CHUNKS: ArtifactChunk[] = (artifactJson as unknown as PackedIndexArtifact).chunks;
