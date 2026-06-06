# Build Budget Notes

Track production build size after renderer or rendering-pipeline changes.

## Commands

```sh
pnpm build
pnpm build:budget
```

Run `pnpm lint`, `pnpm test`, `pnpm -r run typecheck`, and `git diff --check` before commits
that change build or rendering behavior.

## 2026-06-06 Baseline

Shiki now loads themes and grammars on demand instead of statically importing every supported language.

Renderer build highlights:

- Main renderer entry: about `228 kB` minified, `52 kB` gzip.
- Shiki runtime chunk: about `201 kB` minified, `51 kB` gzip.
- Shiki language chunks: loaded only when a matching code block is rendered.
- Tiptap vendor chunk: about `554 kB` minified, `148 kB` gzip.
- Mermaid core chunk: about `844 kB` minified, `168 kB` gzip.

Main process build highlights:

- Shiki runtime chunk: about `138 kB` minified, `44 kB` gzip.
- Shiki language chunks: loaded only during HTML/PDF export when needed.
- KaTeX export chunk: about `262 kB` minified, `78 kB` gzip.

## Current Policy

- Code highlighting must stay async and lazy.
- Mermaid rendering stays behind the Mermaid node view dynamic import.
- KaTeX rendering stays behind math node/export dynamic imports.
- The Tiptap editor remains in the primary editor route until a larger shell/editor route split exists.

## Follow-Up Targets

- Add route-level renderer splitting if the app grows beyond the editor-first shell.
- Investigate whether Mermaid can be constrained to common diagrams without using unstable private dist paths.
- Consider lowering the user-facing export path cost by moving PDF/HTML render helpers deeper into main-process dynamic imports.
- Keep large chunk warnings visible until there is an explicit budget threshold in Vite config.

## 2026-06-06 Completion Pass

Validated after the Electron smoke runner and packaged app pass.

Renderer build highlights:

- Main renderer entry: about `238 kB` minified, `54 kB` gzip.
- Shiki runtime chunk: about `201 kB` minified, `51 kB` gzip.
- Tiptap vendor chunk: about `554 kB` minified, `148 kB` gzip.
- Mermaid core chunk: about `844 kB` minified, `168 kB` gzip.
- Wardley/Cytoscape chunks remain Mermaid-driven and lazy-loaded.

Main process build highlights:

- Main process entry: about `258 kB` minified, `84 kB` gzip.
- Shiki runtime chunk: about `138 kB` minified, `44 kB` gzip.
- KaTeX export chunk: about `262 kB` minified, `78 kB` gzip.

Decision:

- Do not hide Vite large chunk warnings yet.
- Do not split the editor route until the main renderer entry exceeds `300 kB` minified or a
  non-editor first-run route becomes a product requirement.
- Keep Mermaid and Shiki behind dynamic imports; avoid private Mermaid package path trimming unless
  a supported public API exists.

## 2026-06-06 Final Validation Snapshot

Captured from `pnpm run pack`, which runs the production renderer and main builds before packaging.

Renderer build highlights:

- CSS entry: about `34 kB` minified, `7 kB` gzip.
- Main renderer entry: about `238 kB` minified, `54 kB` gzip.
- React vendor chunk: about `317 kB` minified, `77 kB` gzip.
- KaTeX vendor chunk: about `329 kB` minified, `82 kB` gzip.
- Markdown vendor chunk: about `447 kB` minified, `109 kB` gzip.
- Tiptap vendor chunk: about `554 kB` minified, `148 kB` gzip.
- Mermaid core chunk: about `844 kB` minified, `168 kB` gzip.

Main process build highlights:

- Main process entry: about `259 kB` minified, `84 kB` gzip.
- Shiki runtime chunk: about `138 kB` minified, `44 kB` gzip.
- KaTeX export chunk: about `262 kB` minified, `78 kB` gzip.

The current warnings are acceptable for Typora-like V1 because the oversized renderer chunks are
feature-specific editor/rendering dependencies rather than accidental app-shell growth.

## Enforced Budgets

`pnpm build:budget` checks already-built production artifacts. Run `pnpm build` first. When a
budget points at an HTML entry, the checker follows that module script. Otherwise, if a pattern
matches multiple hashed files, the checker uses the largest matching artifact.

Current hard limits leave room for normal dependency patch drift while still catching accidental
entry-point growth:

