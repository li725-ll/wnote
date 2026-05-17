#!/usr/bin/env node
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  return execSync(cmd, { cwd: root, stdio: "inherit", ...opts });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

function bumpVersion(version, type) {
  const [major, minor, patch] = version.split(".").map(Number);
  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

const bumpType = ["patch", "minor", "major"].includes(process.argv[2]) ? process.argv[2] : "patch";

const status = execSync("git status --porcelain", { cwd: root }).toString().trim();
if (status) {
  console.error("✖ 工作区有未提交的改动，请先提交或暂存后再发布。");
  process.exit(1);
}

const pkgPath = resolve(root, "package.json");
const pkg = readJson(pkgPath);
const oldVersion = pkg.version;
const newVersion = bumpVersion(oldVersion, bumpType);
pkg.version = newVersion;
writeJson(pkgPath, pkg);
console.log(`\n版本号：${oldVersion} → ${newVersion}\n`);

run("pnpm changelog");

run(`git add package.json CHANGELOG.md`);
run(`git commit -m "release: v${newVersion}"`);

run(`git tag -a v${newVersion} -m "v${newVersion}"`);

console.log(`\n✔ 发布完成：v${newVersion}`);
console.log(`  推送：git push && git push origin v${newVersion}`);
