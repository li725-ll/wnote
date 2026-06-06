#!/usr/bin/env node
import { gzipSync } from "node:zlib";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const budgets = [
  {
    label: "renderer css",
    directory: "packages/renderer/dist/assets",
    match: /^index-.*\.css$/,
    maxBytes: 45 * 1024,
    maxGzipBytes: 10 * 1024,
  },
  {
    label: "renderer entry",
    directory: "packages/renderer/dist/assets",
    match: /^index-.*\.js$/,
    maxBytes: 300 * 1024,
    maxGzipBytes: 75 * 1024,
  },
  {
    label: "renderer react vendor",
    directory: "packages/renderer/dist/assets",
    match: /^vendor-react-.*\.js$/,
    maxBytes: 360 * 1024,
    maxGzipBytes: 90 * 1024,
  },
  {
    label: "renderer markdown vendor",
    directory: "packages/renderer/dist/assets",
    match: /^vendor-markdown-.*\.js$/,
    maxBytes: 500 * 1024,
    maxGzipBytes: 125 * 1024,
  },
  {
    label: "renderer tiptap vendor",
    directory: "packages/renderer/dist/assets",
    match: /^vendor-tiptap-.*\.js$/,
    maxBytes: 620 * 1024,
    maxGzipBytes: 170 * 1024,
  },
  {
    label: "renderer mermaid core",
    directory: "packages/renderer/dist/assets",
    match: /^mermaid\.core-.*\.js$/,
    maxBytes: 920 * 1024,
    maxGzipBytes: 190 * 1024,
  },
  {
    label: "main entry",
    directory: "packages/main/dist",
    match: /^index-.*\.js$/,
    maxBytes: 310 * 1024,
    maxGzipBytes: 105 * 1024,
  },
  {
    label: "main shiki runtime",
    directory: "packages/main/dist",
    match: /^shiki-.*\.js$/,
    maxBytes: 170 * 1024,
    maxGzipBytes: 55 * 1024,
  },
  {
    label: "main katex export",
    directory: "packages/main/dist",
    match: /^katex-.*\.js$/,
    maxBytes: 300 * 1024,
    maxGzipBytes: 90 * 1024,
  },
];

let failed = false;

for (const budget of budgets) {
  const filePath = findSingleFile(budget.directory, budget.match);
  if (!filePath) {
    failed = true;
    console.error(`Missing build artifact for ${budget.label}`);
    continue;
  }

  const bytes = statSync(filePath).size;
  const gzipBytes = gzipSync(readFileSync(filePath)).byteLength;
  const byteStatus = bytes <= budget.maxBytes ? "ok" : "over";
  const gzipStatus = gzipBytes <= budget.maxGzipBytes ? "ok" : "over";

  console.log(
    `${budget.label}: ${formatBytes(bytes)} / ${formatBytes(budget.maxBytes)} (${byteStatus}), gzip ${formatBytes(gzipBytes)} / ${formatBytes(budget.maxGzipBytes)} (${gzipStatus})`,
  );

  if (bytes > budget.maxBytes || gzipBytes > budget.maxGzipBytes) failed = true;
}

if (failed) {
  console.error("Build budget check failed.");
  process.exit(1);
}

function findSingleFile(directory, match) {
  const absoluteDirectory = join(root, directory);
  const matches = readdirSync(absoluteDirectory)
    .filter((fileName) => match.test(fileName))
    .map((fileName) => join(absoluteDirectory, fileName));
  return matches.sort((left, right) => statSync(right).size - statSync(left).size)[0] ?? null;
}

function formatBytes(bytes) {
  return `${Math.round((bytes / 1024) * 10) / 10} kB`;
}
