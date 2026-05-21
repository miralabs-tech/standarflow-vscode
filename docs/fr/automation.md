[English](../en/automation.md) · [↑ Documentation](../README.md)

# Automatisation — laisse ton agent IA alimenter standarflow

Une fois les hooks Claude Code installés, standarflow suit ton travail avec
l'IA tout seul : chaque chat devient une **conversation**, et les fichiers que
chaque tour touche sont enregistrés. Focalise une conversation sur une session
et ces modifications de fichiers se rattachent à cette session
automatiquement — aucune tenue de comptes manuelle.

> Le branchement ci-dessous est spécifique à Claude Code. Le côté standarflow,
> lui, est agnostique — `standarflow ingest` est le contrat que n'importe quel
> harnais peut alimenter.

## 1. Installer les hooks

Lance **`Standarflow: Install Claude Code Hooks`** depuis la palette de
commandes et choisis une portée :

| Portée | Écrit dans | Capture |
| --- | --- | --- |
| Ce workspace seulement | `.claude/settings.local.json` (git-ignoré) | seulement ce workspace |
| Tous les projets | `~/.claude/settings.json` | tous les workspaces de la machine |

La commande lance `standarflow hooks install` en coulisses. C'est idempotent,
le fichier édité est sauvegardé, et tes hooks existants sont préservés.

Elle branche des hooks sur six événements Claude Code — `SessionStart`,
`UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`, `SessionEnd` — qui
appellent tous `standarflow ingest`. Le pipeline d'ingestion enregistre chaque
conversation et les modifications de fichiers qu'elle fait.

## 2. Focaliser une conversation sur une session

Le suivi ne rattache les modifications de fichiers qu'une fois une
conversation **focalisée** sur une session. Focalise depuis l'un ou l'autre
côté de l'arbre :

| Depuis | Commande |
| --- | --- |
| Une session / un artefact | Clic droit → **Focus a Conversation Here**, choisis une conversation active |
| Une conversation | Clic droit → **Focus Conversation on Session…**, choisis une session |
| Une conversation sans focus | Clic droit → **Adopt Current Session** — un clic, sans sélecteur |

Pour retirer le focus : clic droit sur la conversation → **Clear Conversation
Focus**.

Chaque chat est sa propre conversation, identifiée par l'identifiant stable
que lui donne son fournisseur — le focus survit donc aux redémarrages, et deux
chats dans le même workspace ne se marchent jamais dessus.

Sans focus, les hooks suivent toujours les conversations, mais rien ne se
rattache à une session. Ils peuvent rester installés en permanence sans
risque.

## 3. Inspecter le résultat

Ouvre une session dans la visionneuse webview (`Standarflow: Open Session`, ou
clic dessus dans l'arbre) :

- Panneau **Conversations** — les chats qui ont travaillé dans cette session,
  avec le nombre de touches.
- Panneau **File changes** — les modifications de fichiers attribuées à cette
  session.
- Panneau **Attached files** — les fichiers rattachés à la session, avec
  aperçu `.md` en ligne.

L'installation des hooks vise pour l'instant Claude Code
(`--provider claude-code`). Tout autre harnais capable de lancer une commande
sur ses événements de cycle de vie peut alimenter standarflow en appelant
`standarflow ingest` de la même façon.
