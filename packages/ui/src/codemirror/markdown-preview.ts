import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { type Range, StateField } from "@codemirror/state";
import { slugify } from "./headings";

class TableWidget extends WidgetType {
  constructor(private content: string) {
    super();
  }
  toDOM() {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-md-table-wrapper";
    const table = document.createElement("table");
    table.className = "cm-md-table";

    const lines = this.content.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return wrapper;

    const parseRow = (line: string): string[] =>
      line
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim());

    const headers = parseRow(lines[0]);
    const aligns = parseRow(lines[1]).map((c) => {
      if (c.startsWith(":") && c.endsWith(":")) return "center";
      if (c.endsWith(":")) return "right";
      return "left";
    });

    const thead = table.createTHead();
    const hr = thead.insertRow();
    for (let i = 0; i < headers.length; i++) {
      const th = document.createElement("th");
      th.textContent = headers[i];
      th.style.textAlign = aligns[i] ?? "left";
      hr.appendChild(th);
    }

    const tbody = table.createTBody();
    for (let r = 2; r < lines.length; r++) {
      const cells = parseRow(lines[r]);
      const tr = tbody.insertRow();
      for (let i = 0; i < headers.length; i++) {
        const td = tr.insertCell();
        td.textContent = cells[i] ?? "";
        td.style.textAlign = aligns[i] ?? "left";
      }
    }

    wrapper.appendChild(table);
    return wrapper;
  }
  eq(other: TableWidget) {
    return this.content === other.content;
  }
}

class HrWidget extends WidgetType {
  toDOM() {
    const hr = document.createElement("div");
    hr.className = "cm-md-hr";
    return hr;
  }
}

class CodeBlockLangWidget extends WidgetType {
  constructor(private lang: string) {
    super();
  }
  toDOM() {
    const el = document.createElement("span");
    el.className = "cm-md-codeblock-lang";
    if (this.lang) el.textContent = this.lang;
    return el;
  }
  eq(other: CodeBlockLangWidget) {
    return this.lang === other.lang;
  }
}

class CheckboxWidget extends WidgetType {
  constructor(private checked: boolean) {
    super();
  }
  toDOM() {
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = this.checked;
    cb.className = "cm-md-checkbox";
    cb.setAttribute("aria-label", this.checked ? "checked" : "unchecked");
    return cb;
  }
  eq(other: CheckboxWidget) {
    return this.checked === other.checked;
  }
}

class BulletWidget extends WidgetType {
  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-md-list-bullet";
    span.textContent = "•";
    return span;
  }
  eq() {
    return true;
  }
}

class ImageWidget extends WidgetType {
  constructor(
    private src: string,
    private alt: string,
  ) {
    super();
  }

  toDOM() {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-md-image";
    const img = document.createElement("img");
    img.src = this.resolveUrl(this.src);
    img.alt = this.alt;
    img.loading = "lazy";
    img.onerror = () => {
      wrapper.classList.add("cm-md-image-error");
      wrapper.textContent = `[image: ${this.alt || this.src}]`;
    };
    wrapper.appendChild(img);
    return wrapper;
  }

  eq(other: ImageWidget) {
    return this.src === other.src && this.alt === other.alt;
  }

