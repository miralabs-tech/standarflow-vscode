[Français](../fr/mcp-tools.md) · [↑ Documentation](../README.md)

# standarflow's MCP tools

> A guide to understand — **without being a developer** — what your AI
> assistant can do with standarflow.

## What is it, in two sentences?

standarflow gives your AI assistant a **working memory**: folders, notebooks,
attached files. **MCP** is the channel the AI uses to talk to that memory — it
can store things there, re-read them and organise them, all on its own.

You **never** type these tools by hand. You talk to the AI normally — "note
this somewhere", "pick up where we left off" — and **it chooses the right
tool**. This guide is just so you know what it has at hand.

## The words to know

- **A group** = a folder. It holds notebooks, and can contain other groups
  (like sub-folders).
- **A session** = a working notebook on a topic. A title, a body of text (what
  was done, what is left), a status (in progress, done…).
- **An artefact** = a note filed inside a notebook (a decision, a memo…). It's
  a session, in smaller form.
- **A linked file** = a file from your project attached to a notebook, to say
  "this file matters for this work".
- **Focus** = the notebook your current conversation is working on. It's what
  lets the AI find the right notebook every time.

## What it looks like, for real

> 🧑 **You** — "We finished the login rework. Note it and say what's left."
>
> 🤖 **The AI** — *files a "login rework" session in the right folder, writes
> the summary and the to-do list* → "It's noted in `backend/auth`."
>
> *(The next day, a new conversation.)*
>
> 🧑 **You** — "Let's get back to the login."
>
> 🤖 **The AI** — *re-reads the "login rework" notebook* → "Here's where we
> were: … what's left is …"

You did nothing technical. The AI just used the tools below.

## How to read the rest

Each tool fits in three lines:

- **What it's for** — in plain words.
- **You'd say** — a sentence you could drop in the chat.
- **What happens** — what the AI does, and what you get.

---

## 🗂️ Groups — sorting the work

### `group_create` — Create a folder

**What it's for.** Create a new folder to file notebooks in. It can be placed
inside another folder to make sub-folders.

**You'd say.** "Create a *backend* folder for the server work."

**What happens.** The AI creates the `backend` folder. From then on, every
notebook about the server can live there. Ask for an *auth* folder "inside
backend" and it creates `backend/auth`.

### `group_list` — See the folders

**What it's for.** List the folders that exist — the top-level ones, or the
ones filed inside a specific folder.

**You'd say.** "What folders do we have?"

**What happens.** The AI shows you the list — `backend`, `frontend`, `docs`…
Handy to know where to file something, or just to find your way around.

### `group_delete` — Delete a folder

**What it's for.** Delete a folder. ⚠️ Everything it contains (notebooks,
linked files) disappears with it. Your **real files on disk are not
touched** — only the standarflow filing is erased.

**You'd say.** "Delete the *draft* folder, we don't need it anymore."

**What happens.** The AI deletes `draft` and all its filed contents. Best kept
for a chunk of work that is truly closed.

---

## 📝 Sessions — the working notebooks

### `session_save` — Create a notebook

**What it's for.** Create a new working notebook on a topic. You can say it
follows on from a previous notebook: the old one is then marked "superseded",
and the continuity of the work is kept.

**You'd say.** "Note what we just did in a new notebook."

**What happens.** The AI creates the notebook — title, summary, what's left to
do — in the right folder. If it's the continuation of earlier work, it chains
it to the previous notebook to keep the thread.

### `session_get` — Open a notebook

**What it's for.** Re-read a specific notebook, or simply the latest notebook
in a folder.

**You'd say.** "Pick up where we were on the auth."

**What happens.** The AI reopens the notebook and sums up where you were: what
is done, what is left, the decisions made.

### `session_list` — List the notebooks

**What it's for.** See every notebook in a folder, newest to oldest. You can
filter by a word.

**You'd say.** "Show me every notebook in the backend folder."

**What happens.** The AI shows the list, with the status of each (in progress,
done…).

### `session_children` — See a notebook's notes

**What it's for.** List the notes (artefacts) filed inside a notebook —
decisions, memos…

**You'd say.** "What decisions did we note on this topic?"

**What happens.** The AI lists the notes attached to the notebook.

### `session_update` — Edit a notebook

**What it's for.** Update a notebook: its text, its title, its status, or move
it to another folder, or rename it.

**You'd say.** "Mark the login notebook as done."

**What happens.** The AI changes only what you ask — here the status flips to
"done" — without touching the rest.

### `session_delete` — Delete a notebook

**What it's for.** Delete a notebook. ⚠️ Its notes, linked files and links go
with it. **Your real files on disk stay put.**

**You'd say.** "Delete the test notebook we cobbled together."

**What happens.** The AI erases the notebook and all its filed contents.

### `session_file_changes` — See the files touched

**What it's for.** See the list of files modified during a piece of work. This
list fills itself in, as the AI works.

**You'd say.** "Which files did we touch on this notebook?"

**What happens.** The AI shows you the files created, modified or deleted, with
the time and the tool used.

### `session_participants` — Who worked here

**What it's for.** See which conversations (chats) came to work in a notebook.

**You'd say.** "Who worked on this notebook?"

**What happens.** The AI lists the conversations involved, most recent first.

---

## 🔗 Links — connecting notebooks to each other

### `link_add` — Link two notebooks

**What it's for.** Create a link between two notebooks, with a type of your
choice — "references", "fixes", "relates to"…

**You'd say.** "This notebook fixes the bug described in the other one, link
them."

**What happens.** The AI sets the link. Later, you can find one from the
other.

### `link_remove` — Remove a link

