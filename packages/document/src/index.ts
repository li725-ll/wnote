import type { HeadingItem } from "@wnote/contracts";
import { parseMarkdown } from "@wnote/markdown";

export interface DocumentSession {
  id: string;
  path: string | null;
  name: string;
  markdown: string;
  editorDocument: unknown;
  headings: HeadingItem[];
  dirty: boolean;
  version: number;
  lastSavedAt: number | null;
}

export function createDocumentSession(input?: {
  id?: string;
  path?: string | null;
  name?: string;
  markdown?: string;
}): DocumentSession {
  const markdown = input?.markdown ?? "";
  const parsed = parseMarkdown(markdown);
  return {
    id: input?.id ?? createSessionId(),
    path: input?.path ?? null,
    name: input?.name ?? "未命名",
    markdown,
    editorDocument: parsed.document,
    headings: parsed.headings,
    dirty: false,
    version: 0,
    lastSavedAt: null,
  };
}

export function updateSessionMarkdown(session: DocumentSession, markdown: string): DocumentSession {
  const parsed = parseMarkdown(markdown);
  return {
    ...session,
    markdown,
    editorDocument: parsed.document,
    headings: parsed.headings,
    dirty: true,
    version: session.version + 1,
  };
}

export function markSessionSaved(
  session: DocumentSession,
  payload: { path: string; name: string },
): DocumentSession {
  return {
    ...session,
    path: payload.path,
    name: payload.name,
    dirty: false,
    lastSavedAt: Date.now(),
  };
}

function createSessionId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
