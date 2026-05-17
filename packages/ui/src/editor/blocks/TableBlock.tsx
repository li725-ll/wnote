import type { BlockNode } from "@wnote/md-parser";
import { inlinesToHtml } from "./ParagraphBlock";

type TableNode = Extract<BlockNode, { type: "table" }>;

interface TableBlockProps {
  node: TableNode;
}

export function TableBlock({ node }: TableBlockProps) {
  const alignStyle = (i: number): React.CSSProperties | undefined => {
    const a = node.alignments[i];
    if (a === "left") return { textAlign: "left" };
    if (a === "center") return { textAlign: "center" };
    if (a === "right") return { textAlign: "right" };
    return undefined;
  };

  return (
    <table style={{ borderCollapse: "collapse", width: "100%", margin: "0.5em 0" }}>
      <thead>
        <tr>
          {node.headers.map((cell, i) => (
            <th
              key={i}
              style={{
                ...alignStyle(i),
                border: "1px solid var(--color-table-border)",
                padding: "6px 12px",
                background: "var(--color-table-header-bg)",
              }}
              dangerouslySetInnerHTML={{ __html: inlinesToHtml(cell.children) }}
            />
          ))}
        </tr>
      </thead>
      <tbody>
        {node.rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td
                key={ci}
                style={{
                  ...alignStyle(ci),
                  border: "1px solid var(--color-table-border)",
                  padding: "6px 12px",
                }}
                dangerouslySetInnerHTML={{ __html: inlinesToHtml(cell.children) }}
              />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
