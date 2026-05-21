[English](../en/mcp-tools.md) · [↑ Documentation](../README.md)

# Les outils MCP de standarflow

> Guide pour comprendre — **sans être développeur** — ce que ton assistant IA
> sait faire avec standarflow.

## C'est quoi, en deux phrases ?

standarflow donne à ton assistant IA une **mémoire de travail** : des dossiers,
des carnets, des fichiers rattachés. Le **MCP**, c'est le canal par lequel l'IA
parle à cette mémoire — elle peut y ranger des choses, les relire et les
organiser, toute seule.

Toi, tu ne tapes **jamais** ces outils à la main. Tu parles normalement à l'IA
— « note ça quelque part », « reprends où on en était » — et **c'est elle qui
choisit le bon outil**. Ce guide sert juste à savoir ce qu'elle a sous la main.

## Les mots à connaître

- **Un groupe** = un dossier. Il range des carnets, et peut contenir d'autres
  groupes (comme des sous-dossiers).
- **Une session** = un carnet de travail sur un sujet. Un titre, un texte (ce
  qui a été fait, ce qui reste), un état (en cours, terminée…).
- **Un artefact** = une note rangée dans un carnet (une décision, un mémo…).
  C'est une session, en plus petit.
- **Un fichier lié** = un fichier de ton projet rattaché à un carnet, pour dire
  « ce fichier compte pour ce travail ».
- **Le focus** = le carnet sur lequel ta conversation actuelle travaille. C'est
  ce qui permet à l'IA de retrouver le bon carnet à chaque fois.

## À quoi ça ressemble, en vrai

> 🧑 **Toi** — « On a fini la refonte du login. Note-le et dis ce qui reste. »
>
> 🤖 **L'IA** — *range une session « refonte login » dans le bon dossier, écrit
> le bilan et la liste des restes* → « C'est noté dans `backend/auth`. »
>
> *(Le lendemain, nouvelle conversation.)*
>
> 🧑 **Toi** — « On reprend le login. »
>
> 🤖 **L'IA** — *relit le carnet « refonte login »* → « On en était là : … il
> reste … »

Tu n'as rien fait de technique. L'IA a juste utilisé les outils ci-dessous.

## Comment lire la suite

Chaque outil tient en trois lignes :

- **Ça sert à quoi** — en clair.
- **Tu dirais quoi** — une phrase que tu pourrais lancer dans le chat.
- **Ce qui se passe** — ce que l'IA fait, et ce que tu obtiens.

---

## 🗂️ Les groupes — ranger le travail

### `group_create` — Créer un dossier

**Ça sert à quoi.** Créer un nouveau dossier pour y ranger des carnets. On peut
le placer dans un autre dossier pour faire des sous-dossiers.

**Tu dirais quoi.** « Crée un dossier *backend* pour le travail serveur. »

**Ce qui se passe.** L'IA crée le dossier `backend`. Ensuite, tous les carnets
sur le serveur peuvent y vivre. Si tu demandes un dossier *auth* « dans
backend », elle crée `backend/auth`.

### `group_list` — Voir les dossiers

**Ça sert à quoi.** Lister les dossiers qui existent — ceux du premier niveau,
ou ceux rangés dans un dossier précis.

**Tu dirais quoi.** « Il y a quoi comme dossiers ? »

**Ce qui se passe.** L'IA te montre la liste — `backend`, `frontend`, `docs`…
Pratique pour savoir où ranger quelque chose, ou simplement t'y retrouver.

### `group_delete` — Supprimer un dossier

**Ça sert à quoi.** Supprimer un dossier. ⚠️ Tout ce qu'il contient (carnets,
fichiers liés) disparaît avec lui. En revanche, **tes vrais fichiers sur le
disque ne sont pas touchés** — seul le rangement standarflow est effacé.

**Tu dirais quoi.** « Supprime le dossier *brouillon*, on n'en a plus besoin. »

**Ce qui se passe.** L'IA supprime `brouillon` et tout son contenu rangé. À
réserver à un pan de travail vraiment clos.

