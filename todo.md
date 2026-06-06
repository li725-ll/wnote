# WNote Remaining TODO

Last updated: 2026-06-06

## Current Baseline

- Markdown editor has moved from the old CodeMirror trap toward the TipTap-based architecture.
- Workspace tree can open directories, read supported documents, and open files.
- Workspace can create files and folders at the workspace root.
- Workspace can refresh, rename files/directories, and delete files/empty directories.
- Open tabs are synchronized when workspace files are renamed or deleted.
- Export HTML/PDF, resource panel, asset indexing, table styling feedback, performance budgets, and e2e coverage are in place.

## P0 - Workspace File Operations

- [ ] Create files/folders inside a selected directory, not only the workspace root.
- [ ] Add file/folder move support within the workspace.
- [ ] Add drag-and-drop move in the workspace tree.
- [ ] Add safe recursive directory delete flow with explicit confirmation and clear copy.
- [ ] Add error feedback for failed workspace operations, including duplicate names, non-empty directory deletion, unsupported extension, and permission errors.
- [ ] Keep workspace tree selection/focus stable after rename, move, delete, refresh.

Acceptance:

- Storage-main has unit coverage for nested create, move, recursive delete guardrails, and path escape rejection.
- Renderer has e2e coverage for nested create -> move -> rename -> delete.
- Open document tabs stay correct after every file path mutation.

## P0 - Editor Core Stability

- [ ] Audit all custom TipTap extensions for duplicate extension names and schema conflicts.
- [ ] Add an editor-level error boundary for node views so one broken block does not crash the whole editor.
- [ ] Harden image node view defaults so missing attrs/options never throw.
- [ ] Add regression coverage for documents containing images, tables, code blocks, math, mermaid, task lists, and mixed nested blocks.
- [ ] Verify old CodeMirror markdown preview/decorations code is fully removed or isolated from runtime paths.

Acceptance:

- No runtime console errors when opening regression fixtures.
- Startup e2e includes representative markdown fixtures.
- TipTap warning for duplicate extension names is gone.

## P1 - Typora-Like Editing Behavior

- [ ] Inline markdown shortcut rendering: heading, list, quote, code block, horizontal rule.
- [ ] Table editing parity: insert/delete row/column, align column, resize behavior, active cell toolbar.
- [ ] Image editing parity: resize, align, caption, replace, reveal file, copy path.
- [ ] Link editing parity: edit target, open target, remove link.
- [ ] Code block parity: language selector, copy code, syntax theme consistency.
- [ ] Task list parity: checkbox toggling, nested task indentation.
- [ ] Math parity: inline/block editing affordance and render fallback.
- [ ] Mermaid parity: edit source, render preview, error state.

Acceptance:

- Common Typora editing operations can be done without opening a markdown source panel.
- Keyboard behavior remains predictable and does not break normal text input.
- Each block family has at least one targeted regression test.

## P1 - Document Model And Markdown Fidelity

- [ ] Formalize markdown <-> editor document conversion contracts.
- [ ] Add golden tests for markdown round trip fidelity.
- [ ] Preserve frontmatter, HTML blocks, comments, escaped characters, and unknown markdown where possible.
- [ ] Define unsupported markdown fallback behavior.
- [ ] Track document dirty state from normalized content, not only editor change events.

Acceptance:

- Golden fixtures round trip without unexpected lossy changes.
- Save/load does not rewrite unrelated parts of a document.
- Unsupported constructs degrade predictably.

## P1 - File Storage And Recovery

- [ ] Add backup/recovery strategy for failed saves.
- [ ] Add conflict detection when a file changes externally while open.
- [ ] Add reload-from-disk and keep-editor-version choices.
- [ ] Add autosave status feedback.
- [ ] Add recent workspace list.

Acceptance:

- External file changes are detected before destructive overwrite.
- Save failures produce actionable feedback and do not lose editor content.
- Recent files/workspaces survive app restart.

## P2 - Workspace UX Polish

- [ ] Replace text-only workspace node actions with icon buttons and tooltips.
- [ ] Add context menu for workspace nodes.
- [ ] Add keyboard shortcuts for rename/delete/new file/new folder.
- [ ] Add empty-directory rendering so directories without markdown files are still visible when useful.
- [ ] Add file filtering/search in the workspace panel.
- [ ] Add collapse/expand persistence.

Acceptance:

- Workspace actions are discoverable without crowding the tree.
- Keyboard and mouse flows both work.
- Empty states do not hide user-created folders unexpectedly.

## P2 - Performance And Packaging

- [ ] Continue reducing initial renderer entry size after workspace/editor features settle.
- [ ] Lazy-load heavy block tools where practical.
- [ ] Audit Electron CSP and remove development-only unsafe settings for packaged builds.
- [ ] Add performance fixture for large markdown files.
- [ ] Add package smoke test.

Acceptance:

- `pnpm build:budget` remains green.
- Large documents remain interactive under the chosen benchmark.
- Packaged app does not show Electron security warnings caused by app config.

## Suggested Next Batch

Implement nested workspace operations:

1. Add selected-directory target support to create file/folder.
2. Add move operation in storage-main and IPC.
3. Add simple UI action "move to..." before drag-and-drop.
4. Add tests and e2e for nested create and move.

Suggested commit:

```text
feat: support nested workspace operations
```
