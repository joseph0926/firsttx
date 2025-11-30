import fs from "node:fs";
import type { Chunk } from "./types";

export function chunkMarkdown(content: string, docId: string, source: string): Chunk[] {
  const lines = content.split("\n");
  const chunks: Chunk[] = [];

  let currentH1 = "";
  let currentH2 = "";
  let currentH3 = "";
  let currentContent: string[] = [];

  function saveCurrentChunk() {
    const trimmedContent = currentContent.join("\n").trim();

    if (trimmedContent.length > 0) {
      chunks.push({
        id: `${docId}-${chunks.length + 1}`,
        title: currentH1,
        section: currentH3 || currentH2 || currentH1,
        content: trimmedContent,
        source,
      });
    }
    currentContent = [];
  }

  for (const line of lines) {
    if (line.startsWith("### ")) {
      saveCurrentChunk();
      currentH3 = line.slice(4);
    } else if (line.startsWith("## ")) {
      saveCurrentChunk();
      currentH2 = line.slice(3);
      currentH3 = "";
    } else if (line.startsWith("# ")) {
      saveCurrentChunk();
      currentH1 = line.slice(2);
      currentH2 = "";
      currentH3 = "";
    } else {
      currentContent.push(line);
    }
  }

  saveCurrentChunk();

  return chunks;
}

export function getMarkdownFiles(dirPath: string): string[] {
  const files = fs.readdirSync(dirPath);
  return files.filter((file) => file.endsWith(".md"));
}

export function readMarkdownFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}
