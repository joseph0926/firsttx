export const DOCS_ANCHOR_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const LANDING_SETUP_ANCHOR = {
  id: "choose-setup",
  aliases: ["layers", "quickstart"],
} as const;

export const LOCALE_ONLY_DOC_ANCHORS: Record<string, { en: readonly string[]; ko: readonly string[] }> = {
  prepaint: {
    en: ["snapshot-storage-spec", "boot-flow", "style-collection", "synergy-with-local-first-tx"],
    ko: ["overlay-rendering"],
  },
};
