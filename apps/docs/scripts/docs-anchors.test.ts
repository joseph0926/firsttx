import { describe, expect, it } from "vitest";
import { normalizeCanonicalMdx } from "./canonical-mdx";
import { localeAnchorDifferences, readDocsAnchorDocuments } from "./docs-anchors";

describe("docs anchor contract", () => {
  it("gives every canonical H2 and H3 one valid route-local anchor", () => {
    const documents = readDocsAnchorDocuments();

    expect(documents).toHaveLength(18);
    expect(documents.flatMap((document) => document.headings)).toHaveLength(159);
    for (const document of documents) expect(document.issues, document.source).toEqual([]);
  });

  it("keeps locale pairs aligned except for explicit content differences", () => {
    for (const difference of localeAnchorDifferences(readDocsAnchorDocuments())) {
      expect(difference.en, `${difference.docId}.en`).toEqual([...difference.expected.en].sort());
      expect(difference.ko, `${difference.docId}.ko`).toEqual([...difference.expected.ko].sort());
    }
  });

  it("keeps DocsAnchor markup out of normalized RAG content", () => {
    const source = `# Fixture

<DocsAnchor id="stable-section" />

## Stable section

Body copy.
`;

    const result = normalizeCanonicalMdx(source);

    expect(result).not.toContain("DocsAnchor");
    expect(result).toContain("## Stable section");
    expect(result).toContain("Body copy.");
  });
});
