/// <reference types="bun-types" />
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const extRoot = path.resolve(import.meta.dir, '..');
const profile = process.env.STANDARFLOW_PROFILE ?? 'release';

const repo = process.env.STANDARFLOW_REPO
  ? path.resolve(process.env.STANDARFLOW_REPO)
  : path.resolve(extRoot, '..', 'standarflow');

if (!fs.existsSync(path.join(repo, 'Cargo.toml'))) {
  console.error(`No Cargo.toml in ${repo}`);
  console.error('Set STANDARFLOW_REPO to a standarflow checkout, or place one');
  console.error('at ../standarflow next to this repository.');
  process.exit(1);
}

const args = ['build', '-p', 'standarflow-cli'];
if (profile === 'release') {
  args.push('--release');
}

console.log(`cargo ${args.join(' ')}  (in ${repo})`);
const result = spawnSync('cargo', args, { cwd: repo, stdio: 'inherit', shell: true });
process.exit(result.status ?? 1);
