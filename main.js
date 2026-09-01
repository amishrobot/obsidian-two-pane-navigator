var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => TwoPaneNavigatorPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian4 = require("obsidian");

// src/NavigatorView.ts
var import_obsidian2 = require("obsidian");

// src/excerpts.ts
var ExcerptCache = class {
  constructor(app) {
    this.app = app;
    this.cache = /* @__PURE__ */ new Map();
  }
  /** Synchronous cache hit, or null if not cached at this mtime. */
  peek(file) {
    const hit = this.cache.get(file.path);
    if (hit && hit.mtime === file.stat.mtime)
      return hit.text;
    return null;
  }
  async get(file) {
    const hit = this.peek(file);
    if (hit !== null)
      return hit;
    let text = "";
    try {
      const raw = await this.app.vault.cachedRead(file);
      text = firstContentLine(raw);
    } catch (e) {
      text = "";
    }
    this.cache.set(file.path, { mtime: file.stat.mtime, text });
    return text;
  }
  forget(path) {
    this.cache.delete(path);
  }
};
function firstContentLine(raw) {
  let body = raw;
  if (body.startsWith("---\n") || body.startsWith("---\r\n")) {
    const end = body.indexOf("\n---", 3);
    if (end !== -1) {
      const after = body.indexOf("\n", end + 1);
      body = after === -1 ? "" : body.slice(after + 1);
    }
  }
  for (const line of body.split("\n")) {
    const t = line.trim();
    if (!t)
      continue;
    if (t.startsWith("#"))
      continue;
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t))
      continue;
    if (t.startsWith("```"))
      continue;
    const clean = t.replace(/!\[\[([^\]]*)\]\]/g, "$1").replace(/\[\[([^\]|]*)\|?([^\]]*)\]\]/g, (_m, a, b) => b || a).replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`>]/g, "").replace(/^[-+]\s+/, "").replace(/^\d+\.\s+/, "").trim();
    if (/^\[!/.test(clean))
      continue;
    if (clean)
      return clean;
  }
  return "";
}

// src/hues.ts
var HUES = {
  macchiato: {
    _inbox: "#EED49F",
    Church: "#C6A0F6",
    Work: "#8AADF4",
    Personal: "#A6DA95",
    Library: "#F5A97F",
    _system: "#6E738D",
    _archive: "#6E738D"
  },
  racing: {
    _inbox: "#C9A227",
    Church: "#3F9C62",
    Work: "#6E8FA8",
    Personal: "#8AA05A",
    Library: "#B4703D",
    _system: "#7A7266",
    _archive: "#7A7266"
  },
  ink: {
    _inbox: "#F0A868",
    Church: "#E8B75A",
    Work: "#7FB0C7",
    Personal: "#9EC7A0",
    Library: "#E08B6A",
    _system: "#7D8393",
    _archive: "#7D8393"
  },
  paper: {
    _inbox: "#8A6A12",
    Church: "#004225",
    Work: "#24557E",
    Personal: "#2F7D4F",
    Library: "#9C4E22",
    _system: "#8D887B",
    _archive: "#8D887B"
  }
};
var NEUTRAL = {
  macchiato: "#6E738D",
  racing: "#7A7266",
  ink: "#7D8393",
  paper: "#8D887B"
};
var ACCENT = {
  macchiato: "#C6A0F6",
  racing: "#3F9C62",
  ink: "#E8B75A",
  paper: "#004225"
};
function hueFor(theme, topFolder, colorCode) {
  var _a;
  if (!colorCode)
    return ACCENT[theme];
  return (_a = HUES[theme][topFolder]) != null ? _a : NEUTRAL[theme];
}

// src/NewFolderModal.ts
var import_obsidian = require("obsidian");
var NewFolderModal = class extends import_obsidian.Modal {
  constructor(app, parent, onSubmit) {
    super(app);
    this.parent = parent;
    this.onSubmit = onSubmit;
  }
  onOpen() {
    const { contentEl } = this;
    const where = this.parent && this.parent.path ? this.parent.name : "vault root";
    contentEl.createEl("h3", { text: `New folder in ${where}` });
    const input = contentEl.createEl("input", {
      type: "text",
      attr: { placeholder: "Folder name", style: "width: 100%;" }
    });
    input.focus();
    const submit = () => {
      const name = input.value.trim();
      if (!name)
        return;
      this.close();
      this.onSubmit(name);
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter")
        submit();
    });
    const buttonRow = contentEl.createDiv({ attr: { style: "margin-top: 12px; text-align: right;" } });
    const btn = buttonRow.createEl("button", { text: "Create" });
    btn.addEventListener("click", submit);
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/NavigatorView.ts
var VIEW_TYPE_NAVIGATOR = "two-pane-navigator";
var DAY_MS = 864e5;
var NARROW_PX = 520;
var SUNK_NAMES = /* @__PURE__ */ new Set(["_archive", "_system"]);
var PINNED_FIRST = "_inbox";
var SNIPPET_EXTENSIONS = /* @__PURE__ */ new Set(["md", "txt"]);
var NavigatorView = class extends import_obsidian2.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.query = "";
    this.focusedFolderPath = null;
    this.visibleFolders = [];
    this.visibleFiles = [];
    this.refreshTimer = null;
    this.resizeObserver = null;
    this.narrowShowFolders = false;
    this.draggedFile = null;
    this.plugin = plugin;
    this.excerpts = new ExcerptCache(this.app);
  }
  getViewType() {
    return VIEW_TYPE_NAVIGATOR;
  }
  getDisplayText() {
    return "Navigator";
  }
  getIcon() {
    return "folder-tree";
  }
  get state() {
    return this.plugin.state;
  }
  get settings() {
    return this.plugin.settings;
  }
  async onOpen() {
    this.buildSkeleton();
    const onVaultChange = (file) => {
      if (file)
        this.excerpts.forget(file.path);
      this.scheduleRefresh();
    };
    this.registerEvent(this.app.vault.on("create", onVaultChange));
    this.registerEvent(this.app.vault.on("delete", onVaultChange));
    this.registerEvent(this.app.vault.on("modify", onVaultChange));
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        this.excerpts.forget(oldPath);
        if (this.state.folder === oldPath || this.state.folder.startsWith(oldPath + "/")) {
          this.state.folder = file.path + this.state.folder.slice(oldPath.length);
        }
        if (this.state.file === oldPath)
          this.state.file = file.path;
        this.scheduleRefresh();
      })
    );
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (file && file.parent && file.parent.path === this.state.folder && this.state.file !== file.path) {
          this.state.file = file.path;
          this.renderFiles();
        }
      })
    );
    this.resizeObserver = new ResizeObserver(() => this.updateNarrowMode());
    this.resizeObserver.observe(this.contentEl);
    this.updateNarrowMode();
    this.render();
  }
  async onClose() {
    var _a;
    (_a = this.resizeObserver) == null ? void 0 : _a.disconnect();
    this.resizeObserver = null;
  }
  onThemeChange() {
    this.applyThemeClass();
    this.render();
  }
  onSettingsChange() {
    this.render();
  }
  applyThemeClass() {
    const root = this.contentEl;
    root.removeClasses(["tpn-theme-macchiato", "tpn-theme-racing", "tpn-theme-ink", "tpn-theme-paper"]);
    root.addClass(`tpn-theme-${this.settings.theme}`);
  }
  updateNarrowMode() {
    const narrow = this.contentEl.clientWidth > 0 && this.contentEl.clientWidth < NARROW_PX;
    this.contentEl.toggleClass("is-narrow", narrow);
    this.contentEl.toggleClass("show-folders", narrow && this.narrowShowFolders);
  }
  scheduleRefresh() {
    if (this.refreshTimer)
      clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      this.render();
    }, 150);
  }
  // ── Skeleton ────────────────────────────────────────────────────────────
  buildSkeleton() {
    const root = this.contentEl;
    root.empty();
    root.addClass("tpn-root");
    this.applyThemeClass();
    this.foldersEl = root.createDiv("tpn-folders");
    const fh = this.foldersEl.createDiv("tpn-folders-header");
    fh.createDiv({ cls: "tpn-vault-name", text: this.app.vault.getName() });
    this.foldersHeaderSubEl = fh.createDiv("tpn-vault-sub");
    this.foldersScrollEl = this.foldersEl.createDiv("tpn-folders-scroll");
    this.foldersScrollEl.tabIndex = 0;
    this.foldersScrollEl.addEventListener("keydown", (e) => this.onFolderKeydown(e));
    const ff = this.foldersEl.createDiv("tpn-folders-footer");
    const newLabel = ff.createSpan({ cls: "tpn-footer-label", text: "new folder" });
    const plus = ff.createSpan({ cls: "tpn-footer-plus", text: "+" });
    const openNewFolder = () => this.promptNewFolder();
    newLabel.addEventListener("click", openNewFolder);
    plus.addEventListener("click", openNewFolder);
    this.filesEl = root.createDiv("tpn-files");
    const header = this.filesEl.createDiv("tpn-files-header");
    this.filesCrumbEl = header.createDiv("tpn-files-crumb");
    const titleRow = header.createDiv("tpn-files-title-row");
    this.backBtnEl = titleRow.createSpan("tpn-back-btn");
    (0, import_obsidian2.setIcon)(this.backBtnEl, "chevron-left");
    this.backBtnEl.addEventListener("click", () => {
      this.narrowShowFolders = true;
      this.updateNarrowMode();
    });
    this.filesHeaderNameEl = titleRow.createDiv("tpn-files-title");
    this.filesHeaderCountEl = titleRow.createDiv("tpn-files-count");
    const newNoteBtn = titleRow.createSpan({ cls: "tpn-new-note", attr: { "aria-label": "New note" } });
    (0, import_obsidian2.setIcon)(newNoteBtn, "plus");
    newNoteBtn.addEventListener("click", () => this.createNote());
    const filterWrap = header.createDiv("tpn-filter");
    const filterIcon = filterWrap.createSpan("tpn-filter-icon");
    (0, import_obsidian2.setIcon)(filterIcon, "search");
    this.filterInputEl = filterWrap.createEl("input", {
      attr: { placeholder: "Filter in folder", spellcheck: "false" }
    });
    this.filterInputEl.addEventListener("input", () => {
      this.query = this.filterInputEl.value;
      this.renderFiles();
    });
    this.filterInputEl.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.filterInputEl.value = "";
        this.query = "";
        this.renderFiles();
      } else if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        this.filesScrollEl.focus();
      }
    });
    this.sortRowEl = header.createDiv("tpn-sorts");
    this.filesScrollEl = this.filesEl.createDiv("tpn-files-scroll");
    this.filesScrollEl.tabIndex = 0;
    this.filesScrollEl.addEventListener("keydown", (e) => this.onFileKeydown(e));
    const footer = this.filesEl.createDiv("tpn-files-footer");
    footer.createSpan({ text: "drag \u283F onto a folder to move" });
    footer.createSpan({ text: "\u2318\u2325\u2192" });
  }
  // ── Data ────────────────────────────────────────────────────────────────
  /** _inbox first, normal folders A→Z, then archive/system sunk at the bottom. */
  topFolders() {
    const root = this.app.vault.getRoot();
    const all = root.children.filter((c) => c instanceof import_obsidian2.TFolder);
    const rank = (f) => {
      const n = f.name.toLowerCase();
      if (n === PINNED_FIRST)
        return 0;
      if (SUNK_NAMES.has(n))
        return 2;
      return 1;
    };
    return all.sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb)
        return ra - rb;
      return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
    });
  }
  isExpanded(path) {
    return this.state.expandedTops.includes(path);
  }
  flattenFolders() {
    const out = [];
    const childRank = (f) => SUNK_NAMES.has(f.name.toLowerCase()) ? 1 : 0;
    const walk = (folder, depth, top, sunk) => {
      const kids = folder.children.filter((c) => c instanceof import_obsidian2.TFolder).sort((a, b) => {
        const ra = childRank(a);
        const rb = childRank(b);
        if (ra !== rb)
          return ra - rb;
        return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
      });
      const expanded = this.isExpanded(folder.path);
      const isSunk = sunk || SUNK_NAMES.has(folder.name.toLowerCase());
      out.push({
        folder,
        depth,
        top,
        isTop: depth === 0,
        hasChildren: kids.length > 0,
        expanded,
        sunk: isSunk
      });
      if (!expanded)
        return;
      for (const kid of kids)
        walk(kid, depth + 1, top, isSunk);
    };
    for (const top of this.topFolders()) {
      walk(top, 0, top.name, SUNK_NAMES.has(top.name.toLowerCase()));
    }
    return out;
  }
  noteCount(folder) {
    let n = 0;
    const walk = (f) => {
      for (const c of f.children) {
        if (c instanceof import_obsidian2.TFolder)
          walk(c);
        else if (c instanceof import_obsidian2.TFile && c.extension === "md")
          n++;
      }
    };
    walk(folder);
    return n;
  }
  selectedFolder() {
    const abs = this.app.vault.getAbstractFileByPath(this.state.folder);
    if (abs instanceof import_obsidian2.TFolder)
      return abs;
    const tops = this.topFolders();
    if (tops.length) {
      this.state.folder = tops[0].path;
      return tops[0];
    }
    return null;
  }
  sortKey() {
    var _a;
    return (_a = this.state.sortByFolder[this.state.folder]) != null ? _a : "modified";
  }
  /** Notes under this folder's subfolders. The folder pane counts a folder
   *  recursively; this pane lists only its direct notes, because the design
   *  is explicit that folders never appear in the file list. Without a number
   *  for the difference, "Career 58" beside "4 notes" reads as a bug. */
  nestedNoteCount(folder) {
    let n = 0;
    for (const c of folder.children) {
      if (c instanceof import_obsidian2.TFolder)
        n += this.noteCount(c);
    }
    return n;
  }
  filesOf(folder) {
    let files = folder.children.filter((c) => c instanceof import_obsidian2.TFile);
    const q = this.query.trim().toLowerCase();
    if (q)
      files = files.filter((f) => f.basename.toLowerCase().includes(q));
    const key = this.sortKey();
    if (key === "name")
      files.sort((a, b) => a.basename.localeCompare(b.basename));
    else if (key === "size")
      files.sort((a, b) => b.stat.size - a.stat.size);
    else
      files.sort((a, b) => b.stat.mtime - a.stat.mtime);
    return files;
  }
  // ── Rendering ───────────────────────────────────────────────────────────
  render() {
    this.selectedFolder();
    this.renderFolders();
    this.renderFiles();
  }
  renderFolders() {
    const theme = this.settings.theme;
    const colorCode = this.settings.colorCodeFolders;
    const flat = this.flattenFolders();
    this.visibleFolders = flat;
    let folderTotal = 0;
    let noteTotal = 0;
    const walkAll = (f) => {
      for (const c of f.children) {
        if (c instanceof import_obsidian2.TFolder) {
          folderTotal++;
          walkAll(c);
        } else if (c instanceof import_obsidian2.TFile && c.extension === "md")
          noteTotal++;
      }
    };
    walkAll(this.app.vault.getRoot());
    this.foldersHeaderSubEl.setText(
      `${folderTotal.toLocaleString()} folders \xB7 ${noteTotal.toLocaleString()} notes`
    );
    this.foldersScrollEl.empty();
    for (const entry of flat) {
      const { folder, depth, top, isTop, hasChildren, expanded, sunk } = entry;
      const hue = hueFor(theme, top, colorCode);
      const selected = folder.path === this.state.folder;
      const focused = folder.path === this.focusedFolderPath;
      const count = this.noteCount(folder);
      const row = this.foldersScrollEl.createDiv({
        cls: [
          "tpn-folder-row",
          isTop ? "is-top" : "is-child",
          selected ? "is-selected" : "",
          focused ? "is-focused" : "",
          sunk ? "is-sunk" : "",
          count === 0 ? "is-empty" : ""
        ].filter(Boolean).join(" ")
      });
      row.style.setProperty("--tpn-hue", hue);
      row.style.paddingLeft = `${12 + depth * 14}px`;
      row.dataset.path = folder.path;
      row.createDiv("tpn-folder-spine");
      const chevron = row.createSpan("tpn-folder-chevron");
      if (hasChildren) {
        (0, import_obsidian2.setIcon)(chevron, "chevron-right");
        if (expanded)
          chevron.addClass("is-open");
        chevron.addEventListener("click", (e) => {
          e.stopPropagation();
          this.toggleExpand(folder.path);
        });
      } else {
        chevron.addClass("is-blank");
      }
      row.createDiv("tpn-folder-marker");
      row.createSpan({ cls: "tpn-folder-name", text: folder.name });
      row.createSpan({ cls: "tpn-folder-count", text: count.toLocaleString() });
      row.addEventListener("click", () => this.selectFolder(entry));
      row.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const menu = new import_obsidian2.Menu();
        this.app.workspace.trigger("file-menu", menu, folder, "file-explorer-context-menu");
        menu.showAtMouseEvent(e);
      });
      row.addEventListener("dragover", (e) => {
        var _a, _b;
        const path = (_a = e.dataTransfer) == null ? void 0 : _a.types.includes("text/plain");
        if (!path)
          return;
        const dragged = this.draggedFile;
        if (!dragged || ((_b = dragged.parent) == null ? void 0 : _b.path) === folder.path)
          return;
        e.preventDefault();
        row.addClass("is-drop-target");
      });
      row.addEventListener("dragleave", () => row.removeClass("is-drop-target"));
      row.addEventListener("drop", async (e) => {
        var _a;
        e.preventDefault();
        row.removeClass("is-drop-target");
        const path = (_a = e.dataTransfer) == null ? void 0 : _a.getData("text/plain");
        if (path)
          await this.moveFileTo(path, folder);
      });
    }
  }
  renderFiles() {
    const theme = this.settings.theme;
    const colorCode = this.settings.colorCodeFolders;
    const folder = this.selectedFolder();
    this.filesScrollEl.empty();
    this.visibleFiles = [];
    if (!folder) {
      this.filesHeaderNameEl.setText("No folder");
      this.filesHeaderCountEl.setText("");
      this.filesCrumbEl.setText("");
      return;
    }
    const flat = this.visibleFolders.find((f) => f.folder.path === folder.path);
    const topName = flat ? flat.top : folder.path.split("/")[0];
    const hue = hueFor(theme, topName, colorCode);
    this.filesEl.style.setProperty("--tpn-hue", hue);
    const parentPath = folder.parent && folder.parent.path !== "/" ? folder.parent.path : "";
    this.filesCrumbEl.setText(parentPath ? parentPath.split("/").join(" / ") : "");
    this.filesCrumbEl.toggleClass("is-hidden", !parentPath);
    this.filesHeaderNameEl.setText(folder.name || this.app.vault.getName());
    const files = this.filesOf(folder);
    this.visibleFiles = files;
    this.filesHeaderCountEl.empty();
    this.filesHeaderCountEl.createSpan({
      text: `${files.length} ${files.length === 1 ? "note" : "notes"}`
    });
    const nested = this.query.trim() ? 0 : this.nestedNoteCount(folder);
    if (nested > 0) {
      this.filesHeaderCountEl.createSpan({
        cls: "tpn-files-count-nested",
        text: ` \xB7 ${nested.toLocaleString()} nested`
      });
      this.filesHeaderCountEl.setAttr(
        "aria-label",
        `${nested.toLocaleString()} more notes in subfolders of ${folder.name}`
      );
    } else {
      this.filesHeaderCountEl.removeAttribute("aria-label");
    }
    if (this.filterInputEl.value !== this.query)
      this.filterInputEl.value = this.query;
    this.renderSorts();
    let selectedPath = this.state.file;
    if (!selectedPath || !files.some((f) => f.path === selectedPath)) {
      selectedPath = files.length ? files[0].path : null;
    }
    if (!files.length) {
      const q = this.query.trim();
      const msg = q ? `Nothing matches \u201C${q}\u201D in ${folder.name}.` : `No notes in ${folder.name}.`;
      this.filesScrollEl.createDiv({ cls: "tpn-empty", text: msg });
      return;
    }
    const now = Date.now();
    const groups = this.groupFiles(files, now);
    for (const group of groups) {
      const gh = this.filesScrollEl.createDiv("tpn-group-header");
      gh.createSpan({ cls: "tpn-group-label", text: group.label });
      gh.createDiv("tpn-group-rule");
      gh.createSpan({ cls: "tpn-group-count", text: String(group.files.length) });
      for (const file of group.files) {
        this.renderFileRow(file, file.path === selectedPath, hue, now);
      }
    }
  }
  renderSorts() {
    this.sortRowEl.empty();
    const current = this.sortKey();
    const options = [
      { key: "modified", label: "Recent" },
      { key: "name", label: "Name" },
      { key: "size", label: "Size" }
    ];
    for (const opt of options) {
      const cell = this.sortRowEl.createDiv({
        cls: `tpn-sort-cell${opt.key === current ? " is-active" : ""}`,
        text: opt.label
      });
      cell.addEventListener("click", () => {
        this.state.sortByFolder[this.state.folder] = opt.key;
        this.plugin.persist();
        this.renderFiles();
      });
    }
  }
  groupFiles(files, now) {
    const key = this.sortKey();
    if (key === "name")
      return [{ label: "A \u2192 Z", files }];
    if (key === "size")
      return [{ label: "Largest first", files }];
    if (!this.settings.groupByDate)
      return [{ label: "All notes", files }];
    const order = ["Today", "This week", "This month", "This year", "Earlier"];
    const buckets = new Map(order.map((l) => [l, []]));
    for (const f of files) {
      const days = Math.floor((now - f.stat.mtime) / DAY_MS);
      const label = days <= 1 ? "Today" : days < 7 ? "This week" : days < 31 ? "This month" : days < 365 ? "This year" : "Earlier";
      buckets.get(label).push(f);
    }
    return order.map((label) => ({ label, files: buckets.get(label) })).filter((g) => g.files.length);
  }
  renderFileRow(file, selected, hue, now) {
    const row = this.filesScrollEl.createDiv({
      cls: `tpn-file-row${selected ? " is-selected" : ""}`
    });
    row.dataset.path = file.path;
    row.createDiv("tpn-file-spine");
    const body = row.createDiv("tpn-file-body");
    const line1 = body.createDiv("tpn-file-line1");
    const name = file.extension === "md" ? file.basename : file.name;
    line1.createSpan({ cls: "tpn-file-name", text: name });
    const days = Math.floor((now - file.stat.mtime) / DAY_MS);
    const modifiedToday = new Date(file.stat.mtime).toDateString() === new Date(now).toDateString();
    const inInbox = file.path.startsWith("_inbox/") || file.path.startsWith("_inbox\\");
    if (inInbox && modifiedToday)
      line1.createSpan("tpn-file-unread");
    const line2 = body.createDiv("tpn-file-line2");
    const when = line2.createSpan({ cls: "tpn-file-when", text: relativeDate(days) });
    if (modifiedToday)
      when.addClass("is-today");
    line2.createSpan("tpn-file-dot");
    line2.createSpan({
      cls: "tpn-file-size",
      text: `${Math.max(1, Math.round(file.stat.size / 1024))} kb`
    });
    if (this.settings.showSnippets && SNIPPET_EXTENSIONS.has(file.extension)) {
      const snip = line2.createSpan("tpn-file-snippet");
      const cached = this.excerpts.peek(file);
      if (cached !== null) {
        snip.setText(cached);
      } else {
        this.excerpts.get(file).then((text) => {
          if (snip.isConnected)
            snip.setText(text);
        });
      }
    }
    const grip = row.createSpan({ cls: "tpn-file-grip", text: "\u283F" });
    grip.draggable = true;
    grip.addEventListener("dragstart", (e) => {
      var _a;
      this.draggedFile = file;
      (_a = e.dataTransfer) == null ? void 0 : _a.setData("text/plain", file.path);
      if (e.dataTransfer)
        e.dataTransfer.effectAllowed = "move";
      this.contentEl.addClass("tpn-dragging");
    });
    grip.addEventListener("dragend", () => {
      this.draggedFile = null;
      this.contentEl.removeClass("tpn-dragging");
      this.contentEl.findAll(".is-drop-target").forEach((el) => el.removeClass("is-drop-target"));
    });
    row.addEventListener("click", () => this.selectFile(file));
    row.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const menu = new import_obsidian2.Menu();
      this.app.workspace.trigger("file-menu", menu, file, "file-explorer-context-menu");
      menu.showAtMouseEvent(e);
    });
  }
  // ── Actions ─────────────────────────────────────────────────────────────
  toggleExpand(path) {
    if (this.isExpanded(path)) {
      this.state.expandedTops = this.state.expandedTops.filter((p) => p !== path);
    } else {
      this.state.expandedTops.push(path);
    }
    this.plugin.persist();
    this.renderFolders();
  }
  selectFolder(entry) {
    const path = entry.folder.path;
    if (entry.hasChildren) {
      const expanded = this.isExpanded(path);
      if (this.state.folder === path && expanded) {
        this.state.expandedTops = this.state.expandedTops.filter((p) => p !== path);
      } else if (!expanded) {
        this.state.expandedTops.push(path);
      }
    }
    this.state.folder = path;
    this.state.file = null;
    this.query = "";
    this.focusedFolderPath = path;
    this.narrowShowFolders = false;
    this.updateNarrowMode();
    this.plugin.persist();
    this.render();
  }
  selectFile(file) {
    this.state.file = file.path;
    this.plugin.persist();
    this.renderFiles();
    this.app.workspace.getLeaf(false).openFile(file);
  }
  async createNote() {
    const folder = this.selectedFolder();
    if (!folder)
      return;
    const base = folder.path ? `${folder.path}/` : "";
    let name = "Untitled";
    let n = 1;
    while (this.app.vault.getAbstractFileByPath(`${base}${name}.md`)) {
      n++;
      name = `Untitled ${n}`;
    }
    try {
      const file = await this.app.vault.create(`${base}${name}.md`, "");
      this.state.file = file.path;
      this.plugin.persist();
      await this.app.workspace.getLeaf(false).openFile(file);
    } catch (err) {
      new import_obsidian2.Notice(`Could not create note: ${err.message}`);
    }
  }
  async moveFileTo(path, folder) {
    var _a;
    const abs = this.app.vault.getAbstractFileByPath(path);
    if (!(abs instanceof import_obsidian2.TFile))
      return;
    if (((_a = abs.parent) == null ? void 0 : _a.path) === folder.path)
      return;
    const dest = folder.path ? `${folder.path}/${abs.name}` : abs.name;
    if (this.app.vault.getAbstractFileByPath(dest)) {
      new import_obsidian2.Notice(`${abs.name} already exists in ${folder.name}`);
      return;
    }
    try {
      await this.app.fileManager.renameFile(abs, dest);
      new import_obsidian2.Notice(`Moved to ${folder.name}`);
    } catch (err) {
      new import_obsidian2.Notice(`Move failed: ${err.message}`);
    }
  }
  /** ⌘⌥→ — move the selected note into the folder focused in the folder pane. */
  async moveSelectedToFocusedFolder() {
    const filePath = this.state.file;
    const folderPath = this.focusedFolderPath;
    if (!filePath || folderPath === null) {
      new import_obsidian2.Notice("Select a note and focus a folder first");
      return;
    }
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof import_obsidian2.TFolder))
      return;
    await this.moveFileTo(filePath, folder);
  }
  promptNewFolder() {
    const parent = this.selectedFolder();
    new NewFolderModal(this.app, parent, async (name) => {
      const base = parent && parent.path ? `${parent.path}/` : "";
      const path = `${base}${name}`;
      try {
        await this.app.vault.createFolder(path);
        this.state.folder = path;
        this.state.file = null;
        this.plugin.persist();
        this.render();
      } catch (err) {
        new import_obsidian2.Notice(`Could not create folder: ${err.message}`);
      }
    }).open();
  }
  // ── Keyboard ────────────────────────────────────────────────────────────
  onFolderKeydown(e) {
    var _a;
    const flat = this.visibleFolders;
    if (!flat.length)
      return;
    let idx = flat.findIndex((f) => {
      var _a2;
      return f.folder.path === ((_a2 = this.focusedFolderPath) != null ? _a2 : this.state.folder);
    });
    if (idx === -1)
      idx = 0;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      idx = e.key === "ArrowDown" ? Math.min(idx + 1, flat.length - 1) : Math.max(idx - 1, 0);
      this.focusedFolderPath = flat[idx].folder.path;
      this.renderFolders();
      (_a = this.foldersScrollEl.querySelector(`[data-path="${cssEscape(this.focusedFolderPath)}"]`)) == null ? void 0 : _a.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      this.selectFolder(flat[idx]);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      this.filesScrollEl.focus();
    }
  }
  onFileKeydown(e) {
    var _a;
    const files = this.visibleFiles;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!files.length)
        return;
      let idx = files.findIndex((f) => f.path === this.state.file);
      if (idx === -1)
        idx = 0;
      else
        idx = e.key === "ArrowDown" ? Math.min(idx + 1, files.length - 1) : Math.max(idx - 1, 0);
      this.selectFile(files[idx]);
      this.filesScrollEl.focus();
      (_a = this.filesScrollEl.querySelector(`[data-path="${cssEscape(files[idx].path)}"]`)) == null ? void 0 : _a.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      this.foldersScrollEl.focus();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      const file = this.state.file ? this.app.vault.getAbstractFileByPath(this.state.file) : null;
      if (file instanceof import_obsidian2.TFile)
        this.app.workspace.getLeaf(false).openFile(file);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const file = files.find((f) => f.path === this.state.file);
      if (file)
        this.app.workspace.getLeaf(false).openFile(file);
    }
  }
};
function relativeDate(days) {
  if (days <= 0)
    return "today";
  if (days === 1)
    return "yesterday";
  if (days < 7)
    return `${days}d ago`;
  if (days < 31)
    return `${Math.round(days / 7)}w ago`;
  if (days < 365)
    return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}
function cssEscape(value) {
  return value.replace(/["\\]/g, "\\$&");
}

// src/SettingsTab.ts
var import_obsidian3 = require("obsidian");
var NavigatorSettingTab = class extends import_obsidian3.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian3.Setting(containerEl).setName("Theme").setDesc("Palette for the entire vault interface \u2014 panes, editor, and chrome").addDropdown(
      (dd) => dd.addOptions({
        macchiato: "Macchiato (current vault palette)",
        racing: "Racing (British racing green)",
        ink: "Ink (neutral, amber accent)",
        paper: "Paper (light)"
      }).setValue(this.plugin.settings.theme).onChange(async (value) => {
        var _a;
        this.plugin.settings.theme = value;
        await this.plugin.persistNow();
        this.plugin.applyBodyTheme();
        (_a = this.plugin.getView()) == null ? void 0 : _a.onThemeChange();
      })
    );
    new import_obsidian3.Setting(containerEl).setName("Color-code folders").setDesc("Folder hues on markers and spines. Off falls back to one neutral accent.").addToggle(
      (t) => t.setValue(this.plugin.settings.colorCodeFolders).onChange(async (value) => {
        var _a;
        this.plugin.settings.colorCodeFolders = value;
        await this.plugin.persistNow();
        (_a = this.plugin.getView()) == null ? void 0 : _a.onSettingsChange();
      })
    );
    new import_obsidian3.Setting(containerEl).setName("Group by date").setDesc("Date group headers when sorted by Recent").addToggle(
      (t) => t.setValue(this.plugin.settings.groupByDate).onChange(async (value) => {
        var _a;
        this.plugin.settings.groupByDate = value;
        await this.plugin.persistNow();
        (_a = this.plugin.getView()) == null ? void 0 : _a.onSettingsChange();
      })
    );
    new import_obsidian3.Setting(containerEl).setName("Show snippets").setDesc("First-line excerpt on the second row of each file").addToggle(
      (t) => t.setValue(this.plugin.settings.showSnippets).onChange(async (value) => {
        var _a;
        this.plugin.settings.showSnippets = value;
        await this.plugin.persistNow();
        (_a = this.plugin.getView()) == null ? void 0 : _a.onSettingsChange();
      })
    );
  }
};

// src/types.ts
var DEFAULT_SETTINGS = {
  theme: "macchiato",
  colorCodeFolders: true,
  groupByDate: true,
  showSnippets: true
};
var DEFAULT_STATE = {
  folder: "",
  file: null,
  sortByFolder: {},
  expandedTops: []
};

// src/main.ts
var BODY_THEME_CLASSES = [
  "tpn-theme-macchiato",
  "tpn-theme-racing",
  "tpn-theme-ink",
  "tpn-theme-paper"
];
var THEME_POLARITY = {
  macchiato: "obsidian",
  racing: "obsidian",
  ink: "obsidian",
  paper: "moonstone"
};
var TwoPaneNavigatorPlugin = class extends import_obsidian4.Plugin {
  constructor() {
    super(...arguments);
    this.settings = { ...DEFAULT_SETTINGS };
    this.state = { ...DEFAULT_STATE };
    this.persistTimer = null;
  }
  async onload() {
    await this.loadData_();
    this.applyBodyTheme();
    this.registerView(VIEW_TYPE_NAVIGATOR, (leaf) => new NavigatorView(leaf, this));
    this.addRibbonIcon("folder-tree", "Two-Pane Navigator", () => this.activateView());
    this.addCommand({
      id: "open-navigator",
      name: "Open navigator",
      callback: () => this.activateView()
    });
    this.addCommand({
      id: "move-selected-to-focused-folder",
      name: "Move selected note to the highlighted folder",
      hotkeys: [{ modifiers: ["Mod", "Alt"], key: "ArrowRight" }],
      callback: () => {
        var _a;
        return (_a = this.getView()) == null ? void 0 : _a.moveSelectedToFocusedFolder();
      }
    });
    this.app.workspace.onLayoutReady(() => {
      setTimeout(() => {
        const leaves = [];
        this.app.workspace.iterateAllLeaves((leaf) => {
          if (leaf.getViewState().type === VIEW_TYPE_NAVIGATOR)
            leaves.push(leaf);
        });
        for (const extra of leaves.slice(1))
          extra.detach();
        if (!leaves.length)
          this.activateView(false);
      }, 400);
    });
  }
  async onunload() {
    document.body.classList.remove(...BODY_THEME_CLASSES);
    await this.persistNow();
  }
  /** The theme skins the whole app, not just the navigator panes: a body
   *  class carries per-theme overrides of the design-system snippet's
   *  --jd-* palette, which every surface in the vault reads from. */
  applyBodyTheme() {
    document.body.classList.remove(...BODY_THEME_CLASSES);
    document.body.classList.add(`tpn-theme-${this.settings.theme}`);
    this.syncBaseScheme();
  }
  /** The base scheme carries polarity assumptions the palette must agree
   *  with — callout blend modes, native menus, scrollbars all key off
   *  theme-dark/theme-light. A dark base under Paper erased callout photos
   *  in reading view, so while a palette is active it owns the base scheme.
   *  setTheme/changeTheme are internal API; both are guarded so a rename in
   *  a future Obsidian degrades to a no-op, not a crash. */
  syncBaseScheme() {
    var _a, _b, _c, _d, _e, _f, _g;
    const want = (_a = THEME_POLARITY[this.settings.theme]) != null ? _a : "obsidian";
    const app = this.app;
    if (((_c = (_b = app.vault) == null ? void 0 : _b.getConfig) == null ? void 0 : _c.call(_b, "theme")) === want)
      return;
    (_e = (_d = app.setTheme) != null ? _d : app.changeTheme) == null ? void 0 : _e.call(app, want);
    (_g = (_f = app.vault) == null ? void 0 : _f.setConfig) == null ? void 0 : _g.call(_f, "theme", want);
    app.workspace.trigger("css-change");
  }
  getView() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_NAVIGATOR)) {
      if (leaf.view instanceof NavigatorView)
        return leaf.view;
    }
    return null;
  }
  async activateView(reveal = true) {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_NAVIGATOR)[0];
    if (!leaf) {
      const newLeaf = this.app.workspace.getLeftLeaf(false);
      if (!newLeaf)
        return;
      leaf = newLeaf;
      await leaf.setViewState({ type: VIEW_TYPE_NAVIGATOR, active: true });
    }
    if (reveal)
      this.app.workspace.revealLeaf(leaf);
  }
  async loadData_() {
    var _a, _b, _c;
    const data = (_a = await this.loadData()) != null ? _a : {};
    this.settings = { ...DEFAULT_SETTINGS, ...(_b = data.settings) != null ? _b : {} };
    this.state = { ...DEFAULT_STATE, ...(_c = data.state) != null ? _c : {} };
    this.addSettingTab(new NavigatorSettingTab(this.app, this));
  }
  /** Debounced save — state changes on every click; disk writes shouldn't. */
  persist() {
    if (this.persistTimer)
      clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => void this.persistNow(), 800);
  }
  async persistNow() {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    await this.saveData({ settings: this.settings, state: this.state });
  }
};
