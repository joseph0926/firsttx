import { readCanonicalMdxDocuments } from "./canonical-mdx";
import { createIndexPlan } from "./index-plan";
import type { IndexLocale } from "../lib/ai/index-contract";

const LOCALES: IndexLocale[] = ["ko", "en"];

function main(): void {
  const documents = readCanonicalMdxDocuments();
  const plans = LOCALES.map((locale) => createIndexPlan(documents, locale));

  process.stdout.write(`${JSON.stringify(plans, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
