import "./env";
import path from "node:path";
import { chunkMarkdown, getMarkdownFiles, readMarkdownFile } from "./chunk-md";
import type { Chunk, ChunkWithEmbedding } from "./types";
import { embed } from "./embed";
import { resetIndex, upsertChunks } from "./vector";
import { fileURLToPath } from "node:url";

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const scriptDir = path.dirname(__filename);
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
    const docId = file.replace(/\.md$/, "");

    const chunks = chunkMarkdown(content, docId, file);
    allChunks.push(...chunks);

    console.log(`${file}: ${chunks.length} chunks`);
    chunks.forEach((c) => {
      const preview = c.content.slice(0, 60).replace(/\n/g, " ");
      console.log(`   - [${c.id}] ${c.section}: "${preview}..."`);
    });
  }

  console.log("");
  console.log(`Total chunks: ${allChunks.length}`);
  console.log("");

  console.log("Embedding chunks...");
  const CONCURRENCY = 4;
  const chunksWithEmbeddings: ChunkWithEmbedding[] = [];

  for (let i = 0; i < allChunks.length; i += CONCURRENCY) {
    const batch = allChunks.slice(i, i + CONCURRENCY);

    const results = await Promise.all(
      batch.map(async (chunk, idx) => {
        const textToEmbed = `${chunk.title} - ${chunk.section}\n\n${chunk.content}`;
        const embedding = await embed(textToEmbed);
        const index = i + idx + 1;
        console.log(`  [${index}/${allChunks.length}] ${chunk.id} (${embedding.length} dims)`);
        return { ...chunk, embedding };
      }),
    );

    chunksWithEmbeddings.push(...results);
  }

  console.log("");
  console.log("Embedding complete");
  console.log("");

  await resetIndex();
  console.log("");

  console.log("Upserting to Upstash Vector...");
  await upsertChunks(chunksWithEmbeddings);
  console.log(`Upserted ${chunksWithEmbeddings.length} vectors`);

  return chunksWithEmbeddings;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
