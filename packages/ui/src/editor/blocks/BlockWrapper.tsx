import type { EditorBlock } from "../types";
import { useEditor } from "../context";
import { BlockTextarea } from "./BlockTextarea";
import { ParagraphBlock } from "./ParagraphBlock";
import { HeadingBlock } from "./HeadingBlock";
import { CodeBlock } from "./CodeBlock";
import { BlockquoteBlock } from "./BlockquoteBlock";
import { ListBlock } from "./ListBlock";
import { TableBlock } from "./TableBlock";
import { ThematicBreakBlock } from "./ThematicBreakBlock";
import { ParagraphEditor } from "./ParagraphEditor";
import { HeadingEditor } from "./HeadingEditor";
import { CodeBlockEditor } from "./CodeBlockEditor";
import { MathBlockEditor } from "./MathBlockEditor";
import { BlockquoteEditor } from "./BlockquoteEditor";
import { ListEditor } from "./ListEditor";
import styles from "./BlockWrapper.module.css";

interface BlockWrapperProps {
  block: EditorBlock;
  isFocused: boolean;
}

export function BlockWrapper({ block, isFocused }: BlockWrapperProps) {
  const { state, dispatch } = useEditor();

  const handleClick = () => {
    if (!isFocused) {
      dispatch({ type: "FOCUS", id: block.id, direction: "click" });
    }
  };

  if (isFocused) {
    if (state.mode === "source") {
      return (
        <div className={styles.wrapper} data-focused>
          <BlockTextarea block={block} />
        </div>
      );
    }
    return (
      <div className={styles.wrapper} data-focused>
        {renderWysiwygEditor(block)}
      </div>
    );
  }

  return (
    <div className={styles.wrapper} onClick={handleClick}>
      {renderBlock(block)}
    </div>
  );
}

function renderWysiwygEditor(block: EditorBlock) {
  const { node } = block;
  switch (node.type) {
    case "paragraph":
      return <ParagraphEditor block={block} />;
    case "heading":
      return <HeadingEditor block={block} />;
    case "codeBlock":
      if (node.lang === "math" || node.lang === "latex") {
        return <MathBlockEditor block={block} />;
      }
      return <CodeBlockEditor block={block} />;
    case "blockquote":
      return <BlockquoteEditor block={block} />;
    case "bulletList":
    case "orderedList":
      return <ListEditor block={block} />;
    default:
      return <BlockTextarea block={block} />;
  }
}

function renderBlock(block: EditorBlock) {
  const { node } = block;
  switch (node.type) {
    case "heading":
      return <HeadingBlock node={node} />;
    case "paragraph":
      return <ParagraphBlock node={node} />;
    case "codeBlock":
      return <CodeBlock node={node} />;
    case "blockquote":
      return <BlockquoteBlock node={node} />;
    case "bulletList":
    case "orderedList":
      return <ListBlock node={node} />;
    case "table":
      return <TableBlock node={node} />;
    case "thematicBreak":
      return <ThematicBreakBlock />;
    case "htmlBlock":
      return <div dangerouslySetInnerHTML={{ __html: node.html }} />;
    default:
      return <p>{(node as { raw: string }).raw}</p>;
  }
}
