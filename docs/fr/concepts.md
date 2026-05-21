[English](../en/concepts.md) · [↑ Documentation](../README.md)

# Concepts

Standarflow donne une mémoire à ton travail avec l'IA. Tout tient dans un seul
petit fichier SQLite — `${workspaceFolder}/.standarflow/standarflow.db` par
défaut — partagé par l'extension VS Code, la CLI `standarflow`, et n'importe
quel agent compatible MCP. Chaque ligne retient quel client l'a écrite.

Voici les sept mots à connaître.

## Groupe

Un dossier. Il range tes sessions, et les groupes s'imbriquent — `backend`,
`backend/auth` — pour trier le travail par projet, sujet ou agent. Supprime un
groupe et tout ce qu'il contient part avec lui.

## Session

L'unité de base — un carnet de travail sur un sujet. Un titre, un corps en
markdown, un type, un état. Vois-la comme le compte rendu d'une session de
travail : ce qui a été fait, ce qu'il reste.

## Artefact

Une session glissée dans une autre session. Pour une décision, un mémo ou une
note qui appartient à une session plus large. Même forme qu'une session —
mêmes commandes, même visionneuse — juste imbriquée.

## Fichier lié

Un pointeur d'une session vers un vrai fichier de ton projet. Il stocke le
chemin, un rôle (`memory`, `note`, `attachment`, `source`, ou le tien) et une
description optionnelle — jamais le contenu. Le fichier reste la source de
vérité sur le disque ; détacher un lien ne le supprime jamais.

## Lien

Une flèche typée entre deux sessions : `continues`, `supersedes`,
`references`, `fixes`, `relates_to`, ou une relation que tu nommes.
Enregistrer une session qui en *continue* une autre trace un lien `continues`
et bascule l'ancienne en `superseded` — une chaîne de sessions se relit alors
comme un historique.

## Conversation

Un chat IA — une session Claude Code ou Cursor — reconnu par l'identifiant
stable que lui donne son fournisseur. Standarflow découvre les conversations
via les événements de hook : quand l'une a démarré, sa dernière activité, si
son processus agent tourne encore.

## Focus

Une épingle d'une conversation vers une session. Tant qu'une conversation est
focalisée, les fichiers qu'elle touche (rapportés par les hooks) se rattachent
seuls à cette session. Le focus est par conversation : deux chats dans le même
workspace ne se marchent jamais dessus.

---

## Deux choses de plus

**État** — une session suit un cycle de vie : `active`, `completed`,
`superseded`, `archived`, `paused`. `superseded` est posé pour toi quand une
autre session la continue.

**Type (`kind`)** — texte libre décrivant ce qu'*est* une session : `session`
(par défaut), `adr`, `note`, `memory`, `design`, `debug`, `spec`, ou ce que tu
veux.

Tu débutes ? Le démarrage rapide du [README](../../README.md) te fait créer
ton premier groupe, ta première session et brancher les hooks en deux minutes.
