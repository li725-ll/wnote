export interface MarkdownAdapter {
  htmlToMarkdown(html: string): string;
  markdownToHtml(markdown: string): string;
}

export interface EditorContentTarget {
  getHTML(): string;
  setHTML(html: string): void;
}

export interface ContentSyncOptions {
  initialContent: string;
  loadMarkdown: () => Promise<MarkdownAdapter>;
  onChange?: (markdown: string) => void;
}

export class EditorContentSync {
  private markdown: string;
  private latestHtml = "";
  private version = 0;
  private pending: Promise<string> | null = null;
  private onChange?: (markdown: string) => void;

  constructor(private readonly options: ContentSyncOptions) {
    this.markdown = options.initialContent;
    this.onChange = options.onChange;
  }

  setOnChange(onChange?: (markdown: string) => void) {
    this.onChange = onChange;
  }

  getContent(): string {
    return this.markdown;
  }

  async getContentAsync(fallbackHtml?: string): Promise<string> {
    if (this.pending) return this.pending;
    if (fallbackHtml === undefined) return this.markdown;
    return this.convertEditorHtml(fallbackHtml);
  }

  convertEditorHtml(html: string): Promise<string> {
    this.latestHtml = html;
    const version = ++this.version;
    const promise = this.options
      .loadMarkdown()
      .then(({ htmlToMarkdown }) => htmlToMarkdown(html))
      .then((markdown) => {
        if (version === this.version) {
          this.markdown = markdown;
          this.onChange?.(markdown);
        }
        return markdown;
      });
    this.pending = promise;
    return promise;
  }

  applyMarkdownContent(markdown: string, target?: EditorContentTarget): Promise<string> {
    this.markdown = markdown;
    const version = ++this.version;
    const promise = this.options.loadMarkdown().then(({ markdownToHtml }) => {
      if (version !== this.version) return markdown;
      if (target) {
        target.setHTML(markdownToHtml(markdown));
        this.latestHtml = target.getHTML();
      }
      this.markdown = markdown;
      return markdown;
    });
    this.pending = promise;
    return promise;
  }

  getLatestHtml(): string {
    return this.latestHtml;
  }
}
