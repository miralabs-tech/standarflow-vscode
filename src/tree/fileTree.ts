import type { FileChange } from "../mcpClient";
import type { FileTreeDir, FileTreeNode, TreeNode } from "./types";

function relSegments(filePath: string, root: string | undefined): string[] {
  const norm = (s: string) => s.replace(/\\/g, "/").replace(/\/+$/, "");
  const fp = norm(filePath);
  if (root) {
    const r = norm(root);
    if (fp.toLowerCase().startsWith(`${r.toLowerCase()}/`)) {
      return fp
        .slice(r.length + 1)
        .split("/")
        .filter(Boolean);
    }
  }
  return [fp];
}

function sortFileTree(nodes: FileTreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const n of nodes) {
    if (n.kind === "dir") sortFileTree(n.children);
  }
}

/// Coalesce flat change rows into a path tree: one leaf per distinct file,
/// carrying all its change rows. Paths are shown relative to the workspace.
export function buildFileTree(
  changes: FileChange[],
  root: string | undefined,
): FileTreeNode[] {
  const byPath = new Map<string, FileChange[]>();
  for (const c of changes) {
    const arr = byPath.get(c.file_path);
    if (arr) arr.push(c);
    else byPath.set(c.file_path, [c]);
  }
  const roots: FileTreeNode[] = [];
  for (const [path, rows] of byPath) {
    const segs = relSegments(path, root);
    let children = roots;
    let prefix = "";
    for (let i = 0; i < segs.length - 1; i++) {
      const name = segs[i];
      prefix = prefix ? `${prefix}/${name}` : name;
      let dir = children.find(
        (n): n is FileTreeDir => n.kind === "dir" && n.name === name,
      );
      if (!dir) {
        dir = { kind: "dir", name, relPath: prefix, children: [] };
        children.push(dir);
      }
      children = dir.children;
    }
    const name = segs[segs.length - 1];
    children.push({
      kind: "file",
      name,
      relPath: prefix ? `${prefix}/${name}` : name,
      path,
      changes: rows,
    });
  }
  sortFileTree(roots);
  return roots;
}

export function fileTreeNode(sessionId: number, n: FileTreeNode): TreeNode {
  return n.kind === "dir"
    ? { kind: "fileChangeDir", sessionId, dir: n }
    : { kind: "fileChangeFile", sessionId, file: n };
}
