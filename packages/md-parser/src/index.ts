export type { Document, BlockNode, InlineNode, ListItem, TableCell, Alignment } from "./types";

import type { Document, BlockNode } from "./types";

export type RenderFn = (markdown: string) => string;
export type ParseFn = (markdown: string) => Document;
export type ParseBlockFn = (markdown: string) => BlockNode | undefined;

export declare const parse: ParseFn;
export declare const parse_block: ParseBlockFn;
export declare const render: RenderFn;
