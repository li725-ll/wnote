# Build Budget Notes

Track production build size after renderer or rendering-pipeline changes.

## Commands

```sh
pnpm build
```

Run `pnpm lint`, `pnpm test`, `pnpm -r run typecheck`, and `git diff --check` before commits that change build or rendering behavior.

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
