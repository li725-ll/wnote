import { describe, expect, it, vi } from "vitest";
import { EditorContentSync, type EditorContentTarget, type MarkdownAdapter } from "./content-sync";

describe("EditorContentSync", () => {
  it("keeps synchronous content available before async conversion finishes", async () => {
    const adapter = markdownAdapter();
    const sync = new EditorContentSync({
      initialContent: "# Initial",
      loadMarkdown: async () => adapter,
    });

    const pending = sync.convertEditorHtml("<h1>Changed</h1>");

    expect(sync.getContent()).toBe("# Initial");
    await expect(pending).resolves.toBe("# Changed");
    expect(sync.getContent()).toBe("# Changed");
  });

  it("lets getContentAsync wait for the latest pending conversion", async () => {
    const gate = deferred<MarkdownAdapter>();
    const sync = new EditorContentSync({
      initialContent: "# Initial",
      loadMarkdown: () => gate.promise,
    });

    const pending = sync.convertEditorHtml("<h1>Changed</h1>");
    const content = sync.getContentAsync("<h1>Ignored</h1>");

    gate.resolve(markdownAdapter());

    await expect(pending).resolves.toBe("# Changed");
    await expect(content).resolves.toBe("# Changed");
  });

  it("does not let stale conversions overwrite newer content", async () => {
    const first = deferred<MarkdownAdapter>();
    const second = deferred<MarkdownAdapter>();
    const onChange = vi.fn();
    const sync = new EditorContentSync({
      initialContent: "# Initial",
      loadMarkdown: vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise),
      onChange,
    });

    const stale = sync.convertEditorHtml("<h1>Stale</h1>");
    const latest = sync.convertEditorHtml("<h1>Latest</h1>");

    first.resolve(markdownAdapter());
    await expect(stale).resolves.toBe("# Stale");
    expect(sync.getContent()).toBe("# Initial");
    expect(onChange).not.toHaveBeenCalled();

    second.resolve(markdownAdapter());
    await expect(latest).resolves.toBe("# Latest");
    expect(sync.getContent()).toBe("# Latest");
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith("# Latest");
  });

  it("applies markdown to the target and tracks its latest html", async () => {
    const adapter = markdownAdapter();
    const target = editorTarget();
    const sync = new EditorContentSync({
      initialContent: "",
      loadMarkdown: async () => adapter,
    });

    await expect(sync.applyMarkdownContent("# Title", target)).resolves.toBe("# Title");

    expect(target.html).toBe("<h1>Title</h1>");
    expect(sync.getLatestHtml()).toBe("<h1>Title</h1>");
    expect(sync.getContent()).toBe("# Title");
  });

  it("updates markdown cache even when no editor target is mounted", async () => {
    const sync = new EditorContentSync({
      initialContent: "# Initial",
      loadMarkdown: async () => markdownAdapter(),
    });

    await expect(sync.applyMarkdownContent("# Pending")).resolves.toBe("# Pending");

    expect(sync.getContent()).toBe("# Pending");
    await expect(sync.getContentAsync()).resolves.toBe("# Pending");
  });
});

function markdownAdapter(): MarkdownAdapter {
  return {
    htmlToMarkdown(html) {
      return html.replace(/^<h1>/, "# ").replace(/<\/h1>$/, "");
    },
    markdownToHtml(markdown) {
      return markdown.replace(/^# (.*)$/, "<h1>$1</h1>");
    },
  };
}

function editorTarget(): EditorContentTarget & { html: string } {
  return {
    html: "",
    getHTML() {
      return this.html;
    },
    setHTML(html) {
      this.html = html;
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
