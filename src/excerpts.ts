import { App, TFile } from 'obsidian';

interface CacheEntry {
  mtime: number;
  text: string;
}

// First non-frontmatter, non-heading, non-empty line of a note, lightly
// de-markdowned. Cached by path + mtime so a vault-wide render costs one
// read per changed file.
export class ExcerptCache {
  private cache = new Map<string, CacheEntry>();

  constructor(private app: App) {}

  /** Synchronous cache hit, or null if not cached at this mtime. */
  peek(file: TFile): string | null {
    const hit = this.cache.get(file.path);
    if (hit && hit.mtime === file.stat.mtime) return hit.text;
    return null;
  }

  async get(file: TFile): Promise<string> {
    const hit = this.peek(file);
    if (hit !== null) return hit;
    let text = '';
    try {
      const raw = await this.app.vault.cachedRead(file);
      text = firstContentLine(raw);
    } catch {
      text = '';
    }
    this.cache.set(file.path, { mtime: file.stat.mtime, text });
    return text;
  }

  forget(path: string): void {
    this.cache.delete(path);
  }
}

export function firstContentLine(raw: string): string {
  let body = raw;
  if (body.startsWith('---\n') || body.startsWith('---\r\n')) {
    const end = body.indexOf('\n---', 3);
    if (end !== -1) {
      const after = body.indexOf('\n', end + 1);
      body = after === -1 ? '' : body.slice(after + 1);
    }
  }
  for (const line of body.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('#')) continue; // headings and tags-only lines
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) continue; // horizontal rules
    if (t.startsWith('```')) continue;
    const clean = t
      .replace(/!\[\[([^\]]*)\]\]/g, '$1')
      .replace(/\[\[([^\]|]*)\|?([^\]]*)\]\]/g, (_m, a, b) => b || a)
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[*_`>]/g, '')
      .replace(/^[-+]\s+/, '')
      .replace(/^\d+\.\s+/, '')
      .trim();
    if (/^\[!/.test(clean)) continue; // callout header, e.g. [!member-card]
    if (clean) return clean;
  }
  return '';
}
