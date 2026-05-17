import type { BlockNode, ListItem } from "@wnote/md-parser";
import { inlinesToHtml } from "./ParagraphBlock";
import { processKatexInHtml } from "../enhancers/katex";

type ListNode =
  | Extract<BlockNode, { type: "bulletList" }>
  | Extract<BlockNode, { type: "orderedList" }>;

interface ListBlockProps {
  node: ListNode;
}

export function ListBlock({ node }: ListBlockProps) {
  if (node.type === "orderedList") {
    return (
      <ol start={node.start !== 1 ? node.start : undefined}>
        {node.items.map((item, i) => (
          <ListItemView key={i} item={item} />
        ))}
      </ol>
    );
  }

  const hasTask = node.items.some((item) => item.checked !== null);
  return (
    <ul style={hasTask ? { listStyle: "none", paddingLeft: "0.5em" } : undefined}>
      {node.items.map((item, i) => (
        <ListItemView key={i} item={item} />
      ))}
    </ul>
  );
}

function ListItemView({ item }: { item: ListItem }) {
  if (item.checked !== null) {
    return (
      <li style={{ listStyle: "none" }}>
        <label>
          <input type="checkbox" checked={item.checked} disabled readOnly />{" "}
          <span dangerouslySetInnerHTML={{ __html: itemContentHtml(item) }} />
        </label>
      </li>
    );
  }
  return <li dangerouslySetInnerHTML={{ __html: itemContentHtml(item) }} />;
}

function itemContentHtml(item: ListItem): string {
  const parts: string[] = [];
  for (const child of item.children) {
    if (child.type === "paragraph") {
      parts.push(processKatexInHtml(inlinesToHtml(child.children)));
    } else {
      parts.push(child.raw);
    }
  }
  return parts.join("");
}