---

## 📝 Les sessions — les carnets de travail

### `session_save` — Créer un carnet

**Ça sert à quoi.** Créer un nouveau carnet de travail sur un sujet. Tu peux
dire qu'il fait suite à un carnet précédent : l'ancien est alors marqué comme
« remplacé », et la continuité du travail est gardée.

**Tu dirais quoi.** « Note ce qu'on vient de faire dans un nouveau carnet. »

**Ce qui se passe.** L'IA crée le carnet — titre, bilan, ce qui reste à faire —
dans le bon dossier. Si c'est la suite d'un travail, elle l'enchaîne au carnet
d'avant pour garder le fil.

### `session_get` — Ouvrir un carnet

**Ça sert à quoi.** Relire un carnet précis, ou simplement le dernier carnet en
date d'un dossier.

**Tu dirais quoi.** « Reprends où on en était sur l'auth. »

**Ce qui se passe.** L'IA rouvre le carnet et te résume où vous en étiez : ce
qui est fait, ce qui reste, les décisions prises.

### `session_list` — Lister les carnets

**Ça sert à quoi.** Voir tous les carnets d'un dossier, du plus récent au plus
ancien. On peut filtrer par mot.

**Tu dirais quoi.** « Montre-moi tous les carnets du dossier backend. »

**Ce qui se passe.** L'IA affiche la liste, avec l'état de chacun (en cours,
terminé…).

### `session_children` — Voir les notes d'un carnet

**Ça sert à quoi.** Lister les notes (artefacts) rangées à l'intérieur d'un
carnet — décisions, mémos…

**Tu dirais quoi.** « Quelles décisions on a notées sur ce sujet ? »

**Ce qui se passe.** L'IA liste les notes rattachées au carnet.

### `session_update` — Modifier un carnet

**Ça sert à quoi.** Mettre à jour un carnet : son texte, son titre, son état,
ou le déplacer dans un autre dossier, ou le renommer.

**Tu dirais quoi.** « Marque le carnet login comme terminé. »

**Ce qui se passe.** L'IA change uniquement ce que tu demandes — ici l'état
passe à « terminé » — sans toucher au reste.

### `session_delete` — Supprimer un carnet

**Ça sert à quoi.** Supprimer un carnet. ⚠️ Ses notes, ses fichiers liés et ses
liens partent avec lui. **Tes vrais fichiers sur le disque, eux, restent.**

**Tu dirais quoi.** « Supprime le carnet de test qu'on avait bricolé. »

**Ce qui se passe.** L'IA efface le carnet et tout son contenu rangé.

### `session_file_changes` — Voir les fichiers touchés

**Ça sert à quoi.** Voir la liste des fichiers modifiés pendant un travail.
Cette liste se remplit toute seule, au fil de ce que l'IA fait.

**Tu dirais quoi.** « Quels fichiers on a touchés sur ce carnet ? »

**Ce qui se passe.** L'IA te montre les fichiers créés, modifiés ou supprimés,
avec le moment et l'outil utilisé.

### `session_participants` — Qui a travaillé ici

**Ça sert à quoi.** Voir quelles conversations (chats) sont passées travailler
dans un carnet.

**Tu dirais quoi.** « Qui a bossé sur ce carnet ? »

**Ce qui se passe.** L'IA liste les conversations concernées, la plus récente
d'abord.

---

## 🔗 Les liens — relier les carnets entre eux

### `link_add` — Relier deux carnets

**Ça sert à quoi.** Créer un lien entre deux carnets, avec un type au choix —
« fait référence à », « corrige », « en rapport avec »…

**Tu dirais quoi.** « Ce carnet corrige le bug décrit dans l'autre, relie-les. »

**Ce qui se passe.** L'IA pose le lien. Plus tard, on peut retrouver l'un
depuis l'autre.

### `link_remove` — Enlever un lien

**Ça sert à quoi.** Défaire un lien entre deux carnets.

**Tu dirais quoi.** « Ces deux carnets n'ont plus rien à voir, enlève le lien. »

