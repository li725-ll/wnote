import type { BlockNode } from "@wnote/md-parser";

type ImageNode = Extract<BlockNode, { type: "paragraph" }> & { __imageHack?: never };

interface ImageBlockProps {
  node: ImageNode;
}

export function ImageBlock({ node }: ImageBlockProps) {
  // Image nodes come from the parser as inline nodes within paragraphs.
  // This component handles standalone image rendering when detected.
  const inline = node.children?.[0];
  if (inline && "src" in inline) {
    const img = inline as { src: string; alt: string; title?: string | null };
    return (
      <figure style={{ margin: "1em 0", textAlign: "center" }}>
        <img
          src={img.src}
          alt={img.alt}
          title={img.title ?? undefined}
          style={{ maxWidth: "100%", borderRadius: "4px" }}
        />
        {img.alt && (
          <figcaption
            style={{ fontSize: "0.85em", color: "var(--color-placeholder)", marginTop: "0.5em" }}
          >
            {img.alt}
          </figcaption>
        )}
      </figure>
    );
  }
  return null;
}
