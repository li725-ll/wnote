# WNote Remaining TODO

Last updated: 2026-06-10

## Current Baseline

- Markdown editor has moved from the old CodeMirror trap toward the TipTap-based architecture.
- Workspace tree can open directories, read supported documents, and open files.
- Workspace can create files and folders at the workspace root and inside selected directories.
- Workspace can refresh, rename, move, drag-and-drop move, and delete files/directories.
- Workspace supports safe recursive directory deletion with explicit confirmation.
- Open tabs are synchronized when workspace files or directories are renamed, moved, or deleted.
- Editor node views are isolated by an error boundary, and TipTap extension names are covered by duplicate-name regression tests.
- Startup regression fixtures cover representative editor blocks without runtime errors.
- Typora-like editing controls cover shortcuts, tables, images, links, code, tasks, math, and Mermaid.
- Save flows include backup, disk-conflict detection, reload/keep choices, autosave feedback, and recent workspaces.
- Workspace UI includes icon actions, context menus, shortcuts, search, empty directories, and collapse persistence.
- Production build budgets, CSP checks, large markdown fixtures, and Electron smoke coverage are in place.
- Export HTML/PDF, resource panel, asset indexing, table styling feedback, performance budgets, and e2e coverage are in place.

## P0 - Workspace File Operations

- [x] Create files/folders inside a selected directory, not only the workspace root.
- [x] Add file/folder move support within the workspace.
- [x] Add drag-and-drop move in the workspace tree.
- [x] Add safe recursive directory delete flow with explicit confirmation and clear copy.
- [x] Add error feedback for failed workspace operations, including duplicate names, non-empty directory deletion, unsupported extension, and permission errors.
- [x] Keep workspace tree selection/focus stable after rename, move, delete, refresh.

Acceptance:

- [x] Storage-main has unit coverage for nested create, move, recursive delete guardrails, and path escape rejection.
- [x] Renderer has e2e coverage for nested create -> move -> rename -> delete.
- [x] Open document tabs stay correct after every file path mutation.

## P0 - Editor Core Stability

- [x] Audit all custom TipTap extensions for duplicate extension names and schema conflicts.
- [x] Add an editor-level error boundary for node views so one broken block does not crash the whole editor.
- [x] Harden image node view defaults so missing attrs/options never throw.
- [x] Add regression coverage for documents containing images, tables, code blocks, math, mermaid, task lists, and mixed nested blocks.
- [x] Verify old CodeMirror markdown preview/decorations code is fully removed or isolated from runtime paths.

Acceptance:

- [x] No runtime console errors when opening regression fixtures.
- [x] Startup e2e includes representative markdown fixtures.
- [x] TipTap warning for duplicate extension names is gone.

## P1 - Typora-Like Editing Behavior

- [x] Inline markdown shortcut rendering: heading, list, quote, code block, horizontal rule.
- [x] Table editing parity: insert/delete row/column, align column, resize behavior, active cell toolbar.
- [x] Image editing parity: resize, align, caption, replace, reveal file, copy path.
- [x] Link editing parity: edit target, open target, remove link.
- [x] Code block parity: language selector, copy code, syntax theme consistency.
- [x] Task list parity: checkbox toggling, nested task indentation.
- [x] Math parity: inline/block editing affordance and render fallback.
- [x] Mermaid parity: edit source, render preview, error state.

Acceptance:

- Common Typora editing operations can be done without opening a markdown source panel.
- Keyboard behavior remains predictable and does not break normal text input.
- Each block family has at least one targeted regression test.

## P1 - Document Model And Markdown Fidelity

- [x] Formalize markdown <-> editor document conversion contracts.
- [x] Add golden tests for markdown round trip fidelity.
- [x] Preserve frontmatter, HTML blocks, comments, escaped characters, and unknown markdown where possible.
- [x] Define unsupported markdown fallback behavior.
- [x] Track document dirty state from normalized content, not only editor change events.

Acceptance:

- Golden fixtures round trip without unexpected lossy changes.
- Save/load does not rewrite unrelated parts of a document.
- Unsupported constructs degrade predictably.

## P1 - File Storage And Recovery

- [x] Add backup/recovery strategy for failed saves.
- [x] Add conflict detection when a file changes externally while open.
- [x] Add reload-from-disk and keep-editor-version choices.
- [x] Add autosave status feedback.
- [x] Add recent workspace list.

Acceptance:

- External file changes are detected before destructive overwrite.
- Save failures produce actionable feedback and do not lose editor content.
- Recent files/workspaces survive app restart.

## P2 - Workspace UX Polish

- [x] Replace text-only workspace node actions with icon buttons and tooltips.
- [x] Add context menu for workspace nodes.
- [x] Add keyboard shortcuts for rename/delete/new file/new folder.
- [x] Add empty-directory rendering so directories without markdown files are still visible when useful.
- [x] Add file filtering/search in the workspace panel.
- [x] Add collapse/expand persistence.

Acceptance:

- Workspace actions are discoverable without crowding the tree.
- Keyboard and mouse flows both work.
- Empty states do not hide user-created folders unexpectedly.

## P2 - Performance And Packaging

- [x] Continue reducing initial renderer entry size after workspace/editor features settle.
- [x] Lazy-load heavy block tools where practical.
- [x] Audit Electron CSP and remove development-only unsafe settings for packaged builds.
- [x] Add performance fixture for large markdown files.
- [x] Add package smoke test.

Acceptance:

- `pnpm build:budget` remains green.
- Large documents remain interactive under the chosen benchmark.
- Packaged app does not show Electron security warnings caused by app config.

## Suggested Next Batch

Prepare the next release stabilization pass:

1. Run the full unit, typecheck, lint, build budget, and e2e suites.
2. Smoke-test packaged builds on target platforms.
3. Review any UX rough edges found during manual editing sessions.
4. Keep `todo.md` focused on newly discovered issues after release validation.

Suggested commit:

```text
chore: stabilize release candidate
```
