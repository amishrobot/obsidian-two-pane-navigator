import { Plugin, WorkspaceLeaf } from 'obsidian';
import { NavigatorView, VIEW_TYPE_NAVIGATOR } from './NavigatorView';
import { NavigatorSettingTab } from './SettingsTab';
import { DEFAULT_SETTINGS, DEFAULT_STATE, NavigatorSettings, NavigatorState } from './types';

export default class TwoPaneNavigatorPlugin extends Plugin {
  settings: NavigatorSettings = { ...DEFAULT_SETTINGS };
  state: NavigatorState = { ...DEFAULT_STATE };
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  async onload() {
    await this.loadData_();

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
      if (!this.app.workspace.getLeavesOfType(VIEW_TYPE_NAVIGATOR).length) {
        this.activateView(false);
      }
    });
  }

  async onunload() {
    await this.persistNow();
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
