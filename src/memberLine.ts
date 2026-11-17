import { App, TFile } from 'obsidian';

// For notes whose frontmatter marks them as a member profile
// (cssclasses: member-profile), the file list's second line shows status
// instead of modified-date, size and excerpt: a recommend dot, the calling,
// and time since last contact. It turns the Members folder into a roster
// without a separate view.

const DAY_MS = 86_400_000;

export interface MemberLine {
  tone: 'ok' | 'warn' | 'danger' | 'muted';
  recommend: string;
  calling: string;
  contact: string;
  contactNever: boolean;
  flag: string;
}

function isMember(fm: Record<string, unknown> | undefined): boolean {
  const c = fm?.cssclasses;
  if (Array.isArray(c)) return c.includes('member-profile');
  return typeof c === 'string' && c.split(/[\s,]+/).includes('member-profile');
}

export function callingNames(raw: unknown): string {
  return String(raw ?? '')
    .split('/')
    .map((c) => c.replace(/\s*\([^)]*\)\s*$/, '').trim())
    .filter(Boolean)
    .join(' · ');
}

export function contactAgo(raw: unknown, now: number): string {
  const s = String(raw ?? '').trim();
  if (!s) return 'never';
  const t = new Date(s).getTime();
  if (isNaN(t)) return 'never';
  const days = Math.floor((now - t) / DAY_MS);
  if (days <= 0) return 'today';
  if (days <= 30) return `${days}d`;
  if (days <= 84) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}

const TONES: Record<string, MemberLine['tone']> = {
  current: 'ok', expiring: 'warn', expired: 'danger',
};

export function memberLine(app: App, file: TFile, now: number): MemberLine | null {
  const fm = app.metadataCache.getFileCache(file)?.frontmatter as Record<string, unknown> | undefined;
  if (!isMember(fm)) return null;
  const rec = String(fm?.recommend ?? '').toLowerCase();
  const contact = contactAgo(fm?.['last-contact'], now);
  const pri = String(fm?.priority ?? '');
  const pastoral = String(fm?.['pastoral-state'] ?? '');
  return {
    tone: TONES[rec] ?? 'muted',
    recommend: rec ? `Recommend ${rec}` : 'Recommend unknown',
    calling: callingNames(fm?.calling) || 'No calling',
    contact,
    contactNever: contact === 'never',
    flag: pri === 'top-10' || pri === 'high' ? pri : pastoral ? pastoral.replace(/-/g, ' ') : pri === 'new-move-in' ? 'new' : '',
  };
}
