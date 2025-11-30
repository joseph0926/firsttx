import { config } from "dotenv";
import path from "node:path";
import { chunkMarkdown, getMarkdownFiles, readMarkdownFile } from "./chunk-md";
import type { Chunk, ChunkWithEmbedding } from "./types";
import { embed } from "./embed";
import { upsertChunks } from "./vector";

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
config({ path: path.join(scriptDir, "../.env.local") });

async function main() {
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const contentDir = path.join(scriptDir, "../content/ai");

  console.log("Content directory:", contentDir);
  console.log("");

  const files = getMarkdownFiles(contentDir);
  console.log(`Found ${files.length} file(s)`);
  files.forEach((f) => console.log(`   - ${f}`));
  console.log("");

  const allChunks: Chunk[] = [];

  for (const file of files) {
    const filePath = path.join(contentDir, file);
    const content = readMarkdownFile(filePath);

    const docId = file.replace(".md", "");

    const chunks = chunkMarkdown(content, docId, file);
    allChunks.push(...chunks);

    console.log(`${file}: ${chunks.length} chunks`);
  }

  console.log("");
  console.log(`Total chunks: ${allChunks.length}`);
  console.log("");

  console.log("Embedding chunks...");
  const chunksWithEmbeddings: ChunkWithEmbedding[] = [];

  for (let i = 0; i < allChunks.length; i++) {
    const chunk = allChunks[i];
    const textToEmbed = `${chunk.title} - ${chunk.section}\n\n${chunk.content}`;
    const embedding = await embed(textToEmbed);

    chunksWithEmbeddings.push({ ...chunk, embedding });
    console.log(`  [${i + 1}/${allChunks.length}] ${chunk.id} (${embedding.length} dims)`);
  }

  console.log("");
  console.log("Embedding complete");
  console.log("");

  console.log("Upserting to Upstash Vector...");
  await upsertChunks(chunksWithEmbeddings);
  console.log(`Upserted ${chunksWithEmbeddings.length} vectors`);

  return chunksWithEmbeddings;
}

main().catch(console.error);