  private resolveUrl(src: string): string {
    if (/^https?:\/\//.test(src)) return src;
    return `wnote-asset://${src}`;
  }
}

function isCursorInRange(view: EditorView, from: number, to: number): boolean {
  for (const range of view.state.selection.ranges) {
    if (range.from <= to && range.to >= from) return true;
  }
  return false;
}

function getActiveLines(view: EditorView): Set<number> {
  const lines = new Set<number>();
  if (!view.hasFocus) return lines;
  for (const range of view.state.selection.ranges) {
    const startLine = view.state.doc.lineAt(range.from).number;
    const endLine = view.state.doc.lineAt(range.to).number;
    for (let i = startLine; i <= endLine; i++) {
      lines.add(i);
    }
  }
  return lines;
}

const syntaxMark = Decoration.mark({ class: "cm-md-syntax" });

function buildDecorations(view: EditorView): DecorationSet {
  const decos: Range<Decoration>[] = [];
  const activeLines = getActiveLines(view);
  const doc = view.state.doc;
  const slugCount = new Map<string, number>();

  syntaxTree(view.state).iterate({
    enter(node) {
      // --- Headings (composing vs committed) ---
      if (/^ATXHeading(\d)$/.test(node.name)) {
        const level = Number(node.name.slice(-1));
        const lineNum = doc.lineAt(node.from).number;
        const isActive = activeLines.has(lineNum);
        const text = doc.sliceString(node.from, node.to);
        const hashEnd = text.indexOf(" ") + 1;
        const headingText = text.replace(/^#{1,6}\s+/, "").trim();

        if (headingText) {
          const base = slugify(headingText);
          const count = slugCount.get(base) || 0;
          slugCount.set(base, count + 1);
          const id = count === 0 ? base : `${base}-${count}`;
          decos.push(Decoration.line({ attributes: { id } }).range(node.from));
        }

        const cls = `cm-md-heading${level}`;
        decos.push(Decoration.mark({ class: cls }).range(node.from, node.to));
        if (isActive) {
          if (hashEnd > 0) {
            decos.push(syntaxMark.range(node.from, node.from + hashEnd));
          }
        } else {
          if (hashEnd > 0) {
            decos.push(Decoration.replace({}).range(node.from, node.from + hashEnd));
          }
        }
      }

      // --- Bold (per-node) ---
      if (node.name === "StrongEmphasis") {
        const active = isCursorInRange(view, node.from, node.to);
        decos.push(Decoration.mark({ class: "cm-md-bold" }).range(node.from, node.to));
        if (active) {
          decos.push(syntaxMark.range(node.from, node.from + 2));
          decos.push(syntaxMark.range(node.to - 2, node.to));
        } else {
          decos.push(Decoration.replace({}).range(node.from, node.from + 2));
          decos.push(Decoration.replace({}).range(node.to - 2, node.to));
        }
        return false;
      }

      // --- Italic (per-node) ---
      if (node.name === "Emphasis") {
        const active = isCursorInRange(view, node.from, node.to);
        decos.push(Decoration.mark({ class: "cm-md-italic" }).range(node.from, node.to));
        if (active) {
          decos.push(syntaxMark.range(node.from, node.from + 1));
          decos.push(syntaxMark.range(node.to - 1, node.to));
        } else {
          decos.push(Decoration.replace({}).range(node.from, node.from + 1));
          decos.push(Decoration.replace({}).range(node.to - 1, node.to));
        }
        return false;
      }

      // --- Inline Code (per-node) ---
      if (node.name === "InlineCode") {
        const active = isCursorInRange(view, node.from, node.to);
        decos.push(Decoration.mark({ class: "cm-md-code" }).range(node.from, node.to));
        if (active) {
          decos.push(syntaxMark.range(node.from, node.from + 1));
          decos.push(syntaxMark.range(node.to - 1, node.to));
        } else {
          decos.push(Decoration.replace({}).range(node.from, node.from + 1));
          decos.push(Decoration.replace({}).range(node.to - 1, node.to));
        }
        return false;
      }

      // --- Link (per-node) ---
      if (node.name === "Link") {
        const active = isCursorInRange(view, node.from, node.to);
        if (active) {
          decos.push(Decoration.mark({ class: "cm-md-link" }).range(node.from, node.to));
          // Show syntax marks for brackets
          let markStart = -1;
          let markEnd = -1;
          let urlStart = -1;
          const cursor = node.node.cursor();
          if (cursor.firstChild()) {
            do {
              if (cursor.name === "LinkMark") {
                if (markStart === -1) markStart = cursor.from;
                else markEnd = cursor.to;
              }
              if (cursor.name === "URL") urlStart = cursor.from;
            } while (cursor.nextSibling());
          }
          if (markStart >= 0) decos.push(syntaxMark.range(node.from, node.from + 1));
          if (markEnd >= 0 && urlStart >= 0) {
            decos.push(syntaxMark.range(markEnd - 1, node.to));
          }
        } else {
          let textFrom = -1;
          let textTo = -1;
          const cursor = node.node.cursor();
          if (cursor.firstChild()) {
            do {
              if (cursor.name === "LinkMark" && textFrom === -1) {
                textFrom = cursor.to;
              } else if (cursor.name === "LinkMark" && textFrom !== -1 && textTo === -1) {
                textTo = cursor.from;
              }
            } while (cursor.nextSibling());
          }
          if (textFrom >= 0 && textTo >= 0) {
            decos.push(Decoration.replace({}).range(node.from, textFrom));
            decos.push(Decoration.mark({ class: "cm-md-link" }).range(textFrom, textTo));
            decos.push(Decoration.replace({}).range(textTo, node.to));
          }
        }
        return false;
      }

      // --- Image (per-node) ---
      if (node.name === "Image") {
        const lineNum = doc.lineAt(node.from).number;
        const isActive = activeLines.has(lineNum);

        if (isActive) {
          decos.push(syntaxMark.range(node.from, node.to));
        } else {
          const endLineNum = doc.lineAt(node.to).number;
          if (endLineNum !== lineNum) return false;
          const text = doc.sliceString(node.from, node.to);
          const altMatch = text.match(/!\[([^\]]*)\]/);
          const urlMatch = text.match(/\]\((.+)\)\s*$/);
          const alt = altMatch?.[1] ?? "";
          const url = urlMatch?.[1] ?? "";
          if (url) {
            const line = doc.lineAt(node.from);
            decos.push(Decoration.line({ class: "cm-md-image-line" }).range(line.from));
            decos.push(
              Decoration.replace({
                widget: new ImageWidget(url, alt),
              }).range(node.from, node.to),
            );
          }
        }
        return false;
      }

      // --- Fenced Code Block (composing vs committed) ---
      if (node.name === "FencedCode") {
        const startLine = doc.lineAt(node.from);
        const endLine = doc.lineAt(node.to);
        const startActive = activeLines.has(startLine.number);
        const endActive = activeLines.has(endLine.number);
        const isSingleLine = startLine.number === endLine.number;

        if (startActive && isSingleLine) {
          // Composing: backticks turn gray, no code block styling
          if (startLine.from < startLine.to) {
            decos.push(syntaxMark.range(startLine.from, startLine.to));
          }
          return false;
        }

        // Committed: full code block rendering
        const isActualFence = /^(`{3,}|~{3,})\s*$/.test(endLine.text);
        const lastCodeLine =
          !endActive && endLine.number !== startLine.number && isActualFence
            ? endLine.number - 1
            : endLine.number;

        for (let i = startLine.number; i <= endLine.number; i++) {
          const line = doc.line(i);
          if (
            i === endLine.number &&
            endLine.number !== startLine.number &&
            !endActive &&
            isActualFence
          ) {
            decos.push(Decoration.line({ class: "cm-md-codeblock-fence-end" }).range(line.from));
          } else {
            let cls = "cm-md-codeblock-line";
            if (i === startLine.number) cls += " cm-md-codeblock-first";
            if (i === lastCodeLine) cls += " cm-md-codeblock-last";
            decos.push(Decoration.line({ class: cls }).range(line.from));
          }
        }

        if (startActive) {
          decos.push(syntaxMark.range(startLine.from, startLine.to));
        } else {
          const lang = startLine.text.replace(/^[`~]{3,}\s*/, "").trim();
          decos.push(
            Decoration.replace({ widget: new CodeBlockLangWidget(lang) }).range(
              startLine.from,
              startLine.to,
            ),
          );
        }

        if (endLine.number !== startLine.number && endLine.from < endLine.to && isActualFence) {
          if (endActive) {
            decos.push(syntaxMark.range(endLine.from, endLine.to));
          } else {
            decos.push(Decoration.replace({}).range(endLine.from, endLine.to));
          }
        }

        return false;
      }

      // --- Blockquote (per-line, hide >) ---
      if (node.name === "Blockquote") {
        const startLine = doc.lineAt(node.from).number;
        const endLine = doc.lineAt(node.to).number;

        for (let i = startLine; i <= endLine; i++) {
          const line = doc.line(i);
          decos.push(Decoration.line({ class: "cm-md-blockquote-line" }).range(line.from));
          const lineText = line.text;
          const match = /^(\s*>\s?)/.exec(lineText);
          if (match) {
            if (activeLines.has(i)) {
              decos.push(syntaxMark.range(line.from, line.from + match[1].length));
            } else {
              decos.push(Decoration.replace({}).range(line.from, line.from + match[1].length));
            }
          }
        }
        return false;
      }

      // --- Table (line styling when editing) ---
      if (node.name === "Table") {
        const active = isCursorInRange(view, node.from, node.to);
        if (active) {
          const startLine = doc.lineAt(node.from).number;
          const endLine = doc.lineAt(node.to).number;
          for (let i = startLine; i <= endLine; i++) {
            decos.push(Decoration.line({ class: "cm-md-table-line" }).range(doc.line(i).from));
          }
        }
        return false;
      }

      // --- Horizontal Rule (per-line) ---
      if (node.name === "HorizontalRule") {
        const lineNum = doc.lineAt(node.from).number;
        if (activeLines.has(lineNum)) {
          decos.push(syntaxMark.range(node.from, node.to));
        } else {
          decos.push(Decoration.replace({ widget: new HrWidget() }).range(node.from, node.to));
        }
        return false;
      }

      // --- Task list items ---
      if (node.name === "TaskMarker") {
        const lineNum = doc.lineAt(node.from).number;
        const text = doc.sliceString(node.from, node.to);
        const checked = text.includes("x") || text.includes("X");
        if (!activeLines.has(lineNum)) {
          decos.push(
            Decoration.replace({ widget: new CheckboxWidget(checked) }).range(node.from, node.to),
          );
        } else {
          decos.push(syntaxMark.range(node.from, node.to));
        }
        return false;
      }

      // --- List markers (bullet and ordered) ---
      if (node.name === "ListMark") {
        const lineNum = doc.lineAt(node.from).number;
        const text = doc.sliceString(node.from, node.to).trim();
        if (text === "-" || text === "*" || text === "+") {
          if (activeLines.has(lineNum)) {
            decos.push(syntaxMark.range(node.from, node.to));
          } else {
            decos.push(
              Decoration.replace({ widget: new BulletWidget() }).range(node.from, node.to),
            );
          }
        } else {
          if (activeLines.has(lineNum)) {
            decos.push(syntaxMark.range(node.from, node.to));
          } else {
            decos.push(Decoration.mark({ class: "cm-md-list-number" }).range(node.from, node.to));
          }
        }
        return false;
      }

      // --- List item indentation ---
      if (node.name === "ListItem") {
        const line = doc.lineAt(node.from);
        const lineText = doc.sliceString(line.from, line.to);
        const indent = lineText.match(/^(\s*)/)?.[1].length ?? 0;
        const depth = Math.min(1 + Math.floor(indent / 2), 4);
        decos.push(Decoration.line({ class: `cm-md-list-indent-${depth}` }).range(line.from));
      }
    },
  });

  return Decoration.set(decos, true);
}

export const markdownPreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.focusChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

function buildTableDecorations(state: import("@codemirror/state").EditorState): DecorationSet {
  const decos: Range<Decoration>[] = [];
  const doc = state.doc;

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name === "Table") {
        let cursorInTable = false;
        for (const range of state.selection.ranges) {
          if (range.from <= node.to && range.to >= node.from) {
            cursorInTable = true;
            break;
          }
        }
        if (!cursorInTable) {
          const content = doc.sliceString(node.from, node.to);
          decos.push(
            Decoration.replace({ widget: new TableWidget(content) }).range(node.from, node.to),
          );
        }
        return false;
      }
    },
  });

  return Decoration.set(decos, true);
}

export const tablePreview = StateField.define<DecorationSet>({
  create(state) {
    return buildTableDecorations(state);
  },
  update(value, tr) {
    if (tr.docChanged || tr.selection) {
      return buildTableDecorations(tr.state);
    }
    return value;
  },
  provide: (f) => EditorView.decorations.from(f),
});
