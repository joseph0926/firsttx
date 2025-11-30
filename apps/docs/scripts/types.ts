export interface Chunk {
  id: string;
  title: string;
  section: string;
  content: string;
  source: string;
}

export interface ChunkWithEmbedding extends Chunk {
  embedding: number[];
}