- Renderer CSS: `45 kB` minified, `10 kB` gzip.
- Renderer main entry: `300 kB` minified, `75 kB` gzip.
- Renderer React vendor: `360 kB` minified, `90 kB` gzip.
- Renderer Markdown vendor: `500 kB` minified, `125 kB` gzip.
- Renderer Tiptap vendor: `620 kB` minified, `170 kB` gzip.
- Renderer Mermaid core: `920 kB` minified, `190 kB` gzip.
- Main process entry: `310 kB` minified, `105 kB` gzip.
- Main Shiki runtime: `170 kB` minified, `55 kB` gzip.
- Main KaTeX export chunk: `300 kB` minified, `90 kB` gzip.

If a budget fails, either reduce the chunk size or update this document with a concrete reason for
the new threshold.

## 2026-06-06 Renderer Lazy UI Split

First bundle-reduction pass:

- Moved Settings Page, Command Palette, and Export Dialog behind React lazy boundaries.
- Kept the editor, tab bar, outline, resource panel, and toast in the primary editor route.
- Restored the regression fixture to valid Markdown so startup E2E keeps checking table/code rich
  rendering instead of raw Markdown fallback.

Build result:

- Renderer CSS entry dropped from about `35 kB` to about `30 kB` minified.
- Renderer main entry dropped from about `238 kB` to about `216 kB` minified.
- Lazy UI chunks added:
  - Command Palette: about `3 kB` JS and `1 kB` CSS.
  - Settings Page: about `5 kB` JS and `2 kB` CSS.
  - Export Dialog: about `8 kB` JS and `2 kB` CSS.

Validated with `pnpm build`, `pnpm build:budget`, renderer tests/typecheck, and full Playwright
E2E.

## 2026-06-06 Command Palette Command Split

Fourth bundle-reduction pass:

- Moved command palette command construction into the lazy Command Palette chunk.
- App now passes only stable command action callbacks to the lazy component.
- The renderer shell no longer synchronously loads palette command metadata or editor format command
  lambdas just to boot the editor view.

Build result:

- Renderer HTML entry script dropped from about `129 kB` to about `120 kB` minified.
- Command Palette lazy chunk increased from about `3 kB` to about `10 kB` minified.
- No changes to editor, Tiptap vendor, Markdown vendor, or Mermaid core chunk policy.

Validated with `pnpm build`, `pnpm build:budget`, renderer tests/typecheck, and full Playwright
E2E.

## 2026-06-06 Renderer Resource Panel Split

Second bundle-reduction pass:

- Moved Welcome Page and Resource Panel behind React lazy boundaries.
- Kept editor asset action hooks in the primary route because image paste/drop saving and preview
  resolution are editor-first behavior.
- Mermaid runtime was already behind `import("@wnote/renderers/mermaid")`; the Mermaid node view
  stays inside the editor extension bundle for now to avoid fragmenting the ProseMirror schema path.

Build result:

- Renderer CSS entry dropped from about `30 kB` to about `26 kB` minified.
- Renderer main entry dropped from about `216 kB` to about `206 kB` minified.
- Lazy UI chunks added:
  - Welcome Page: about `2 kB` JS and `1 kB` CSS.
  - Resource Panel: about `5 kB` JS and `3 kB` CSS.

Validated with `pnpm build`, `pnpm build:budget`, renderer tests/typecheck, and full Playwright
E2E.

## 2026-06-06 Renderer Editor Split

Third bundle-reduction pass:

- Moved `@wnote/editor-react` behind the editor view lazy boundary.
- Replaced renderer command metadata's runtime `formatCommands` import with lightweight renderer
  command lambdas so command palette and menu IPC no longer pull the editor package into the shell.
- Added an editor ready signal so active tab content is replayed after the lazy editor instance
  mounts. This keeps startup file open and reopen flows stable.
- Updated the build budget checker to follow `dist/index.html` for the renderer entry instead of
  guessing from all `index-*.js` chunks.

Build result:

- Renderer HTML entry script is about `129 kB` minified, `33 kB` gzip.
- Shell-adjacent lazy chunk is about `77 kB` minified, `17 kB` gzip.
- Editor lazy chunk is about `133 kB` minified, `34 kB` gzip.
- Entry CSS is now split into about `8 kB` shell CSS and `18 kB` editor CSS.
- Tiptap vendor, Markdown vendor, and Mermaid core stay on their existing budget tracks.

Validated with `pnpm build`, `pnpm build:budget`, renderer tests/typecheck, and full Playwright
E2E.