**Ce qui se passe.** L'IA retire le lien. Les deux carnets restent intacts —
seul le lien disparaît.

### `link_of` — Voir les liens d'un carnet

**Ça sert à quoi.** Voir tous les carnets reliés à un carnet donné, dans les
deux sens (ceux qu'il pointe, et ceux qui le pointent).

**Tu dirais quoi.** « Ce carnet est lié à quoi ? »

**Ce qui se passe.** L'IA liste les carnets reliés et le type de chaque lien,
pour pouvoir naviguer de l'un à l'autre.

---

## 📎 Les fichiers — rattacher des fichiers au travail

### `file_attach` — Rattacher un fichier

**Ça sert à quoi.** Rattacher un fichier de ton projet à un carnet, pour dire
« ce fichier compte pour ce travail ».

**Tu dirais quoi.** « Rattache le fichier de config à ce carnet. »

**Ce qui se passe.** L'IA lie le fichier au carnet, avec si besoin un rôle et
une petite description.

### `file_list` — Voir les fichiers d'un carnet

**Ça sert à quoi.** Lister les fichiers rattachés à un carnet.

**Tu dirais quoi.** « Quels fichiers sont liés à ce carnet ? »

**Ce qui se passe.** L'IA affiche la liste des fichiers liés.

### `file_read` — Lire un fichier lié

**Ça sert à quoi.** Lire le contenu actuel d'un fichier rattaché, directement
depuis le disque.

**Tu dirais quoi.** « Montre-moi le contenu du fichier de config lié. »

**Ce qui se passe.** L'IA ouvre le fichier et te montre ce qu'il contient
maintenant.

### `file_remove` — Détacher un fichier

**Ça sert à quoi.** Enlever le lien entre un fichier et un carnet. Le fichier
sur le disque n'est **pas** supprimé.

**Tu dirais quoi.** « Ce fichier n'a plus rien à voir avec ce carnet,
détache-le. »

**Ce qui se passe.** L'IA retire le lien. Ton fichier reste intact sur le
disque.

### `file_claim` — Remettre un fichier à ton nom

**Ça sert à quoi.** Réattribuer un fichier lié à l'auteur actuel. Utile quand
un fichier a été rattaché automatiquement ou par quelqu'un d'autre.

**Tu dirais quoi.** « Ce fichier a été rattaché tout seul, mets-le à mon nom. »

**Ce qui se passe.** L'IA change l'auteur du lien pour le client actuel.

### `file_delete_with_source` — Supprimer un fichier lié ET le vrai fichier

**Ça sert à quoi.** ⚠️ Le seul outil qui touche un **vrai fichier sur le
disque** : il supprime le lien **et** le fichier. Si le fichier avait déjà
disparu, le lien est quand même retiré.

**Tu dirais quoi.** « Supprime ce fichier de brouillon, et son rattachement. »

**Ce qui se passe.** L'IA efface le fichier du disque et retire le lien. À
utiliser en connaissance de cause.

### `memory_import` — Importer un dossier de notes

**Ça sert à quoi.** Parcourir un dossier et rattacher d'un coup tous ses
fichiers d'un certain type (les `.md` par défaut) à un carnet.

**Tu dirais quoi.** « Importe toutes mes notes du dossier docs/ dans ce
carnet. »

**Ce qui se passe.** L'IA balaye le dossier et rattache chaque fichier trouvé.
Pratique pour récupérer une mémoire de notes déjà existante.

---

## 🎯 Le focus & les conversations

Le **focus**, c'est ce qui dit « cette conversation travaille sur ce
carnet-là ». Une fois posé, l'IA range automatiquement au bon endroit ce
qu'elle fait — sans que tu aies à le répéter à chaque message.

### `session_focus` — Choisir le carnet de la conversation

**Ça sert à quoi.** Dire « cette conversation travaille sur ce carnet ».
Ensuite, les fichiers que l'IA modifie sont rattachés tout seuls à ce carnet.
Le choix tient même si le serveur redémarre.

**Tu dirais quoi.** « On bosse sur le carnet refonte-login, focus dessus. »

**Ce qui se passe.** L'IA épingle le carnet à la conversation. Tout ce qui suit
est attribué à ce travail.

### `session_unfocus` — Lâcher le carnet

**Ça sert à quoi.** Retirer le carnet épinglé à une conversation.

**Tu dirais quoi.** « On change complètement de sujet, enlève le focus. »

**Ce qui se passe.** L'IA retire l'épingle. La conversation n'est plus
rattachée à aucun carnet.

### `session_focused` — Sur quel carnet on est ?

**Ça sert à quoi.** Savoir quel carnet la conversation actuelle suit. Si elle
n'en a pas encore, standarflow propose le carnet « courant » de l'espace de
travail.

**Tu dirais quoi.** « On travaille sur quoi, là ? »

**Ce qui se passe.** L'IA te dit le carnet suivi — ou la suggestion à adopter
si rien n'est encore épinglé.

### `focus_adopt` — Reprendre le carnet courant

**Ça sert à quoi.** Au début d'une nouvelle conversation, reprendre
automatiquement le carnet sur lequel le travail en cours se trouve — sans avoir
à le nommer.

**Tu dirais quoi.** (souvent fait tout seul au démarrage) « Reprends le travail
en cours. »

**Ce qui se passe.** L'IA adopte le carnet courant de l'espace de travail. Si
la conversation avait déjà un carnet, rien ne change.

### `focus_list` — Qui travaille sur quoi

**Ça sert à quoi.** Voir, pour toutes les conversations, le carnet que chacune
suit.

**Tu dirais quoi.** « Montre-moi quelle conversation est sur quel carnet. »

**Ce qui se passe.** L'IA — ou l'extension VSCode — affiche la carte des
focus : une ligne par conversation.

### `conversation_get` — Infos d'une conversation

**Ça sert à quoi.** Récupérer les infos d'une conversation (un chat) — par
défaut, celle en cours.

**Tu dirais quoi.** « C'est quoi cette conversation, déjà ? »

**Ce qui se passe.** L'IA te donne les infos de la conversation.

### `conversation_list` — Lister les conversations

**Ça sert à quoi.** Lister les chats connus de l'espace de travail, le plus
actif d'abord. Chacun indique s'il est encore en vie (son agent tourne
toujours).

**Tu dirais quoi.** « Quelles conversations ont tourné sur ce projet ? »

**Ce qui se passe.** L'IA liste les chats, en signalant ceux encore actifs.

### `conversation_set_label` — Renommer une conversation

**Ça sert à quoi.** Donner un nom lisible à une conversation, au lieu d'un
identifiant. On peut aussi l'enlever pour revenir au nom automatique.

**Tu dirais quoi.** « Appelle cette conversation *refonte paiement*. »

**Ce qui se passe.** L'IA donne ce nom à la conversation — plus facile à
reconnaître dans la liste.

---

## 🩺 Diagnostic — en cas de pépin

### `workspace_info` — État de l'espace de travail

**Ça sert à quoi.** Avoir un état des lieux : combien de dossiers, de carnets,
de fichiers liés, où est rangée la base de données, et si c'est un tout premier
démarrage.

**Tu dirais quoi.** « Donne-moi l'état de standarflow. »

**Ce qui se passe.** L'IA affiche le résumé chiffré. Pratique pour vérifier que
tout est bien branché.

### `debug_env` — Rapport technique

**Ça sert à quoi.** Un outil de dépannage. Il dresse l'état technique du
serveur (processus, variables d'environnement…). Tu n'en auras quasiment
jamais besoin.

**Tu dirais quoi.** « standarflow déconne, sors le diagnostic. »

**Ce qui se passe.** L'IA produit un rapport technique — surtout utile à
montrer à un développeur si quelque chose cloche.

---

*Tu n'as pas à retenir ces noms : tu parles normalement, l'IA choisit l'outil.
Ce guide est là pour lever le mystère sur ce qui se passe en coulisses.*

