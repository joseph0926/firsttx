import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DOCS_ANCHOR_ID_PATTERN, LOCALE_ONLY_DOC_ANCHORS } from "../lib/docs/anchor-contract";
import type { Locale } from "./types";

export type DocsHeadingAnchor = {
  id: string;
  depth: 2 | 3;
  label: string;
  line: number;
};

export type DocsAnchorDocument = {
  docId: string;
  locale: Locale;
  source: string;
  headings: DocsHeadingAnchor[];
  issues: string[];
};

const DEFAULT_CONTENT_DIR = fileURLToPath(new URL("../content/docs", import.meta.url));
const FILE_PATTERN = /^(.+)\.(ko|en)\.mdx$/;
const HEADING_PATTERN = /^(##|###)\s+(.+)$/;
const ANCHOR_PATTERN = /^<DocsAnchor id="([^"]+)"\s*\/>$/;

export function inspectDocsAnchors(source: string): Pick<DocsAnchorDocument, "headings" | "issues"> {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const headings: DocsHeadingAnchor[] = [];
  const issues: string[] = [];
  const anchorLines = new Set<number>();

  for (let index = 0; index < lines.length; index++) {
    const heading = HEADING_PATTERN.exec(lines[index]);
    if (!heading) continue;

    let anchorIndex = index - 1;
    while (anchorIndex >= 0 && lines[anchorIndex].trim() === "") anchorIndex--;
    const anchor = anchorIndex >= 0 ? ANCHOR_PATTERN.exec(lines[anchorIndex].trim()) : null;

    if (!anchor) {
      issues.push(`line ${index + 1}: heading is missing an immediately preceding DocsAnchor`);
      continue;
    }

    const id = anchor[1];
    anchorLines.add(anchorIndex);
    if (!DOCS_ANCHOR_ID_PATTERN.test(id)) issues.push(`line ${anchorIndex + 1}: invalid anchor id ${id}`);

    headings.push({
      id,
      depth: heading[1] === "##" ? 2 : 3,
      label: heading[2],
      line: index + 1,
    });
  }

  for (let index = 0; index < lines.length; index++) {
    if (ANCHOR_PATTERN.test(lines[index].trim()) && !anchorLines.has(index)) issues.push(`line ${index + 1}: orphan DocsAnchor`);
  }

  const counts = Map.groupBy(headings, (heading) => heading.id);
  for (const [id, matches] of counts) {
    if (matches.length > 1) issues.push(`duplicate anchor id ${id}`);
  }

  return { headings, issues };
}

export function readDocsAnchorDocuments(contentDir = DEFAULT_CONTENT_DIR): DocsAnchorDocument[] {
  return fs
    .readdirSync(contentDir)
    .map((file) => ({ file, match: FILE_PATTERN.exec(file) }))
    .filter((entry): entry is { file: string; match: RegExpExecArray } => Boolean(entry.match))
    .map(({ file, match }) => {
      const inspected = inspectDocsAnchors(fs.readFileSync(path.join(contentDir, file), "utf8"));
      return {
        docId: match[1],
        locale: match[2] as Locale,
        source: file,
        ...inspected,
      };
    })
    .sort((left, right) => left.source.localeCompare(right.source));
}

export function localeAnchorDifferences(documents: DocsAnchorDocument[]) {
  const byDocId = Map.groupBy(documents, (document) => document.docId);

  return [...byDocId.entries()].map(([docId, localeDocuments]) => {
    const en = new Set(localeDocuments.find((document) => document.locale === "en")?.headings.map((heading) => heading.id) ?? []);
    const ko = new Set(localeDocuments.find((document) => document.locale === "ko")?.headings.map((heading) => heading.id) ?? []);
    return {
      docId,
      en: [...en].filter((id) => !ko.has(id)).sort(),
      ko: [...ko].filter((id) => !en.has(id)).sort(),
      expected: LOCALE_ONLY_DOC_ANCHORS[docId] ?? { en: [], ko: [] },
    };
  });
}
