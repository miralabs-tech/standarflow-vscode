[English](../en/commands.md) · [↑ Documentation](../README.md)

# Commandes

Rien à retenir par cœur. Ouvre la palette de commandes (`Ctrl+Shift+P`), tape
`Standarflow:` et parcours — ou fais un clic droit sur un nœud de l'arbre.
Cette page est la carte complète, groupée par intention. Les noms de commandes
restent en anglais (ce sont les libellés réels dans VS Code). La colonne **Où**
indique quel nœud de l'arbre expose la commande dans son menu contextuel.

## Espace de travail

| Commande | Ce qu'elle fait | Où |
| --- | --- | --- |
| `Standarflow: Actions` | Ouvre un menu rapide des actions Standarflow courantes | palette |
| `Standarflow: Open Settings` | Ouvre la page de réglages `standarflow.*` | palette |
| `Standarflow: Reconnect` | Détruit et recrée le client MCP | palette |
| `Standarflow: Disconnect` | Ferme le client MCP | palette |
| `Standarflow: Show Workspace Info` | Affiche le chemin de la base, la version de schéma et les compteurs | palette |
| `Standarflow: Refresh Tree` | Recharge l'arbre | barre de titre de l'arbre |
| `Standarflow: Reveal Current Session` | Sélectionne et révèle la session courante du workspace dans l'arbre | barre de titre de l'arbre |
| `Standarflow: Hide / Show Superseded Sessions` | Affiche ou masque les sessions `superseded` dans l'arbre | barre de titre de l'arbre |
| `Standarflow: Delete Database` | Supprime le fichier SQLite (et ses `-wal` / `-shm`) ; la reconnexion en crée un neuf | palette |

## Groupes

| Commande | Ce qu'elle fait | Où |
| --- | --- | --- |
| `Standarflow: Create Group` | Nouveau groupe — à la racine, ou imbriqué sous le groupe sélectionné | palette · barre de titre · nœud `group` |
| `Standarflow: Delete Group` | Supprime le groupe ; les groupes imbriqués, sessions, artefacts, fichiers liés et liens partent en cascade. **Les fichiers sur le disque ne sont pas supprimés.** | nœud `group` |

## Sessions & artefacts

Une **session** est un carnet de travail de premier niveau. Un **artefact** est
une session imbriquée sous une autre session. Les mêmes commandes valent pour
les deux — voir [concepts](./concepts.md).

| Commande | Ce qu'elle fait | Où |
| --- | --- | --- |
| `Standarflow: Save Session` | Nouvelle session dans le groupe choisi. Si une session est sélectionnée, propose de l'enchaîner (un lien `continues` qui bascule la précédente en `superseded`). Le corps vient de l'éditeur markdown actif ou d'une saisie en ligne. | palette · nœud `group` / `session` |
| `Standarflow: Open Session` | Ouvre la session dans la visionneuse webview | palette · clic dans l'arbre |
| `Standarflow: Edit Session Body` | Ouvre le corps dans un éditeur markdown non titré ; à l'enregistrement, il est réappliqué | nœud `session` / `artefact` |
| `Standarflow: Rename Session` | Change le slug | nœud `session` / `artefact` |
| `Standarflow: Change Session Kind` | Définit le type — `session`, `adr`, `note`, `memory`, `design`, … (texte libre) | nœud `session` / `artefact` |
| `Standarflow: Change Session Status` | Choisit `active` / `completed` / `superseded` / `archived` / `paused` | nœud `session` / `artefact` |
| `Standarflow: Move Session to Group` | Déplace la session sous un autre groupe | nœud `session` / `artefact` |
| `Standarflow: Reparent Session` | Choisit une nouvelle session parente, ou « top-level » pour l'enlever — transforme une session en artefact ou l'inverse | nœud `session` / `artefact` |
| `Standarflow: Delete Session` | Suppression définitive. Cascade aux artefacts, fichiers liés et liens. Les fichiers sur le disque ne sont pas supprimés. | nœud `session` / `artefact` |

Cliquer une session ou un artefact ouvre la **visionneuse webview** : le corps
rendu, les fichiers liés avec aperçu `.md` en ligne, les liens entrants /
sortants, et deux panneaux d'audit — **Conversations** (quels chats l'ont
touchée) et **File changes** (les modifications de fichiers).

## Conversations & focus

Une **conversation** est un chat IA. Le **focus** épingle une conversation sur
une session : une fois focalisée, les fichiers que la conversation touche via
les hooks se rattachent à cette session. Voir [automation](./automation.md).

| Commande | Ce qu'elle fait | Où |
| --- | --- | --- |
| `Standarflow: Focus a Conversation Here` | Depuis une session, choisit une conversation active à focaliser dessus | nœud `session` / `artefact` |
| `Standarflow: Focus Conversation on Session…` | Depuis une conversation, choisit la session à focaliser | nœud `conversation` · palette |
| `Standarflow: Adopt Current Session` | Focalise en un clic une conversation sur la session courante du workspace | nœud `conversation` sans focus |
| `Standarflow: Clear Conversation Focus` | Retire le focus d'une conversation | nœud `conversation` focalisé |
| `Standarflow: Rename Conversation` | Donne un libellé lisible à une conversation | nœud `conversation` |
| `Standarflow: Kill Conversation Agent` | Arrête le processus agent derrière une conversation | nœud `conversation` |
| `Standarflow: Kill Ghost Conversation Agents` | Arrête tous les agents « fantômes » — vivants mais silencieux depuis leur démarrage | nœud racine des conversations |

## Fichiers liés

| Commande | Ce qu'elle fait | Où |
| --- | --- | --- |
| `Standarflow: Attach File to Session` | Choisit un fichier et le rattache avec un rôle (`memory` / `note` / `attachment` / `source` / personnalisé) et une description optionnelle | palette · nœud `session` |
| `Standarflow: Import Memory Folder` | Parcourt un dossier et rattache chaque fichier d'une extension donnée (`.md` par défaut) avec le rôle `memory` | palette · nœud `session` |
| `Standarflow: Claim File Reference` | Met le `created_by` du fichier lié sur cette extension | nœud `fileRef` |
| `Standarflow: Detach File Reference` | Retire le fichier lié. **Le fichier sur le disque n'est pas touché.** | nœud `fileRef` |
| `Standarflow: Delete File Reference and Source` | Supprime le fichier sur le disque **et** détache le lien. Double confirmation. | nœud `fileRef` |

## Copier dans le presse-papier

| Commande | Ce qu'elle fait | Où |
| --- | --- | --- |
| `Standarflow: Copy Session Reference` | Copie `groupe/chemin/slug` | nœud `session` / `artefact` |
| `Standarflow: Copy Session Slug` | Copie le slug | nœud `session` / `artefact` |
| `Standarflow: Copy Group Path` | Copie le chemin du groupe | nœud `group` · `session` / `artefact` |
| `Standarflow: Copy File Path` | Copie le chemin du fichier lié | nœud `fileRef` |

## Brancher les agents IA

| Commande | Ce qu'elle fait | Où |
| --- | --- | --- |
| `Standarflow: Generate .mcp.json` | Écrit (ou complète) une entrée de serveur MCP Standarflow dans `${workspaceFolder}/.mcp.json`, pour que Claude Code / Cursor / tout agent compatible MCP lise la même base | palette |
| `Standarflow: Install Claude Code Hooks` | Lance `standarflow hooks install` pour brancher les hooks Claude Code — choisis **ce workspace** ou **tous les projets**. L'activité de chaque chat alimente alors standarflow. Voir [automation](./automation.md). | palette |
