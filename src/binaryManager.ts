import { createHash } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";

const RELEASE_REPO = "miralabs-tech/standarflow";
const RESOLVE_STATE_KEY = "standarflow.cliResolution";
const RESOLVE_TTL_MS = 24 * 60 * 60 * 1000;

interface Target {
  triple: string;
  exeSuffix: string;
}

interface Resolution {
  version: string;
  at: number;
}

type Version = [number, number, number];

function currentTarget(): Target {
  const { platform, arch } = process;
  if (platform === "win32" && arch === "x64") {
    return { triple: "x86_64-pc-windows-msvc", exeSuffix: ".exe" };
  }
  if (platform === "darwin" && arch === "x64") {
    return { triple: "x86_64-apple-darwin", exeSuffix: "" };
  }
  if (platform === "darwin" && arch === "arm64") {
    return { triple: "aarch64-apple-darwin", exeSuffix: "" };
  }
  if (platform === "linux" && arch === "x64") {
    return { triple: "x86_64-unknown-linux-gnu", exeSuffix: "" };
  }
  throw new Error(
    `Unsupported platform ${platform}/${arch} — set "standarflow.binPath" to a local standarflow binary.`,
  );
}

export async function ensureBinary(
  context: vscode.ExtensionContext,
  rawBinPath: string,
): Promise<string> {
  if (rawBinPath) {
    return rawBinPath;
  }
  const exe = process.platform === "win32" ? "standarflow.exe" : "standarflow";
  // dist/bin/ is populated only by `install:local` (copy:bin) — a dev fast
  // path. A published .vsix never ships it and falls through to the download.
  const bundled = path.join(context.extensionPath, "dist", "bin", exe);
  if (existsSync(bundled)) {
    return bundled;
  }
  const range = cliRange(context);
  const target = currentTarget();
  const binDir = path.join(context.globalStorageUri.fsPath, "bin");

  // Throttled resolution returns undefined when the GitHub API is unreachable;
  // fall back to the newest cached binary so an offline editor still starts.
  const version =
    (await resolveVersion(context, range)) ?? highestCached(binDir, target, range);
  if (!version) {
    const onPath = findOnPath(exe);
    if (onPath) {
      return onPath;
    }
    throw new Error(
      `Could not resolve a standarflow CLI release for "${range}". ` +
        'Check your connection or set "standarflow.binPath".',
    );
  }
  const cached = path.join(binDir, `standarflow-${version}${target.exeSuffix}`);
  if (existsSync(cached)) {
    return cached;
  }
  try {
    await download(target, version, binDir, cached);
    return cached;
  } catch (err) {
    const fallback = highestCached(binDir, target, range);
    if (fallback) {
      return path.join(binDir, `standarflow-${fallback}${target.exeSuffix}`);
    }
    const onPath = findOnPath(exe);
    if (onPath) {
      return onPath;
    }
    throw new Error(
      `Could not obtain the standarflow ${version} binary (${(err as Error).message}). ` +
        'Install standarflow and set "standarflow.binPath", then retry.',
    );
  }
}

// Force a fresh release lookup (ignoring the throttle) and download the newest
// compatible binary when it is not cached yet. Backs the "Update CLI Binary"
// command.
export async function updateBinary(
  context: vscode.ExtensionContext,
): Promise<{ version: string; updated: boolean }> {
  const range = cliRange(context);
  const target = currentTarget();
  const binDir = path.join(context.globalStorageUri.fsPath, "bin");
  const version = await latestCompatible(range);
  if (!version) {
    throw new Error(`No published standarflow release matches "${range}".`);
  }
  await context.globalState.update(RESOLVE_STATE_KEY, {
    version,
    at: Date.now(),
  } satisfies Resolution);
  const cached = path.join(binDir, `standarflow-${version}${target.exeSuffix}`);
  if (existsSync(cached)) {
    return { version, updated: false };
  }
  await download(target, version, binDir, cached);
  return { version, updated: true };
}

function cliRange(context: vscode.ExtensionContext): string {
  const range = String(context.extension.packageJSON.standarflowCli ?? "").trim();
  if (!range) {
    throw new Error('package.json is missing the "standarflowCli" version range.');
  }
  return range;
}

// Newest published version satisfying `range`, throttled to one GitHub API call
// per TTL. Returns undefined only when the API is unreachable and no usable
// lookup is cached.
async function resolveVersion(
  context: vscode.ExtensionContext,
  range: string,
): Promise<string | undefined> {
  const cached = context.globalState.get<Resolution>(RESOLVE_STATE_KEY);
  if (
    cached &&
    Date.now() - cached.at < RESOLVE_TTL_MS &&
    matchesRange(cached.version, range)
  ) {
    return cached.version;
  }
  try {
    const version = await latestCompatible(range);
    if (version) {
      await context.globalState.update(RESOLVE_STATE_KEY, {
        version,
        at: Date.now(),
      } satisfies Resolution);
    }
    return version;
  } catch {
    return cached && matchesRange(cached.version, range)
      ? cached.version
      : undefined;
  }
}

