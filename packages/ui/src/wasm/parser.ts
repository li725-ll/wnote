import type { Document, BlockNode } from "@wnote/md-parser";
import {
  parse as wasmParse,
  parse_block as wasmParseBlock,
  render as wasmRender,
} from "@wnote/md-parser";

export function parse(markdown: string): Document {
  return wasmParse(markdown) as Document;
}

export function parseBlock(markdown: string): BlockNode | undefined {
  return wasmParseBlock(markdown) as BlockNode | undefined;
}

export function render(markdown: string): string {
  return wasmRender(markdown) as string;
}
