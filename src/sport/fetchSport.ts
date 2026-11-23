import { F1_URL, parseF1, wikipediaPages } from './sources.ts';
import type { SportEvent, SportKey } from './parsers.ts';

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
/** Wikipedia prosi o przedstawienie się klientów API; w przeglądarce służy do tego Api-User-Agent. */
const AGENT = 'KalendarzBeagleapps/1.4 (https://beagleapps.pl; terminarz sportowy)';
/** API zwraca treść najwyżej kilkudziesięciu stron naraz — dzielimy prośbę na paczki. */
const PACZKA = 20;

export interface SportFetchResult {
  events: SportEvent[];
  errors: string[];
  /** Dyscypliny, których źródło nie odpowiedziało — dla nich warto zostawić poprzedni terminarz. */
  failed: SportKey[];
}

async function wikiBatch(titles: string[]): Promise<Map<string, string>> {
  const url = new URL(WIKI_API);
  url.search = new URLSearchParams({
    action: 'query',
    prop: 'revisions',
    rvprop: 'content',
    rvslots: 'main',
    format: 'json',
    formatversion: '2',
    redirects: '1',
    origin: '*',
    titles: titles.join('|'),
  }).toString();
  const res = await fetch(url, { headers: { 'Api-User-Agent': AGENT } });
  if (!res.ok) throw new Error(`Wikipedia: HTTP ${res.status}`);
  const json = (await res.json()) as {
    query?: {
      pages?: { title: string; missing?: boolean; revisions?: { slots: { main: { content: string } } }[] }[];
      redirects?: { from: string; to: string }[];
      normalized?: { from: string; to: string }[];
    };
  };
  // Prośba po tytule A może wrócić jako B (przekierowanie) — mapujemy z powrotem na A.
  const alias = new Map<string, string>();
  for (const n of json.query?.normalized ?? []) alias.set(n.to, n.from);
  for (const r of json.query?.redirects ?? []) alias.set(r.to, alias.get(r.from) ?? r.from);
  const out = new Map<string, string>();
  for (const p of json.query?.pages ?? []) {
    const content = p.revisions?.[0]?.slots.main.content;
    if (!content) continue;
    out.set(p.title, content);
    const asked = alias.get(p.title);
    if (asked) out.set(asked, content);
  }
  return out;
}

/**
 * Pobiera i odczytuje terminarze wybranych dyscyplin. Zwraca wydarzenia od wczoraj do roku naprzód.
 * Błąd jednego źródła nie przekreśla pozostałych.
 */
export async function fetchSportEvents(selected: SportKey[], now = new Date()): Promise<SportFetchResult> {
  const wanted = new Set(selected);
  const errors: string[] = [];
  const events: SportEvent[] = [];
  const failed = new Set<SportKey>();

  const pages = wikipediaPages(now).filter((p) => p.sports.some((s) => wanted.has(s)));
  const titles = [...new Set(pages.map((p) => p.title))];
  const texts = new Map<string, string>();
  for (let i = 0; i < titles.length; i += PACZKA) {
    const part = titles.slice(i, i + PACZKA);
    try {
      const batch = await wikiBatch(part);
      batch.forEach((v, k) => texts.set(k, v));
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
      for (const p of pages) if (part.includes(p.title)) p.sports.forEach((s) => failed.add(s));
    }
  }
  for (const page of pages) {
    const text = texts.get(page.title);
    if (!text) continue;
    try {
      events.push(...page.parse(text, now));
    } catch (e) {
      errors.push(`${page.title}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (wanted.has('f1')) {
    for (const year of [now.getFullYear(), now.getFullYear() + 1]) {
      try {
        const res = await fetch(F1_URL(year));
        if (!res.ok) throw new Error(`F1: HTTP ${res.status}`);
        events.push(...parseF1(await res.json()));
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
        failed.add('f1');
      }
    }
  }

  const from = now.getTime() - 86400000;
  const to = now.getTime() + 400 * 86400000;
  const unique = new Map<string, SportEvent>();
  for (const e of events) {
    if (!e.sports.some((s) => wanted.has(s))) continue;
    const t = new Date(e.allDay ? `${e.start}T23:59:00` : e.start).getTime();
    if (t < from || t > to) continue;
    // Ten sam mecz bywa na dwóch stronach (np. strona reprezentacji i turnieju) — wolimy wersję z godziną.
    const prev = unique.get(e.id);
    if (!prev || (prev.allDay && !e.allDay)) unique.set(e.id, e);
  }
  const list = [...unique.values()].sort((a, b) => a.start.localeCompare(b.start));
  return { events: list, errors, failed: [...failed].filter((s) => wanted.has(s)) };
}
