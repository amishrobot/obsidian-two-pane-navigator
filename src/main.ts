import { Plugin, WorkspaceLeaf } from 'obsidian';
import { NavigatorView, VIEW_TYPE_NAVIGATOR } from './NavigatorView';
import { NavigatorSettingTab } from './SettingsTab';
import { DEFAULT_SETTINGS, DEFAULT_STATE, NavigatorSettings, NavigatorState } from './types';

const BODY_THEME_CLASSES = [
  'tpn-theme-macchiato',
  'tpn-theme-racing',
  'tpn-theme-ink',
  'tpn-theme-paper',
];

export default class TwoPaneNavigatorPlugin extends Plugin {
  settings: NavigatorSettings = { ...DEFAULT_SETTINGS };
  state: NavigatorState = { ...DEFAULT_STATE };
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  async onload() {
    await this.loadData_();
    this.applyBodyTheme();

    this.registerView(VIEW_TYPE_NAVIGATOR, (leaf: WorkspaceLeaf) => new NavigatorView(leaf, this));

    this.addRibbonIcon('folder-tree', 'Two-Pane Navigator', () => this.activateView());

    this.addCommand({
      id: 'open-navigator',
      name: 'Open navigator',
      callback: () => this.activateView(),
    });

    this.addCommand({
      id: 'move-selected-to-focused-folder',
      name: 'Move selected note to the highlighted folder',
      hotkeys: [{ modifiers: ['Mod', 'Alt'], key: 'ArrowRight' }],
      callback: () => this.getView()?.moveSelectedToFocusedFolder(),
    });

    this.app.workspace.onLayoutReady(() => {
      // During a plugin reload the old leaf is briefly a deferred placeholder
      // that getLeavesOfType misses; give it a beat to resolve, then judge by
      // view-state type so placeholders count. Keep one leaf, create if none.
      setTimeout(() => {
        const leaves: WorkspaceLeaf[] = [];
        this.app.workspace.iterateAllLeaves((leaf) => {
          if (leaf.getViewState().type === VIEW_TYPE_NAVIGATOR) leaves.push(leaf);
        });
        for (const extra of leaves.slice(1)) extra.detach();
        if (!leaves.length) this.activateView(false);
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
  applyBodyTheme(): void {
    document.body.classList.remove(...BODY_THEME_CLASSES);
    document.body.classList.add(`tpn-theme-${this.settings.theme}`);
  }

  getView(): NavigatorView | null {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_NAVIGATOR)) {
      // On workspace restore, leaves exist as deferred placeholders before
      // the view type is registered; instanceof guards against those.
      if (leaf.view instanceof NavigatorView) return leaf.view;
    }
    return null;
  }

  async activateView(reveal = true): Promise<void> {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_NAVIGATOR)[0];
    if (!leaf) {
      const newLeaf = this.app.workspace.getLeftLeaf(false);
      if (!newLeaf) return;
      leaf = newLeaf;
      await leaf.setViewState({ type: VIEW_TYPE_NAVIGATOR, active: true });
    }
    if (reveal) this.app.workspace.revealLeaf(leaf);
  }

  private async loadData_(): Promise<void> {
    const data = (await this.loadData()) ?? {};
    this.settings = { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) };
    this.state = { ...DEFAULT_STATE, ...(data.state ?? {}) };
    this.addSettingTab(new NavigatorSettingTab(this.app, this));
  }

  /** Debounced save — state changes on every click; disk writes shouldn't. */
  persist(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => void this.persistNow(), 800);
  }

  async persistNow(): Promise<void> {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    await this.saveData({ settings: this.settings, state: this.state });
  }
}
