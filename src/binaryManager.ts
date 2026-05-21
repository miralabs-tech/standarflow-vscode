import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";

const RELEASE_REPO = "miralabs-tech/standarflow";

interface Target {
  triple: string;
  exeSuffix: string;
}

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
  const version = String(context.extension.packageJSON.standarflowCli ?? "").trim();
  if (!version) {
    throw new Error('package.json is missing the "standarflowCli" version field.');
  }
  const target = currentTarget();
  const binDir = path.join(context.globalStorageUri.fsPath, "bin");
  const cached = path.join(binDir, `standarflow-${version}${target.exeSuffix}`);
  if (existsSync(cached)) {
    return cached;
  }
  try {
    await download(target, version, binDir, cached);
    return cached;
  } catch (err) {
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
