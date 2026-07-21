import { describe, expect, it } from "vitest";
import { chunkMarkdown } from "./chunk-md";
import { normalizeCanonicalMdx, readCanonicalMdxDocuments } from "./canonical-mdx";

describe("normalizeCanonicalMdx", () => {
  it("preserves visible Markdown, component copy, API items, commands, and code", () => {
    const source = `export const metadata = {
  title: "Fixture",
};

# Fixture

<Callout type="info" title="Important boundary">
  Keep the <code>visible body</code>.
</Callout>

<InstallTabs title="Install packages" packages={["@firsttx/prepaint", "zod"]} />

<ApiTable
  kind="options"
  title="defineModel options"
  items={[
    {
      name: "schema",
      type: "z.ZodType<T>",
      required: true,
      description: "Schema used for <code>validation</code>.",
    },
  ]}
/>

\`\`\`ts
const value: Promise<string> = load();
\`\`\`
`;

    const result = normalizeCanonicalMdx(source);

    expect(result).not.toContain("export const metadata");
    expect(result).toContain("# Fixture");
    expect(result).toContain("Important boundary");
    expect(result).toContain("Keep the `visible body`.");
    expect(result).toContain("pnpm add @firsttx/prepaint zod");
    expect(result).toContain("defineModel options");
    expect(result).toContain("`schema` (type: `z.ZodType<T>`, required)");
    expect(result).toContain("Schema used for `validation`.");
    expect(result).toContain("const value: Promise<string> = load();");
    expect(result).not.toContain("@@FIRSTTX_");
  });
});

describe("readCanonicalMdxDocuments", () => {
  it("loads locale-paired canonical MDX and produces searchable chunks", () => {
    const documents = readCanonicalMdxDocuments();
    const byDocId = Map.groupBy(documents, (document) => document.docId);

    expect(documents).toHaveLength(18);
    expect([...byDocId.keys()].sort()).toEqual(["devtools", "getting-started", "local-first", "overview", "patterns", "prepaint", "reference", "troubleshooting", "tx"]);

    for (const localeDocuments of byDocId.values()) {
      expect(localeDocuments.map((document) => document.locale).sort()).toEqual(["en", "ko"]);
      expect(localeDocuments.every((document) => !/<(?:ApiTable|InstallTabs|Callout)\b/.test(document.content))).toBe(true);
    }

    const prepaintEn = documents.find((document) => document.docId === "prepaint" && document.locale === "en");
    expect(prepaintEn?.content).toContain("pnpm add @firsttx/prepaint");
    expect(prepaintEn?.content).toContain("createFirstTxRoot(container, element, options?)");
    expect(prepaintEn?.content).toContain("The DOM element where your React app is mounted (usually `#root`).");

    const chunks = documents.flatMap((document) => chunkMarkdown(document.content, document.docId, document.source, document.locale));
    expect(chunks.length).toBeGreaterThan(documents.length);
    expect(chunks.some((chunk) => chunk.source === "reference.ko.mdx" && chunk.content.includes("Runtime event contract"))).toBe(true);
  });

  it("keeps public package contracts and error properties searchable in both locales", () => {
    const documents = readCanonicalMdxDocuments();
    const publicContracts = ["HandoffStrategy", "CreateFirstTxRootOptions", "PrepaintPolicy", "convertDOMException", "FirstTxPluginOptions", "Model<T>", "StoredModel<T>", "ModelHistory", "SyncOptions<T>", "SyncedModelResult<T>", "Fetcher<T>", "SuspenseFetcher<T>", "SuspenseSyncOptions<T>", "StorageErrorCode", "TxStatus", "StepOptions", "RetryConfig", "UseTxConfig", "UseTxResult", "timeoutMs", "elapsedMs", "stepId", "attempts", "zodError", "currentState", "attemptedAction", "transactionId"];

    for (const locale of ["ko", "en"]) {
      const reference = documents.find((document) => document.docId === "reference" && document.locale === locale);
      expect(reference).toBeDefined();

      for (const contract of publicContracts) {
        expect(reference?.content, `${locale} Reference is missing ${contract}`).toContain(contract);
      }
    }
  });
});
