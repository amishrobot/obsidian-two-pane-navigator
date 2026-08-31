export type ThemeName = 'macchiato' | 'racing' | 'ink' | 'paper';
export type SortKey = 'modified' | 'name' | 'size';

export interface NavigatorSettings {
  theme: ThemeName;
  colorCodeFolders: boolean;
  groupByDate: boolean;
  showSnippets: boolean;
}

export const DEFAULT_SETTINGS: NavigatorSettings = {
  theme: 'macchiato',
  colorCodeFolders: true,
  groupByDate: true,
  showSnippets: true,
};

export interface NavigatorState {
  folder: string;
  file: string | null;
  sortByFolder: Record<string, SortKey>;
  expandedTops: string[];
}

export const DEFAULT_STATE: NavigatorState = {
  folder: '',
  file: null,
  sortByFolder: {},
  expandedTops: [],
};

export interface PluginData {
  settings: NavigatorSettings;
  state: NavigatorState;
}
