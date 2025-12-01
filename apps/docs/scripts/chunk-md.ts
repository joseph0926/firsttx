import fs from "node:fs";
import type { Chunk, Locale } from "./types";

interface RawChunk {
  title: string;
  section: string;
  content: string;
}

export function chunkMarkdown(content: string, docId: string, source: string, locale: Locale): Chunk[] {
  const lines = content.split("\n");
  const rawChunks: RawChunk[] = [];

  let currentH1 = docId;
  let currentH2 = "";
  let currentH3 = "";
  let currentContent: string[] = [];

  const MAX_CHARS = 2000;
  const MIN_CONTENT_LENGTH = 100;

  function buildSection(): string {
    const parts: string[] = [];
    if (currentH2) parts.push(currentH2);
    if (currentH3) parts.push(currentH3);
    return parts.length > 0 ? parts.join(" > ") : currentH1;
  }

  function saveCurrentChunk() {
    const trimmedContent = currentContent.join("\n").trim();
    if (!trimmedContent.length) {
      currentContent = [];
      return;
    }

    rawChunks.push({
      title: currentH1,
      section: buildSection(),
      content: trimmedContent,
    });
    currentContent = [];
  }

  for (const line of lines) {
    if (line.startsWith("### ")) {
      saveCurrentChunk();
      currentH3 = line.slice(4);
      currentContent.push(line);
    } else if (line.startsWith("## ")) {
      saveCurrentChunk();
      currentH2 = line.slice(3);
      currentH3 = "";
      currentContent.push(line);
    } else if (line.startsWith("# ")) {
      saveCurrentChunk();
      currentH1 = line.slice(2);
      currentH2 = "";
      currentH3 = "";
      currentContent.push(line);
    } else {
      currentContent.push(line);
    }
  }

  saveCurrentChunk();

  const mergedChunks: RawChunk[] = [];
  for (let i = 0; i < rawChunks.length; i++) {
    const chunk = rawChunks[i];

    if (chunk.content.length < MIN_CONTENT_LENGTH && i < rawChunks.length - 1) {
      const nextChunk = rawChunks[i + 1];
      nextChunk.content = chunk.content + "\n\n" + nextChunk.content;
      continue;
    }

    mergedChunks.push(chunk);
  }

  const chunks: Chunk[] = [];
  for (const raw of mergedChunks) {
    for (let i = 0; i < raw.content.length; i += MAX_CHARS) {
      const slice = raw.content.slice(i, i + MAX_CHARS);
      chunks.push({
        id: `${locale}-${docId}-${chunks.length + 1}`,
        title: raw.title,
        section: raw.section,
        content: slice,
        source,
        locale,
      });
    }
  }

  return chunks;
}

export function getMarkdownFiles(dirPath: string): string[] {
  const files = fs.readdirSync(dirPath);
  return files.filter((file) => file.endsWith(".md"));
}

export function readMarkdownFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}
