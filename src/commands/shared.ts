import * as vscode from "vscode";
import type { StandarflowClient } from "../mcpClient";
import type { TreeNode } from "../treeProvider";
import type { SessionSelection } from "./treeNode";

export interface CommandCtx {
  client: StandarflowClient;
  node: TreeNode | undefined;
}

const SLUG_RE = /^[a-z0-9][a-z0-9_\-]*$/i;

export function validateSlug(v: string): string | undefined {
  const t = v.trim();
  if (!t) return "slug is required";
  if (!SLUG_RE.test(t)) return "slug must start alphanumeric, only letters/digits/_/- allowed";
  return undefined;
}

export async function listAllGroupPaths(
  client: StandarflowClient,
  parentPath?: string,
): Promise<string[]> {
  const groups = await client.groupList(parentPath);
  const out: string[] = [];
  for (const g of groups) {
    const full = parentPath ? `${parentPath}/${g.slug}` : g.slug;
    out.push(full);
    out.push(...(await listAllGroupPaths(client, full)));
  }
  return out;
}

export async function pickGroupPath(
  client: StandarflowClient,
  placeHolder: string,
  exclude?: string,
): Promise<string | undefined> {
  const groups = (await listAllGroupPaths(client)).filter((p) => p !== exclude);
  if (groups.length === 0) {
    void vscode.window.showWarningMessage("No group available.");
    return undefined;
  }
  return vscode.window.showQuickPick(groups, { placeHolder });
}

export async function pickSession(
  client: StandarflowClient,
  placeHolder: string,
): Promise<SessionSelection | undefined> {
  const groupPath = await pickGroupPath(client, "Group");
  if (!groupPath) return undefined;
  const sessions = await client.sessionList(groupPath);
  if (sessions.length === 0) {
    void vscode.window.showWarningMessage(`No session in ${groupPath}.`);
    return undefined;
  }
  const choice = await vscode.window.showQuickPick(
    sessions.map((s) => ({
      label: s.slug,
      description: `${s.kind} · ${s.status}${s.created_by ? ` · ${s.created_by}` : ""}`,
      slug: s.slug,
    })),
    { placeHolder },
  );
  if (!choice) return undefined;
  return { groupPath, slug: choice.slug };
}
