[English](../en/settings.md) · [↑ Documentation](../README.md)

# Réglages

Trois réglages, tous sous le préfixe `standarflow.*`. Édite-les depuis
`Standarflow: Open Settings` ou directement dans `settings.json`. Changer l'un
d'eux reconnecte l'extension automatiquement — pas besoin de recharger la
fenêtre.

## `standarflow.binPath`

Où se trouve le binaire `standarflow`.

- **Vide (défaut)** — l'extension télécharge le binaire de ta plateforme au
  premier lancement et le met en cache. Si ce téléchargement échoue, elle se
  rabat sur un `standarflow` présent dans le `PATH`.
- **À renseigner** quand tu as ta propre build et veux que l'extension
  l'utilise — donne le chemin absolu du binaire.

## `standarflow.dbPath`

Où se trouve le fichier de base SQLite.

- **Vide (défaut)** — `${workspaceFolder}/.standarflow/standarflow.db`.
- **À renseigner** pour partager une même base entre plusieurs workspaces, ou
  pour garder la base hors de l'arbre du projet. Le dossier parent est créé à
  la première connexion.

## `standarflow.autoRefreshMs`

À quelle fréquence l'arbre se rafraîchit tout seul, en millisecondes.

- **`0` (défaut)** — pas de rafraîchissement auto ; utilise
  `Standarflow: Refresh Tree` quand tu veux une mise à jour.
- **À renseigner** (ex. `2000`–`5000`) quand un autre agent écrit dans la même
  base en parallèle et que tu veux voir ses changements apparaître seuls. Plus
  bas gaspille, plus haut perd l'intérêt.
