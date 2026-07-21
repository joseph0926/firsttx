type DocsAnchorProps = {
  id: string;
  aliases?: readonly string[];
};

export function DocsAnchor({ id, aliases = [] }: DocsAnchorProps) {
  return (
    <>
      {aliases.map((alias) => (
        <span key={alias} id={alias} className="docs-anchor" data-doc-anchor-alias={id} aria-hidden="true" />
      ))}
      <span id={id} className="docs-anchor" data-doc-anchor={id} aria-hidden="true" />
    </>
  );
}
