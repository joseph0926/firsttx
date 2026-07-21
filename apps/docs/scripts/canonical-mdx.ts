import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Locale } from "./types";

export type CanonicalMdxDocument = {
  docId: string;
  locale: Locale;
  source: string;
  content: string;
};

const DEFAULT_CONTENT_DIR = fileURLToPath(new URL("../content/docs", import.meta.url));
const FILE_PATTERN = /^(.+)\.(ko|en)\.mdx$/;

function decodeString(value: string): string {
  return value.replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
}

function readScalarProperty(source: string, property: string): string | undefined {
  const key = new RegExp(`\\b${property}\\s*:\\s*`).exec(source);
  if (!key) return undefined;

  const rest = source.slice(key.index + key[0].length);
  const quote = rest[0];
  if (quote !== '"' && quote !== "'") return undefined;

  for (let index = 1; index < rest.length; index++) {
    if (rest[index] === quote && rest[index - 1] !== "\\") {
      return decodeString(rest.slice(1, index));
    }
  }

  return undefined;
}

function readAttribute(source: string, attribute: string): string | undefined {
  const match = new RegExp(`\\b${attribute}="((?:\\\\.|[^"])*)"`).exec(source);
  return match ? decodeString(match[1]) : undefined;
}

function cleanJsxText(value: string): string {
  return value
    .replace(/<code>([\s\S]*?)<\/code>/g, "`$1`")
    .replace(/<li[^>]*>/g, "\n- ")
    .replace(/<\/(?:li|p|div|ul|ol|h[1-6])>/g, "\n")
    .replace(/<br\s*\/?\s*>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{["']([^"']*)["']\}/g, "$1")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeApiTable(block: string): string {
  const title = readAttribute(block, "title");
  const itemStarts = [...block.matchAll(/^\s*name:\s*/gm)];
  const items = itemStarts.map((match, index) => {
    const start = match.index ?? 0;
    const end = itemStarts[index + 1]?.index ?? block.length;
    const itemSource = block.slice(start, end);
    const name = readScalarProperty(itemSource, "name");
    const type = readScalarProperty(itemSource, "type");
    const defaultValue = readScalarProperty(itemSource, "defaultValue");
    const required = /\brequired:\s*true\b/.test(itemSource);
    const descriptionKey = /\bdescription:\s*/.exec(itemSource);
    let description = "";

    if (descriptionKey) {
      const rawDescription = itemSource.slice(descriptionKey.index + descriptionKey[0].length).trim();
      if (rawDescription.startsWith('"')) {
        description = readScalarProperty(itemSource, "description") ?? "";
      } else {
        description = cleanJsxText(rawDescription.replace(/^\(/, "").replace(/\),?\s*\},?\s*$/, ""));
      }
    }

    const details = [type ? `type: \`${type}\`` : "", defaultValue ? `default: \`${defaultValue}\`` : "", required ? "required" : "optional"].filter(Boolean).join(", ");
    return name ? `- \`${name}\` (${details})${description ? ` — ${cleanJsxText(description)}` : ""}` : "";
  });

  return [title, ...items].filter(Boolean).join("\n");
}

function normalizeInstallTabs(block: string): string {
  const title = readAttribute(block, "title");
  const packagesSource = /packages=\{\[([\s\S]*?)\]\}/.exec(block)?.[1] ?? "";
  const packages = [...packagesSource.matchAll(/["']([^"']+)["']/g)].map((match) => match[1]);
  const isDev = /\bdev(?:=\{true\})?\b/.test(block);
  const packageList = packages.join(" ");
  if (!packageList) return title ?? "";

  const commands = [`- pnpm: \`pnpm add${isDev ? " -D" : ""} ${packageList}\``, `- npm: \`npm install${isDev ? " -D" : ""} ${packageList}\``, `- yarn: \`yarn add${isDev ? " -D" : ""} ${packageList}\``, `- bun: \`bun add${isDev ? " -d" : ""} ${packageList}\``];

  return [title, ...commands].filter(Boolean).join("\n");
}

export function normalizeCanonicalMdx(source: string): string {
  const fencedCode: string[] = [];
  const inlineCode: string[] = [];

  let normalized = source.replace(/\r\n/g, "\n").replace(/^export const metadata\s*=\s*\{[\s\S]*?^\};\s*/m, "");

  normalized = normalized.replace(/```[\s\S]*?```/g, (block) => {
    const token = `@@FIRSTTX_FENCED_${fencedCode.length}@@`;
    fencedCode.push(block);
    return `\n${token}\n`;
  });

  normalized = normalized.replace(/<ApiTable\b[\s\S]*?\n\/>/g, normalizeApiTable);
  normalized = normalized.replace(/<InstallTabs\b[\s\S]*?\/>/g, normalizeInstallTabs);
  normalized = normalized.replace(/<Callout\b([^>]*)>/g, (_match, attributes: string) => {
    const title = readAttribute(attributes, "title");
    return title ? `\n${title}\n` : "\n";
  });
  normalized = normalized.replace(/<\/Callout>/g, "\n");
  normalized = normalized.replace(/<code>([\s\S]*?)<\/code>/g, "`$1`");

  normalized = normalized.replace(/`[^`\n]+`/g, (block) => {
    const token = `@@FIRSTTX_INLINE_${inlineCode.length}@@`;
    inlineCode.push(block);
    return token;
  });

  normalized = normalized
    .replace(/<li[^>]*>/g, "\n- ")
    .replace(/<\/(?:li|p|div|ul|ol)>/g, "\n")
    .replace(/<br\s*\/?\s*>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\[\d+\]:\s+.*$/gm, "")
    .replace(/\{["']([^"']*)["']\}/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  inlineCode.forEach((block, index) => {
    normalized = normalized.replace(`@@FIRSTTX_INLINE_${index}@@`, block);
  });
  fencedCode.forEach((block, index) => {
    normalized = normalized.replace(`@@FIRSTTX_FENCED_${index}@@`, block);
  });

  return `${normalized}\n`;
}

export function readCanonicalMdxDocuments(contentDir = DEFAULT_CONTENT_DIR): CanonicalMdxDocument[] {
  return fs
    .readdirSync(contentDir)
    .map((file) => ({ file, match: FILE_PATTERN.exec(file) }))
    .filter((entry): entry is { file: string; match: RegExpExecArray } => Boolean(entry.match))
    .map(({ file, match }) => ({
      docId: match[1],
      locale: match[2] as Locale,
      source: file,
      content: normalizeCanonicalMdx(fs.readFileSync(path.join(contentDir, file), "utf8")),
    }))
    .sort((left, right) => left.source.localeCompare(right.source));
}
