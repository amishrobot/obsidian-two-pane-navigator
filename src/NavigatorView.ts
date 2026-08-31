import {
  ItemView,
  Notice,
  TFile,
  TFolder,
  WorkspaceLeaf,
  setIcon,
} from 'obsidian';
import { ExcerptCache } from './excerpts';
import { hueFor } from './hues';
import { NavigatorSettings, NavigatorState, SortKey } from './types';
import { NewFolderModal } from './NewFolderModal';
import type TwoPaneNavigatorPlugin from './main';

export const VIEW_TYPE_NAVIGATOR = 'two-pane-navigator';

const DAY_MS = 86_400_000;

interface FlatFolder {
  folder: TFolder;
  depth: number;
  top: string; // top-level ancestor name (drives the hue)
  isTop: boolean;
}

export class NavigatorView extends ItemView {
  private plugin: TwoPaneNavigatorPlugin;
  private excerpts: ExcerptCache;

  private foldersScrollEl!: HTMLElement;
  private foldersHeaderSubEl!: HTMLElement;
  private filesEl!: HTMLElement;
  private filesHeaderNameEl!: HTMLElement;
  private filesHeaderCountEl!: HTMLElement;
  private filterInputEl!: HTMLInputElement;
  private sortRowEl!: HTMLElement;
  private filesScrollEl!: HTMLElement;

