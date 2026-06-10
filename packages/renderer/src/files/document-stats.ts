export interface DocumentStats {
  words: number;
  characters: number;
  lines: number;
}

const cjkPattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const wordPattern =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]|[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*|\p{N}+(?:[.,:/-]\p{N}+)*/gu;

export function documentStats(markdown: string): DocumentStats {
  const text = markdownToCountableText(markdown);
  return {
    words: countTextWords(text),
    characters: Array.from(text.replace(/\s/g, "")).length,
    lines: markdown.length ? markdown.replace(/\r\n?/g, "\n").split("\n").length : 0,
  };
}

export function countTextWords(text: string): number {
  let count = 0;
  for (const match of text.matchAll(wordPattern)) {
    count += cjkPattern.test(match[0]) ? Array.from(match[0]).length : 1;
  }
  return count;
}

export function markdownToCountableText(markdown: string): string {
  return markdown
    .replace(/\r\n?/g, "\n")
    .replace(/^---\n[\s\S]*?\n---(?=\n|$)/, " ")
    .replace(/```[^\n]*\n([\s\S]*?)```/g, "\n$1\n")
    .replace(/~~~[^\n]*\n([\s\S]*?)~~~/g, "\n$1\n")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, " $1 ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, " $1 ")
    .replace(/`([^`]+)`/g, " $1 ")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/[*_~#>|[\](){}\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
