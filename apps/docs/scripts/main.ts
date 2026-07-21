import "./env";
import path from "node:path";
import { chunkMarkdown } from "./chunk-md";
import { readCanonicalMdxDocuments } from "./canonical-mdx";
import type { Chunk, ChunkWithEmbedding, Locale } from "./types";
import { embed } from "./embed";
import { resetNamespace, upsertChunks } from "./vector";
import { clearEmbeddingCache } from "./cache";
import { fileURLToPath } from "node:url";

const LOCALES: Locale[] = ["ko", "en"];

async function indexLocale(locale: Locale, contentDir: string): Promise<ChunkWithEmbedding[]> {
  const documents = readCanonicalMdxDocuments(contentDir).filter((document) => document.locale === locale);

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Indexing locale: ${locale.toUpperCase()}`);
  console.log(`Directory: ${contentDir}`);
  console.log(`${"=".repeat(50)}\n`);

  console.log(`Found ${documents.length} file(s)`);
  documents.forEach((document) => console.log(`   - ${document.source}`));
  console.log("");

  const allChunks: Chunk[] = [];

  for (const document of documents) {
    const chunks = chunkMarkdown(document.content, document.docId, document.source, locale);
    allChunks.push(...chunks);

    console.log(`${document.source}: ${chunks.length} chunks`);
    chunks.forEach((c) => {
      const preview = c.content.slice(0, 60).replace(/\n/g, " ");
      console.log(`   - [${c.id}] ${c.section}: "${preview}..."`);
    });
  }

  console.log("");
  console.log(`Total chunks for ${locale}: ${allChunks.length}`);
  console.log("");

  console.log(`Embedding chunks for ${locale}...`);
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
  console.log(`Embedding complete for ${locale}`);

  await resetNamespace(locale);

  console.log(`Upserting to namespace "${locale}"...`);
  await upsertChunks(chunksWithEmbeddings, locale);
  console.log(`Upserted ${chunksWithEmbeddings.length} vectors to namespace "${locale}"`);

  return chunksWithEmbeddings;
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const scriptDir = path.dirname(__filename);
  const contentDir = path.join(scriptDir, "../content/docs");

  console.log("Content directory:", contentDir);

  console.log("\nClearing embedding cache (Redis)...");
  const deletedKeys = await clearEmbeddingCache();
  console.log(`Deleted ${deletedKeys} cached embeddings`);

  const allChunks: ChunkWithEmbedding[] = [];

  for (const locale of LOCALES) {
    const chunks = await indexLocale(locale, contentDir);
    allChunks.push(...chunks);
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log("INDEXING COMPLETE");
  console.log(`${"=".repeat(50)}`);
  console.log(`Total vectors indexed: ${allChunks.length}`);
  LOCALES.forEach((locale) => {
    const count = allChunks.filter((c) => c.locale === locale).length;
    console.log(`  - ${locale}: ${count} vectors`);
  });

  return allChunks;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
