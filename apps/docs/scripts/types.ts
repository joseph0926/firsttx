export type Locale = "ko" | "en";

export interface Chunk {
  id: string;
  title: string;
  section: string;
  content: string;
  source: string;
  locale: Locale;
}
