/// <reference types="bun-types" />
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const extRoot = path.resolve(import.meta.dir, '..');
const exeName = process.platform === 'win32' ? 'standarflow.exe' : 'standarflow';
const profile = process.env.STANDARFLOW_PROFILE ?? 'release';

function resolveSource(): string {
  if (process.env.STANDARFLOW_BIN) {
    return path.resolve(process.env.STANDARFLOW_BIN);
  }
  const repo = process.env.STANDARFLOW_REPO
    ? path.resolve(process.env.STANDARFLOW_REPO)
    : path.resolve(extRoot, '..', 'standarflow');
  return path.join(repo, 'target', profile, exeName);
}

const src = resolveSource();
const destDir = path.join(extRoot, 'dist', 'bin');
const dest = path.join(destDir, exeName);

if (!(await Bun.file(src).exists())) {
  console.error(`standarflow binary not found: ${src}`);
  console.error('Build standarflow first, then either run from a sibling');
  console.error('`standarflow` checkout, or set STANDARFLOW_BIN (binary path)');
  console.error('or STANDARFLOW_REPO (path to a standarflow checkout).');
  process.exit(1);
}

await fs.mkdir(destDir, { recursive: true });
await fs.copyFile(src, dest);

const size = (await fs.stat(dest)).size;
console.log(`Copied ${src} -> ${path.relative(extRoot, dest)} (${(size / 1024 / 1024).toFixed(2)} MB)`);