async function latestCompatible(range: string): Promise<string | undefined> {
  const res = await fetch(
    `https://api.github.com/repos/${RELEASE_REPO}/releases?per_page=100`,
    { headers: { Accept: "application/vnd.github+json" } },
  );
  if (!res.ok) {
    throw new Error(`GET releases -> ${res.status}`);
  }
  const releases = (await res.json()) as {
    tag_name: string;
    draft: boolean;
    prerelease: boolean;
  }[];
  let best: Version | undefined;
  for (const release of releases) {
    if (release.draft || release.prerelease) {
      continue;
    }
    const version = parseVersion(release.tag_name);
    if (!version || !inRange(version, range)) {
      continue;
    }
    if (!best || compare(version, best) > 0) {
      best = version;
    }
  }
  return best ? best.join(".") : undefined;
}

function highestCached(
  binDir: string,
  target: Target,
  range: string,
): string | undefined {
  let entries: string[];
  try {
    entries = readdirSync(binDir);
  } catch {
    return undefined;
  }
  const prefix = "standarflow-";
  let best: Version | undefined;
  for (const name of entries) {
    if (!name.startsWith(prefix) || !name.endsWith(target.exeSuffix)) {
      continue;
    }
    const raw = name.slice(prefix.length, name.length - target.exeSuffix.length);
    const version = parseVersion(raw);
    if (!version || !inRange(version, range)) {
      continue;
    }
    if (!best || compare(version, best) > 0) {
      best = version;
    }
  }
  return best ? best.join(".") : undefined;
}

function parseVersion(raw: string): Version | undefined {
  const m = raw.trim().replace(/^v/, "").match(/^(\d+)\.(\d+)\.(\d+)$/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : undefined;
}

function compare(a: Version, b: Version): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

// Test a version against a "^x.y.z" caret range or an exact "x.y.z" pin. Caret
// upper bounds follow npm: ^1.2.3 -> <2.0.0, ^0.2.3 -> <0.3.0, ^0.0.3 -> <0.0.4.
function inRange(version: Version, range: string): boolean {
  const r = range.trim();
  if (r.startsWith("^")) {
    const low = parseVersion(r.slice(1));
    if (!low || compare(version, low) < 0) {
      return false;
    }
    const high: Version =
      low[0] > 0
        ? [low[0] + 1, 0, 0]
        : low[1] > 0
          ? [0, low[1] + 1, 0]
          : [0, 0, low[2] + 1];
    return compare(version, high) < 0;
  }
  const exact = parseVersion(r);
  return exact ? compare(version, exact) === 0 : false;
}

function matchesRange(version: string, range: string): boolean {
  const v = parseVersion(version);
  return v ? inRange(v, range) : false;
}

async function download(
  target: Target,
  version: string,
  binDir: string,
  dest: string,
): Promise<void> {
  const asset = `standarflow-${target.triple}${target.exeSuffix}`;
  const base = `https://github.com/${RELEASE_REPO}/releases/download/v${version}`;
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Downloading standarflow ${version}…`,
    },
    async () => {
      const expected = await fetchChecksum(`${base}/sha256sums.txt`, asset);
      const bytes = await fetchBytes(`${base}/${asset}`);
      const actual = createHash("sha256").update(bytes).digest("hex");
      if (actual !== expected) {
        throw new Error(`checksum mismatch for ${asset}`);
      }
      await fs.mkdir(binDir, { recursive: true });
      const tmp = `${dest}.part`;
      await fs.writeFile(tmp, bytes);
      if (process.platform !== "win32") {
        await fs.chmod(tmp, 0o755);
      }
      await fs.rename(tmp, dest);
    },
  );
}

async function fetchBytes(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GET ${url} -> ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function fetchChecksum(url: string, asset: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GET ${url} -> ${res.status}`);
  }
  const text = await res.text();
  for (const line of text.split(/\r?\n/)) {
    const m = line.trim().match(/^([0-9a-f]{64})\s+\*?(.+)$/i);
    if (m && path.basename(m[2]) === asset) {
      return m[1].toLowerCase();
    }
  }
  throw new Error(`${asset} not listed in sha256sums.txt`);
}

function findOnPath(exe: string): string | undefined {
  for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
    if (dir && existsSync(path.join(dir, exe))) {
      return path.join(dir, exe);
    }
  }
  return undefined;
}