  private query = '';
  private focusedFolderPath: string | null = null;
  private visibleFolders: FlatFolder[] = [];
  private visibleFiles: TFile[] = [];
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: TwoPaneNavigatorPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.excerpts = new ExcerptCache(this.app);
  }

  getViewType(): string {
    return VIEW_TYPE_NAVIGATOR;
  }

  getDisplayText(): string {
    return 'Navigator';
  }

  getIcon(): string {
    return 'folder-tree';
  }

  private get state(): NavigatorState {
    return this.plugin.state;
  }

  private get settings(): NavigatorSettings {
    return this.plugin.settings;
  }

  async onOpen(): Promise<void> {
    this.buildSkeleton();

    const onVaultChange = (file?: { path: string }) => {
      if (file) this.excerpts.forget(file.path);
      this.scheduleRefresh();
    };
    this.registerEvent(this.app.vault.on('create', onVaultChange));
    this.registerEvent(this.app.vault.on('delete', onVaultChange));
    this.registerEvent(this.app.vault.on('modify', onVaultChange));
    this.registerEvent(
      this.app.vault.on('rename', (file, oldPath) => {
        this.excerpts.forget(oldPath);
        if (this.state.folder === oldPath || this.state.folder.startsWith(oldPath + '/')) {
          this.state.folder = file.path + this.state.folder.slice(oldPath.length);
        }
        if (this.state.file === oldPath) this.state.file = file.path;
        this.scheduleRefresh();
      })
    );
    // Follow files opened elsewhere (quick switcher, links) when they live
    // in the currently selected folder.
    this.registerEvent(
      this.app.workspace.on('file-open', (file) => {
        if (file && file.parent && file.parent.path === this.state.folder && this.state.file !== file.path) {
          this.state.file = file.path;
          this.renderFiles();
        }
      })
    );

    this.render();
  }

  onThemeChange(): void {
    this.applyThemeClass();
    this.render();
  }

  onSettingsChange(): void {
    this.render();
  }

  private applyThemeClass(): void {
    const root = this.contentEl;
    root.removeClasses(['tpn-theme-macchiato', 'tpn-theme-racing', 'tpn-theme-ink', 'tpn-theme-paper']);
    root.addClass(`tpn-theme-${this.settings.theme}`);
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      this.render();
    }, 150);
  }

  // ── Skeleton ────────────────────────────────────────────────────────────

  private buildSkeleton(): void {
    const root = this.contentEl;
    root.empty();
    root.addClass('tpn-root');
    this.applyThemeClass();

    // Folder pane
    const folders = root.createDiv('tpn-folders');
    const fh = folders.createDiv('tpn-folders-header');
    fh.createDiv({ cls: 'tpn-vault-name', text: this.app.vault.getName() });
    this.foldersHeaderSubEl = fh.createDiv('tpn-vault-sub');

    this.foldersScrollEl = folders.createDiv('tpn-folders-scroll');
    this.foldersScrollEl.tabIndex = 0;
    this.foldersScrollEl.addEventListener('keydown', (e) => this.onFolderKeydown(e));

    const ff = folders.createDiv('tpn-folders-footer');
    const newLabel = ff.createSpan({ cls: 'tpn-footer-label', text: 'new folder' });
    const plus = ff.createSpan({ cls: 'tpn-footer-plus', text: '+' });
    const openNewFolder = () => this.promptNewFolder();
    newLabel.addEventListener('click', openNewFolder);
    plus.addEventListener('click', openNewFolder);

    // File pane
    this.filesEl = root.createDiv('tpn-files');
    const header = this.filesEl.createDiv('tpn-files-header');
    const titleRow = header.createDiv('tpn-files-title-row');
    this.filesHeaderNameEl = titleRow.createDiv('tpn-files-title');
    this.filesHeaderCountEl = titleRow.createDiv('tpn-files-count');

    const filterWrap = header.createDiv('tpn-filter');
    const filterIcon = filterWrap.createSpan('tpn-filter-icon');
    setIcon(filterIcon, 'search');
    this.filterInputEl = filterWrap.createEl('input', {
      attr: { placeholder: 'Filter in folder', spellcheck: 'false' },
    });
    this.filterInputEl.addEventListener('input', () => {
      this.query = this.filterInputEl.value;
      this.renderFiles();
    });
    this.filterInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.filterInputEl.value = '';
        this.query = '';
        this.renderFiles();
      } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        this.filesScrollEl.focus();
      }
    });

    this.sortRowEl = header.createDiv('tpn-sorts');

    this.filesScrollEl = this.filesEl.createDiv('tpn-files-scroll');
    this.filesScrollEl.tabIndex = 0;
    this.filesScrollEl.addEventListener('keydown', (e) => this.onFileKeydown(e));

    const footer = this.filesEl.createDiv('tpn-files-footer');
    footer.createSpan({ text: 'drag ⠿ onto a folder to move' });
    footer.createSpan({ text: '⌘⌥→' });
  }

  // ── Data ────────────────────────────────────────────────────────────────

  private topFolders(): TFolder[] {
    const root = this.app.vault.getRoot();
    return root.children
      .filter((c): c is TFolder => c instanceof TFolder)
      .sort((a, b) => (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1));
  }

  private flattenFolders(): FlatFolder[] {
    const out: FlatFolder[] = [];
    const walk = (folder: TFolder, depth: number, top: string) => {
      out.push({ folder, depth, top, isTop: depth === 0 });
      if (depth === 0 && !this.state.expandedTops.includes(folder.name)) return;
      const kids = folder.children
        .filter((c): c is TFolder => c instanceof TFolder)
        .sort((a, b) => (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1));
      for (const kid of kids) walk(kid, depth + 1, top);
    };
    for (const top of this.topFolders()) walk(top, 0, top.name);
    return out;
  }

  private noteCount(folder: TFolder): number {
    let n = 0;
    const walk = (f: TFolder) => {
      for (const c of f.children) {
        if (c instanceof TFolder) walk(c);
        else if (c instanceof TFile && c.extension === 'md') n++;
      }
    };
    walk(folder);
    return n;
  }

  private selectedFolder(): TFolder | null {
    const abs = this.app.vault.getAbstractFileByPath(this.state.folder);
    if (abs instanceof TFolder) return abs;
    const tops = this.topFolders();
    if (tops.length) {
      this.state.folder = tops[0].path;
      return tops[0];
    }
    return null;
  }

  private sortKey(): SortKey {
    return this.state.sortByFolder[this.state.folder] ?? 'modified';
  }

  private filesOf(folder: TFolder): TFile[] {
    let files = folder.children.filter((c): c is TFile => c instanceof TFile);
    const q = this.query.trim().toLowerCase();
    if (q) files = files.filter((f) => f.basename.toLowerCase().includes(q));
    const key = this.sortKey();
    if (key === 'name') files.sort((a, b) => a.basename.localeCompare(b.basename));
    else if (key === 'size') files.sort((a, b) => b.stat.size - a.stat.size);
    else files.sort((a, b) => b.stat.mtime - a.stat.mtime);
    return files;
  }

  // ── Rendering ───────────────────────────────────────────────────────────

  render(): void {
    // Resolve the selected folder first: on a fresh install state.folder is
    // empty and selectedFolder() falls back to the first top-level folder —
    // the folder pane must highlight the same row the file pane shows.
    this.selectedFolder();
    this.renderFolders();
    this.renderFiles();
  }

  private renderFolders(): void {
    const theme = this.settings.theme;
    const colorCode = this.settings.colorCodeFolders;
    const flat = this.flattenFolders();
    this.visibleFolders = flat;

    let folderTotal = 0;
    let noteTotal = 0;
    const walkAll = (f: TFolder) => {
      for (const c of f.children) {
        if (c instanceof TFolder) {
          folderTotal++;
          walkAll(c);
        } else if (c instanceof TFile && c.extension === 'md') noteTotal++;
      }
    };
    walkAll(this.app.vault.getRoot());
    this.foldersHeaderSubEl.setText(
      `${folderTotal.toLocaleString()} folders · ${noteTotal.toLocaleString()} notes`
    );

    this.foldersScrollEl.empty();
    for (const entry of flat) {
      const { folder, depth, top, isTop } = entry;
      const hue = hueFor(theme, top, colorCode);
      const selected = folder.path === this.state.folder;
      const focused = folder.path === this.focusedFolderPath;

      const row = this.foldersScrollEl.createDiv({
        cls: [
          'tpn-folder-row',
          isTop ? 'is-top' : 'is-child',
          selected ? 'is-selected' : '',
          focused ? 'is-focused' : '',
        ].filter(Boolean).join(' '),
      });
      row.style.setProperty('--tpn-hue', hue);
      row.style.paddingLeft = `${12 + depth * 14}px`;
      row.dataset.path = folder.path;

      row.createDiv('tpn-folder-spine');
      row.createDiv('tpn-folder-marker');
      row.createSpan({ cls: 'tpn-folder-name', text: folder.name });
      row.createSpan({ cls: 'tpn-folder-count', text: String(this.noteCount(folder)) });

      row.addEventListener('click', () => this.selectFolder(entry));

      // Drop target for file moves
      row.addEventListener('dragover', (e) => {
        const path = e.dataTransfer?.types.includes('text/plain');
        if (!path) return;
        const dragged = this.draggedFile;
        if (!dragged || dragged.parent?.path === folder.path) return;
        e.preventDefault();
        row.addClass('is-drop-target');
      });
      row.addEventListener('dragleave', () => row.removeClass('is-drop-target'));
      row.addEventListener('drop', async (e) => {
        e.preventDefault();
        row.removeClass('is-drop-target');
        const path = e.dataTransfer?.getData('text/plain');
        if (path) await this.moveFileTo(path, folder);
      });
    }
  }

  private renderFiles(): void {
    const theme = this.settings.theme;
    const colorCode = this.settings.colorCodeFolders;
    const folder = this.selectedFolder();
    this.filesScrollEl.empty();
    this.visibleFiles = [];
    if (!folder) {
      this.filesHeaderNameEl.setText('No folder');
      this.filesHeaderCountEl.setText('');
      return;
    }

    const flat = this.visibleFolders.find((f) => f.folder.path === folder.path);
    const hue = hueFor(theme, flat ? flat.top : folder.name, colorCode);
    this.filesEl.style.setProperty('--tpn-hue', hue);

    this.filesHeaderNameEl.setText(folder.name || this.app.vault.getName());

    const files = this.filesOf(folder);
    this.visibleFiles = files;
    this.filesHeaderCountEl.setText(`${files.length} ${files.length === 1 ? 'note' : 'notes'}`);

    if (this.filterInputEl.value !== this.query) this.filterInputEl.value = this.query;
    this.renderSorts();

    // Selection falls back to the first row when the current selection
    // leaves the filtered list.
    let selectedPath = this.state.file;
    if (!selectedPath || !files.some((f) => f.path === selectedPath)) {
      selectedPath = files.length ? files[0].path : null;
    }

    if (!files.length) {
      const q = this.query.trim();
      const msg = q
        ? `Nothing matches \u201C${q}\u201D in ${folder.name}.`
        : `No notes in ${folder.name}.`;
      this.filesScrollEl.createDiv({ cls: 'tpn-empty', text: msg });
      return;
    }

    const now = Date.now();
    const groups = this.groupFiles(files, now);
    for (const group of groups) {
      const gh = this.filesScrollEl.createDiv('tpn-group-header');
      gh.createSpan({ cls: 'tpn-group-label', text: group.label });
      gh.createDiv('tpn-group-rule');
      gh.createSpan({ cls: 'tpn-group-count', text: String(group.files.length) });
      for (const file of group.files) {
        this.renderFileRow(file, file.path === selectedPath, hue, now);
      }
    }
  }

  private renderSorts(): void {
    this.sortRowEl.empty();
    const current = this.sortKey();
    const options: { key: SortKey; label: string }[] = [
      { key: 'modified', label: 'Recent' },
      { key: 'name', label: 'Name' },
      { key: 'size', label: 'Size' },
    ];
    for (const opt of options) {
      const cell = this.sortRowEl.createDiv({
        cls: `tpn-sort-cell${opt.key === current ? ' is-active' : ''}`,
        text: opt.label,
      });
      cell.addEventListener('click', () => {
        this.state.sortByFolder[this.state.folder] = opt.key;
        this.plugin.persist();
        this.renderFiles();
      });
    }
  }

  private groupFiles(files: TFile[], now: number): { label: string; files: TFile[] }[] {
    const key = this.sortKey();
    if (key === 'name') return [{ label: 'A → Z', files }];
    if (key === 'size') return [{ label: 'Largest first', files }];
    if (!this.settings.groupByDate) return [{ label: 'All notes', files }];

    const order = ['Today', 'This week', 'This month', 'This year', 'Earlier'];
    const buckets = new Map<string, TFile[]>(order.map((l) => [l, []]));
    for (const f of files) {
      const days = Math.floor((now - f.stat.mtime) / DAY_MS);
      const label =
        days <= 1 ? 'Today' :
        days < 7 ? 'This week' :
        days < 31 ? 'This month' :
        days < 365 ? 'This year' : 'Earlier';
      buckets.get(label)!.push(f);
    }
    return order
      .map((label) => ({ label, files: buckets.get(label)! }))
      .filter((g) => g.files.length);
  }

  private draggedFile: TFile | null = null;

  private renderFileRow(file: TFile, selected: boolean, hue: string, now: number): void {
    const row = this.filesScrollEl.createDiv({
      cls: `tpn-file-row${selected ? ' is-selected' : ''}`,
    });
    row.dataset.path = file.path;

    row.createDiv('tpn-file-spine');
    const body = row.createDiv('tpn-file-body');

    const line1 = body.createDiv('tpn-file-line1');
    const name = file.extension === 'md' ? file.basename : file.name;
    line1.createSpan({ cls: 'tpn-file-name', text: name });

    const days = Math.floor((now - file.stat.mtime) / DAY_MS);
    const modifiedToday = new Date(file.stat.mtime).toDateString() === new Date(now).toDateString();
    const inInbox = file.path.startsWith('_inbox/') || file.path.startsWith('_inbox\\');
    if (inInbox && modifiedToday) line1.createSpan('tpn-file-unread');

    const line2 = body.createDiv('tpn-file-line2');
    const when = line2.createSpan({ cls: 'tpn-file-when', text: relativeDate(days) });
    if (modifiedToday) when.addClass('is-today');
    line2.createSpan('tpn-file-dot');
    line2.createSpan({
      cls: 'tpn-file-size',
      text: `${Math.max(1, Math.round(file.stat.size / 1024))} kb`,
    });
    if (this.settings.showSnippets && file.extension === 'md') {
      const snip = line2.createSpan('tpn-file-snippet');
      const cached = this.excerpts.peek(file);
      if (cached !== null) {
        snip.setText(cached);
      } else {
        this.excerpts.get(file).then((text) => {
          if (snip.isConnected) snip.setText(text);
        });
      }
    }

    const grip = row.createSpan({ cls: 'tpn-file-grip', text: '⠿' });
    grip.draggable = true;
    grip.addEventListener('dragstart', (e) => {
      this.draggedFile = file;
      e.dataTransfer?.setData('text/plain', file.path);
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
      this.contentEl.addClass('tpn-dragging');
    });
    grip.addEventListener('dragend', () => {
      this.draggedFile = null;
      this.contentEl.removeClass('tpn-dragging');
      this.contentEl.findAll('.is-drop-target').forEach((el) => el.removeClass('is-drop-target'));
    });

    row.addEventListener('click', () => this.selectFile(file));
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  private selectFolder(entry: FlatFolder): void {
    const path = entry.folder.path;
    if (entry.isTop) {
      const name = entry.folder.name;
      const expanded = this.state.expandedTops.includes(name);
      const hasKids = entry.folder.children.some((c) => c instanceof TFolder);
      if (hasKids) {
        if (this.state.folder === path && expanded) {
          this.state.expandedTops = this.state.expandedTops.filter((n) => n !== name);
        } else if (!expanded) {
          this.state.expandedTops.push(name);
        }
      }
    }
    this.state.folder = path;
    this.state.file = null;
    this.query = '';
    this.focusedFolderPath = path;
    this.plugin.persist();
    this.render();
  }

  private selectFile(file: TFile): void {
    this.state.file = file.path;
    this.plugin.persist();
    this.renderFiles();
    this.app.workspace.getLeaf(false).openFile(file);
  }

  private async moveFileTo(path: string, folder: TFolder): Promise<void> {
    const abs = this.app.vault.getAbstractFileByPath(path);
    if (!(abs instanceof TFile)) return;
    if (abs.parent?.path === folder.path) return;
    const dest = folder.path ? `${folder.path}/${abs.name}` : abs.name;
    if (this.app.vault.getAbstractFileByPath(dest)) {
      new Notice(`${abs.name} already exists in ${folder.name}`);
      return;
    }
    try {
      await this.app.fileManager.renameFile(abs, dest);
      new Notice(`Moved to ${folder.name}`);
    } catch (err) {
      new Notice(`Move failed: ${(err as Error).message}`);
    }
  }

  /** ⌘⌥→ — move the selected note into the folder focused in the folder pane. */
  async moveSelectedToFocusedFolder(): Promise<void> {
    const filePath = this.state.file;
    const folderPath = this.focusedFolderPath;
    if (!filePath || folderPath === null) {
      new Notice('Select a note and focus a folder first');
      return;
    }
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof TFolder)) return;
    await this.moveFileTo(filePath, folder);
  }

  private promptNewFolder(): void {
    const parent = this.selectedFolder();
    new NewFolderModal(this.app, parent, async (name) => {
      const base = parent && parent.path ? `${parent.path}/` : '';
      const path = `${base}${name}`;
      try {
        await this.app.vault.createFolder(path);
        this.state.folder = path;
        this.state.file = null;
        this.plugin.persist();
        this.render();
      } catch (err) {
        new Notice(`Could not create folder: ${(err as Error).message}`);
      }
    }).open();
  }

  // ── Keyboard ────────────────────────────────────────────────────────────

  private onFolderKeydown(e: KeyboardEvent): void {
    const flat = this.visibleFolders;
    if (!flat.length) return;
    let idx = flat.findIndex((f) => f.folder.path === (this.focusedFolderPath ?? this.state.folder));
    if (idx === -1) idx = 0;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      idx = e.key === 'ArrowDown' ? Math.min(idx + 1, flat.length - 1) : Math.max(idx - 1, 0);
      this.focusedFolderPath = flat[idx].folder.path;
      this.renderFolders();
      this.foldersScrollEl
        .querySelector(`[data-path="${cssEscape(this.focusedFolderPath)}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.selectFolder(flat[idx]);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.filesScrollEl.focus();
    }
  }

  private onFileKeydown(e: KeyboardEvent): void {
    const files = this.visibleFiles;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!files.length) return;
      let idx = files.findIndex((f) => f.path === this.state.file);
      if (idx === -1) idx = 0;
      else idx = e.key === 'ArrowDown' ? Math.min(idx + 1, files.length - 1) : Math.max(idx - 1, 0);
      this.selectFile(files[idx]);
      this.filesScrollEl.focus(); // openFile steals focus; keep navigating
      this.filesScrollEl
        .querySelector(`[data-path="${cssEscape(files[idx].path)}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.foldersScrollEl.focus();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const file = this.state.file ? this.app.vault.getAbstractFileByPath(this.state.file) : null;
      if (file instanceof TFile) this.app.workspace.getLeaf(false).openFile(file);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const file = files.find((f) => f.path === this.state.file);
      if (file) this.app.workspace.getLeaf(false).openFile(file);
    }
  }
}

function relativeDate(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 31) return `${Math.round(days / 7)}w ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

function cssEscape(value: string): string {
  return value.replace(/["\\]/g, '\\$&');
}