**What it's for.** Undo a link between two notebooks.

**You'd say.** "These two notebooks have nothing to do with each other
anymore, remove the link."

**What happens.** The AI removes the link. Both notebooks stay intact — only
the link goes.

### `link_of` — See a notebook's links

**What it's for.** See every notebook linked to a given notebook, both ways
(the ones it points at, and the ones that point at it).

**You'd say.** "What is this notebook linked to?"

**What happens.** The AI lists the linked notebooks and the type of each link,
so you can navigate from one to another.

---

## 📎 Files — attaching files to the work

### `file_attach` — Attach a file

**What it's for.** Attach a file from your project to a notebook, to say "this
file matters for this work".

**You'd say.** "Attach the config file to this notebook."

**What happens.** The AI links the file to the notebook, with a role and a
short description if needed.

### `file_list` — See a notebook's files

**What it's for.** List the files attached to a notebook.

**You'd say.** "Which files are linked to this notebook?"

**What happens.** The AI shows the list of linked files.

### `file_read` — Read a linked file

**What it's for.** Read the current content of an attached file, straight from
disk.

**You'd say.** "Show me the content of the linked config file."

**What happens.** The AI opens the file and shows you what it contains right
now.

### `file_remove` — Detach a file

**What it's for.** Remove the link between a file and a notebook. The file on
disk is **not** deleted.

**You'd say.** "This file has nothing to do with this notebook anymore, detach
it."

**What happens.** The AI removes the link. Your file stays intact on disk.

### `file_claim` — Put a file back under your name

**What it's for.** Reassign a linked file to the current author. Useful when a
file was attached automatically or by someone else.

**You'd say.** "This file was attached on its own, put it under my name."

**What happens.** The AI changes the link's author to the current client.

### `file_delete_with_source` — Delete a linked file AND the real file

**What it's for.** ⚠️ The only tool that touches a **real file on disk**: it
deletes the link **and** the file. If the file was already gone, the link is
removed anyway.

**You'd say.** "Delete this draft file, and its attachment."

**What happens.** The AI erases the file from disk and removes the link. Use
knowingly.

### `memory_import` — Import a folder of notes

**What it's for.** Walk a folder and attach, in one go, every file of a certain
type (`.md` by default) to a notebook.

**You'd say.** "Import all my notes from the docs/ folder into this notebook."

**What happens.** The AI sweeps the folder and attaches every file found.
Handy to bring in an existing memory of notes.

---

## 🎯 Focus & conversations

**Focus** is what says "this conversation is working on that notebook". Once
set, the AI files what it does in the right place automatically — without you
having to repeat it every message.

### `session_focus` — Choose the conversation's notebook

**What it's for.** Say "this conversation works on this notebook". After that,
the files the AI modifies are attached to that notebook on their own. The
choice holds even if the server restarts.

**You'd say.** "We're working on the login-rework notebook, focus on it."

**What happens.** The AI pins the notebook to the conversation. Everything that
follows is attributed to that work.

### `session_unfocus` — Let go of the notebook

**What it's for.** Remove the notebook pinned to a conversation.

**You'd say.** "We're switching topics completely, drop the focus."

**What happens.** The AI removes the pin. The conversation is no longer tied to
any notebook.

### `session_focused` — Which notebook are we on?

**What it's for.** Know which notebook the current conversation follows. If it
has none yet, standarflow suggests the workspace's "current" notebook.

**You'd say.** "What are we working on right now?"

**What happens.** The AI tells you the notebook being followed — or the
suggestion to adopt if nothing is pinned yet.

### `focus_adopt` — Pick up the current notebook

**What it's for.** At the start of a new conversation, automatically pick up
the notebook the work in progress sits on — without having to name it.

**You'd say.** (often done on its own at startup) "Pick up the work in
progress."

**What happens.** The AI adopts the workspace's current notebook. If the
conversation already had a notebook, nothing changes.

### `focus_list` — Who is working on what

**What it's for.** See, for every conversation, the notebook each one follows.

**You'd say.** "Show me which conversation is on which notebook."

**What happens.** The AI — or the VS Code extension — shows the focus map: one
line per conversation.

### `conversation_get` — A conversation's info

**What it's for.** Get the info of a conversation (a chat) — by default, the
current one.

**You'd say.** "What is this conversation again?"

**What happens.** The AI gives you the conversation's info.

### `conversation_list` — List the conversations

**What it's for.** List the chats known to the workspace, most active first.
Each one shows whether it's still alive (its agent still running).

**You'd say.** "Which conversations have run on this project?"

**What happens.** The AI lists the chats, flagging the ones still active.

### `conversation_set_label` — Rename a conversation

**What it's for.** Give a conversation a readable name instead of an id. You
can also clear it to go back to the automatic name.

**You'd say.** "Call this conversation *payment rework*."

**What happens.** The AI gives the conversation that name — easier to spot in
the list.

---

## 🩺 Diagnostics — when something goes wrong

### `workspace_info` — Workspace state

**What it's for.** Get a status report: how many folders, notebooks, linked
files, where the database is stored, and whether this is a first run.

**You'd say.** "Give me the standarflow status."

**What happens.** The AI shows the figures. Handy to check everything is wired
up.

### `debug_env` — Technical report

**What it's for.** A troubleshooting tool. It draws up the server's technical
state (process, environment variables…). You'll almost never need it.

**You'd say.** "standarflow is acting up, pull the diagnostics."

**What happens.** The AI produces a technical report — mostly useful to show a
developer if something is off.

---

*You don't have to remember these names: you talk normally, the AI picks the
tool. This guide is here to lift the mystery on what happens behind the
scenes.*
