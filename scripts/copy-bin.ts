/// <reference types="bun-types" />
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

const extRoot = path.resolve(import.meta.dir, '..');
const workspaceRoot = path.resolve(extRoot, '..', '..');
const profile = process.env.STANDARFLOW_PROFILE ?? 'release';
const exeName = process.platform === 'win32' ? 'standarflow.exe' : 'standarflow';
const src = path.join(workspaceRoot, 'target', profile, exeName);
const destDir = path.join(extRoot, 'dist', 'bin');
const dest = path.join(destDir, exeName);

const srcFile = Bun.file(src);
if (!(await srcFile.exists())) {
  console.error(`Binary not found: ${src}`);
  console.error(`Run 'cargo build --${profile === 'release' ? 'release' : ''} -p standarflow-cli' from the workspace root first.`);
  process.exit(1);
}

await fs.mkdir(destDir, { recursive: true });
await fs.copyFile(src, dest);

const size = (await fs.stat(dest)).size;
console.log(`Copied ${path.relative(workspaceRoot, src)} → ${path.relative(extRoot, dest)} (${(size / 1024 / 1024).toFixed(2)} MB)`);
