import { ThemeName } from './types';

// Folder hues per theme, from the design handoff. Keys are top-level folder
// names; anything unlisted gets the theme's neutral. The hue of a nested
// folder is the hue of its top-level ancestor.
const HUES: Record<ThemeName, Record<string, string>> = {
  macchiato: {
    _inbox: '#EED49F',
    Church: '#C6A0F6',
    Work: '#8AADF4',
    Personal: '#A6DA95',
    Library: '#F5A97F',
    _system: '#6E738D',
    _archive: '#6E738D',
  },
  racing: {
    _inbox: '#C9A227',
    Church: '#3F9C62',
    Work: '#6E8FA8',
    Personal: '#8AA05A',
    Library: '#B4703D',
    _system: '#7A7266',
    _archive: '#7A7266',
  },
  ink: {
    _inbox: '#F0A868',
    Church: '#E8B75A',
    Work: '#7FB0C7',
    Personal: '#9EC7A0',
    Library: '#E08B6A',
    _system: '#7D8393',
    _archive: '#7D8393',
  },
  paper: {
    _inbox: '#8A6A12',
    Church: '#004225',
    Work: '#24557E',
    Personal: '#2F7D4F',
    Library: '#9C4E22',
    _system: '#8D887B',
    _archive: '#8D887B',
  },
};

const NEUTRAL: Record<ThemeName, string> = {
  macchiato: '#6E738D',
  racing: '#7A7266',
  ink: '#7D8393',
  paper: '#8D887B',
};

const ACCENT: Record<ThemeName, string> = {
  macchiato: '#C6A0F6',
  racing: '#3F9C62',
  ink: '#E8B75A',
  paper: '#004225',
};

export function hueFor(theme: ThemeName, topFolder: string, colorCode: boolean): string {
  if (!colorCode) return ACCENT[theme];
  return HUES[theme][topFolder] ?? NEUTRAL[theme];
}

export function neutralFor(theme: ThemeName): string {
  return NEUTRAL[theme];
}
