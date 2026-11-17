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

export interface MemberInfo {
  recommend: string;
  lastContact: number | null;
  priority: string;
  pastoral: string;
}

export function memberInfo(app: App, file: TFile): MemberInfo | null {
  if (file.extension !== 'md') return null;
  const fm = app.metadataCache.getFileCache(file)?.frontmatter as Record<string, unknown> | undefined;
  if (!isMember(fm)) return null;
  const lc = String(fm?.['last-contact'] ?? '').trim();
  const t = lc ? new Date(lc).getTime() : NaN;
  return {
    recommend: String(fm?.recommend ?? '').toLowerCase(),
    lastContact: isNaN(t) ? null : t,
    priority: String(fm?.priority ?? ''),
    pastoral: String(fm?.['pastoral-state'] ?? ''),
  };
}

export type RosterKey = 'attention' | 'contact' | 'recommend' | 'name';
export const ROSTER_SORTS: { key: RosterKey; label: string }[] = [
  { key: 'attention', label: 'Attention' },
  { key: 'contact', label: 'Contact' },
  { key: 'recommend', label: 'Recommend' },
  { key: 'name', label: 'Name' },
];

/** Group member files for one roster tab. Non-member files land in "Other notes". */
export function rosterGroups(app: App, files: TFile[], key: RosterKey, now: number): { label: string; files: TFile[] }[] {
  const byName = (a: TFile, b: TFile) => a.basename.localeCompare(b.basename);
  const info = new Map(files.map((f) => [f, memberInfo(app, f)]));
  const members = files.filter((f) => info.get(f));
  const others = files.filter((f) => !info.get(f)).sort(byName);
  const buckets = (order: string[], label: (i: MemberInfo) => string, sort: (a: TFile, b: TFile) => number) => {
    const m = new Map<string, TFile[]>(order.map((l) => [l, []]));
    for (const f of members) m.get(label(info.get(f)!))!.push(f);
    const out = order.map((l) => ({ label: l, files: m.get(l)!.sort(sort) })).filter((g) => g.files.length);
    if (others.length) out.push({ label: 'Other notes', files: others });
    return out;
  };
  if (key === 'attention') {
    return buckets(
      ['Needs attention', 'New move-ins', 'Everyone else'],
      (i) => (i.priority === 'top-10' || i.priority === 'high' || i.pastoral || i.recommend === 'expiring')
        ? 'Needs attention' : i.priority === 'new-move-in' ? 'New move-ins' : 'Everyone else',
      byName,
    );
  }
  if (key === 'contact') {
    const age = (f: TFile) => info.get(f)!.lastContact ?? -Infinity;
    return buckets(
      ['No contact logged', 'Over 3 months', 'Last 3 months'],
      (i) => i.lastContact === null ? 'No contact logged' : now - i.lastContact > 90 * DAY_MS ? 'Over 3 months' : 'Last 3 months',
      (a, b) => age(a) - age(b) || byName(a, b),
    );
  }
  if (key === 'recommend') {
    const label = (i: MemberInfo) =>
      i.recommend === 'expired' ? 'Expired' : i.recommend === 'expiring' ? 'Expiring' : i.recommend === 'current' ? 'Current' : 'Unknown or none';
    return buckets(['Expiring', 'Expired', 'Unknown or none', 'Current'], label, byName);
  }
  return [{ label: 'A → Z', files: [...files].sort(byName) }];
}

/** A folder is a roster when most of its notes are member profiles. */
export function isRosterFolder(app: App, files: TFile[]): boolean {
  const md = files.filter((f) => f.extension === 'md');
  if (md.length < 5) return false;
  const sample = md.slice(0, 20);
  return sample.filter((f) => memberInfo(app, f)).length >= sample.length * 0.6;
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
