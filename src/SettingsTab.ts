import { App, PluginSettingTab, Setting } from 'obsidian';
import type TwoPaneNavigatorPlugin from './main';
import { ThemeName } from './types';

export class NavigatorSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: TwoPaneNavigatorPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Theme')
      .setDesc('Palette for the entire vault interface — panes, editor, and chrome')
      .addDropdown((dd) =>
        dd
          .addOptions({
            macchiato: 'Macchiato (current vault palette)',
            racing: 'Racing (British racing green)',
            ink: 'Ink (neutral, amber accent)',
            paper: 'Paper (light)',
          })
          .setValue(this.plugin.settings.theme)
          .onChange(async (value) => {
            this.plugin.settings.theme = value as ThemeName;
            await this.plugin.persistNow();
            this.plugin.applyBodyTheme();
            this.plugin.getView()?.onThemeChange();
          })
      );

    new Setting(containerEl)
      .setName('Color-code folders')
      .setDesc('Folder hues on markers and spines. Off falls back to one neutral accent.')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.colorCodeFolders).onChange(async (value) => {
          this.plugin.settings.colorCodeFolders = value;
          await this.plugin.persistNow();
          this.plugin.getView()?.onSettingsChange();
        })
      );

    new Setting(containerEl)
      .setName('Group by date')
      .setDesc('Date group headers when sorted by Recent')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.groupByDate).onChange(async (value) => {
          this.plugin.settings.groupByDate = value;
          await this.plugin.persistNow();
          this.plugin.getView()?.onSettingsChange();
        })
      );

    new Setting(containerEl)
      .setName('Show snippets')
      .setDesc('First-line excerpt on the second row of each file')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.showSnippets).onChange(async (value) => {
          this.plugin.settings.showSnippets = value;
          await this.plugin.persistNow();
          this.plugin.getView()?.onSettingsChange();
        })
      );
  }
}
