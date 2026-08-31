# Two-Pane Navigator

An Obsidian plugin that replaces the left-dock file tree with a two-pane
navigator: a stable folder pane and a rich file list. Built from the
`design_handoff_two_pane_navigator` handoff.

The tree it replaces has five problems: endless scrolling, losing your place
after clicking around, hard to move files between folders, everything looks
the same, and folders mixed in with files.

## What it does

- **Folder pane (214px)** — a map of the vault you learn by muscle memory.
  It never reflows when a note opens. Top-level folders in tracked mono
  uppercase; children in Inter mixed case. Color-coded markers and selection
  spines per top-level folder.
- **File pane** — every note in the selected folder, nothing else. Serif
  titles, mono metadata (relative date, size), first-line snippet, date
  group headers (Today / This week / This month / This year / Earlier),
  in-folder filter, Recent/Name/Size sort persisted per folder.
- **Move files** — drag a note by its `⠿` grip onto a folder row, or
  `⌘⌥→` to move the selected note into the folder highlighted in the
  folder pane.
- **Keyboard** — up/down in the file list, left to the folder pane, right
  to the editor.
- **Four themes, whole-interface** — Macchiato (Catppuccin), Racing
  (British racing green), Ink (amber on cool near-black), Paper (light).
  The theme is stamped on `<body>` and skins the entire app — editor,
  tabs, ribbon, status bar, sidebars — by overriding the design-system
  snippet's `--jd-*` palette plus Obsidian core and Minimal tokens
  directly, in both base color modes. Pick in settings; switches live.

> **pseudo-mica conflict:** the pseudo-mica plugin punches the window
> chrome through to the desktop wallpaper at the native layer, which no
> theme CSS can paint over. Disable it or the frame stays wallpaper-dark.

## Settings

| Setting | Default | Effect |
|---|---|---|
| Theme | Macchiato | Palette for the navigator panes |
| Color-code folders | on | Folder hues on markers and spines |
| Group by date | on | Date group headers when sorted by Recent |
| Show snippets | on | First-line excerpt under each file name |

## Install

Via [BRAT](https://github.com/TfTHacker/obsidian42-brat): add
`amishrobot/obsidian-two-pane-navigator`. Or copy `manifest.json`,
`main.js`, and `styles.css` into
`<vault>/.obsidian/plugins/two-pane-navigator/`.

Fonts: the design uses Libre Baskerville, Inter, and JetBrains Mono, with
system fallbacks if they aren't installed.

## Develop

```bash
npm install
npm run dev      # watch build
npm run build    # production build
bash release.sh 0.2.0 "What changed"   # BRAT release
```
