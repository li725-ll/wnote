# Editor Regression Checklist

Run this checklist after editor, markdown, asset, export, or Electron startup changes.

## Fixture

Use the regression sample for manual passes:

```sh
pnpm dev -- docs/qa/fixtures/editor-regression-sample.md
```

This command is verified to forward the fixture path to Electron and open the document on startup. If it fails in a shell-specific setup, start with `pnpm dev`, then open `docs/qa/fixtures/editor-regression-sample.md` from the app menu.

The sample covers headings, inline marks, links, lists, task lists, blockquote, horizontal rule, tables, code highlighting, unknown code fallback, math, invalid math fallback, Mermaid, invalid Mermaid fallback, remote images, missing local image fallback, and block operations.

## Startup

- Start the app with `pnpm dev`.
- Start the app with the regression sample path when doing a manual editor pass.
- Confirm the main window opens without renderer or main-process crashes.
- Confirm DevTools-only browser noise does not hide app-level errors in the terminal.
- Close the window and confirm the dev process exits cleanly.

## File Flow

- Create a new document.
- Type a title, paragraph, list, quote, code block, and table.
- Save as a Markdown file.
- Close and reopen the saved file.
- Confirm content, headings, and dirty/saved state are preserved.
- Switch between two open tabs and confirm content does not bleed between tabs.

## Markdown Editing

- Headings: create H1-H4 from toolbar, slash menu, and Markdown shortcuts.
- Lists: unordered, ordered, task list checked and unchecked.
- Inline marks: bold, italic, strikethrough, inline code, link.
- Blocks: blockquote, horizontal rule, fenced code, Mermaid, block math.
- Tables: insert table, add/delete rows and columns, toggle header row, merge and split cells.

## Rich Nodes

- Code block:
  - Set language to `ts` and confirm highlight renders.
  - Set an unsupported language and confirm plain-code fallback remains editable.
- Math:
  - Insert inline and block math.
  - Enter an invalid formula and confirm the raw formula remains visible.
- Mermaid:
  - Insert a valid diagram and confirm preview renders.
  - Enter invalid Mermaid source and confirm source fallback remains visible.
- Image:
  - Insert an image.
  - Resize it.
  - Change alignment.
  - Add and edit caption, alt, and title.

## Assets

- Confirm local Markdown images appear in the resource panel.
- Confirm figure images with caption/width/alignment appear in the resource panel.
- Delete an image reference from the resource panel.
- Relocate an image reference from the resource panel.
- Clean unused assets and confirm referenced local files are not removed.
- Confirm remote and data images are never treated as local missing files.

## Export

- Export HTML with Mermaid enabled.
- Export HTML with Mermaid disabled.
- Export HTML with local image inlining enabled.
- Export PDF with:
  - A4 portrait default margin.
  - Letter landscape wide margin.
  - Compact margin with print background disabled.
- Open HTML export preview.
- Open PDF export preview.
- Confirm export failures in KaTeX, Shiki, or Mermaid fall back without aborting the export.

## Focus And Menus

- Confirm slash menu opens, filters, inserts the selected block, and closes on escape.
- Confirm floating toolbar does not cover selected text.
- Confirm block handle tracks the active block and does not cover editable text.
- Confirm block handle can move, duplicate, insert around, and delete blocks in the fixture.
- Confirm table toolbar appears only inside tables and does not block cell editing.
- Confirm resource panel actions return focus to the editor.

## Required Commands

Run these before committing:

```sh
pnpm test
pnpm -r run typecheck
pnpm build
git diff --check
```

## 2026-06-05 Automated Pass

- `pnpm dev` started Electron successfully.
- Confirmed main process app ready, window creation, and database open logs.
- Confirmed DevTools Autofill protocol errors are browser noise, not app-level failures.
- Closed the dev process cleanly with `Ctrl+C`.
- `pnpm lint` completed with warnings only; unused import noise was reduced in this pass.
- `pnpm test` passed.
- `pnpm -r run typecheck` passed.
- `pnpm build` passed with existing large chunk warnings.
- `git diff --check` passed.

Manual window interaction still needs a human pass for file save/reopen, rich node editing, asset panel actions, and PDF/HTML preview inspection.
