/**
 * Odczyt terminarzy sportowych z tekstu artykułów Wikipedii (wikitekst) i z API jolpica-f1.
 *
 * Plik nie ma zależności — da się go testować samym Node'em (`node narzedzia/sport-test.mjs`).
 * Wikipedia jest źródłem, bo jako jedyna ma w jednym, otwartym miejscu terminarze reprezentacji
 * w piłce ręcznej i koszykówce, skoków, biatlonu i żużla — z darmowym API i zgodą na CORS.
 */

export type SportKey =
  | 'pilka_m'
  | 'pilka_k'
  | 'kosz_m'
  | 'kosz_k'
  | 'reczna_m'
  | 'reczna_k'
  | 'skoki_m'
  | 'skoki_k'
  | 'biatlon_m'
  | 'biatlon_k'
  | 'zuzel'
  | 'f1';

export interface SportEvent {
  id: string;
  /** Dyscypliny, do których należy wydarzenie (konkurs mieszany = mężczyźni i kobiety). */
  sports: SportKey[];
  title: string;
  /** ISO. Dla wydarzeń bez godziny: północ czasu lokalnego zapisana jako yyyy-MM-dd. */
  start: string;
  allDay: boolean;
  /** Długość w minutach (dla wydarzeń z godziną). */
  minutes: number;
  place?: string;
  competition?: string;
}

// ---------------------------------------------------------------------------
// Nazwy krajów
// ---------------------------------------------------------------------------

const KRAJE: Record<string, string> = {
  ALB: 'Albania', ALG: 'Algieria', AND: 'Andora', ANG: 'Angola', ARG: 'Argentyna', ARM: 'Armenia',
  AUS: 'Australia', AUT: 'Austria', AZE: 'Azerbejdżan', BAH: 'Bahamy', BHR: 'Bahrajn', BEL: 'Belgia',
  BIH: 'Bośnia i Hercegowina', BLR: 'Białoruś', BRA: 'Brazylia', BUL: 'Bułgaria', CAN: 'Kanada',
  CHI: 'Chile', CHN: 'Chiny', CIV: 'Wybrzeże Kości Słoniowej', CMR: 'Kamerun', COD: 'DR Konga',
  COL: 'Kolumbia', CPV: 'Republika Zielonego Przylądka', CRO: 'Chorwacja', CUB: 'Kuba', CYP: 'Cypr',
  CZE: 'Czechy', DEN: 'Dania', DOM: 'Dominikana', ECU: 'Ekwador', EGY: 'Egipt', ENG: 'Anglia',
  ESP: 'Hiszpania', EST: 'Estonia', FIN: 'Finlandia', FRA: 'Francja', FRO: 'Wyspy Owcze',
  GBR: 'Wielka Brytania', GEO: 'Gruzja', GER: 'Niemcy', GHA: 'Ghana', GIB: 'Gibraltar', GRE: 'Grecja',
  GUI: 'Gwinea', HUN: 'Węgry', IRL: 'Irlandia', IRN: 'Iran', IRQ: 'Irak', ISL: 'Islandia',
  ISR: 'Izrael', ITA: 'Włochy', JPN: 'Japonia', KAZ: 'Kazachstan', KOR: 'Korea Płd.', KOS: 'Kosowo',
  KSA: 'Arabia Saudyjska', KUW: 'Kuwejt', LAT: 'Łotwa', LIE: 'Liechtenstein', LTU: 'Litwa',
  LUX: 'Luksemburg', MAR: 'Maroko', MDA: 'Mołdawia', MEX: 'Meksyk', MKD: 'Macedonia Płn.',
  MLT: 'Malta', MNE: 'Czarnogóra', NED: 'Holandia', NGA: 'Nigeria', NIR: 'Irlandia Płn.',
  NOR: 'Norwegia', NZL: 'Nowa Zelandia', PAR: 'Paragwaj', PER: 'Peru', POL: 'Polska',
  POR: 'Portugalia', PUR: 'Portoryko', QAT: 'Katar', ROU: 'Rumunia', RSA: 'RPA', RUS: 'Rosja',
  SCO: 'Szkocja', SEN: 'Senegal', SLO: 'Słowenia', SMR: 'San Marino', SRB: 'Serbia',
  SUI: 'Szwajcaria', SVK: 'Słowacja', SWE: 'Szwecja', TUN: 'Tunezja', TUR: 'Turcja', UAE: 'ZEA',
  UKR: 'Ukraina', URU: 'Urugwaj', USA: 'USA', UZB: 'Uzbekistan', VEN: 'Wenezuela', WAL: 'Walia',
  // Kody FIFA różniące się od olimpijskich.
  LVA: 'Łotwa', KVX: 'Kosowo', BHU: 'Bhutan', CRC: 'Kostaryka', HON: 'Honduras', JAM: 'Jamajka',
  MAS: 'Malezja', PHI: 'Filipiny', TPE: 'Tajwan', VIE: 'Wietnam', SVN: 'Słowenia',
};

const MIASTA: Record<string, string> = {
  Warsaw: 'Warszawa', Prague: 'Praga', Vienna: 'Wiedeń', Rome: 'Rzym', Munich: 'Monachium',
  Cologne: 'Kolonia', Belgrade: 'Belgrad', Bucharest: 'Bukareszt', Lisbon: 'Lizbona', Athens: 'Ateny',
  Brussels: 'Bruksela', Copenhagen: 'Kopenhaga', Moscow: 'Moskwa', Kyiv: 'Kijów', Kiev: 'Kijów',
  Vilnius: 'Wilno', Riga: 'Ryga', Tallinn: 'Tallinn', Helsinki: 'Helsinki', Stockholm: 'Sztokholm',
  Oslo: 'Oslo', Zagreb: 'Zagrzeb', Ljubljana: 'Lublana', Bratislava: 'Bratysława', Budapest: 'Budapeszt',
  Paris: 'Paryż', London: 'Londyn', Dublin: 'Dublin', Geneva: 'Genewa', Zurich: 'Zurych', Milan: 'Mediolan',
  Turin: 'Turyn', Naples: 'Neapol', Florence: 'Florencja', Venice: 'Wenecja', Seville: 'Sewilla',
  Hanover: 'Hanower', Nuremberg: 'Norymberga', Antwerp: 'Antwerpia', 'The Hague': 'Haga', Tbilisi: 'Tbilisi',
};

/** Polskie nazwy rozgrywek z pola „round” (np. „2027 FIFA Women's World Cup qualification”). */
export function translateRound(raw: string): string {
  const r = raw.trim();
  if (!r) return '';
  if (/^friendl/i.test(r)) return 'Mecz towarzyski';
  const y = r.match(/\b(19|20)\d{2}(?:[–-]\d{2})?\b/)?.[0] ?? '';
  const women = /women/i.test(r);
  const k = women ? ' kobiet' : '';
  const q = /qualif/i.test(r);
  if (/nations league/i.test(r)) return `Liga Narodów${k} ${y}`.trim();
  if (/world cup/i.test(r)) return `${q ? 'Kwalifikacje ' : ''}MŚ${k} ${y}`.trim();
  if (/\beuro(pean championship)?\b|uefa euro/i.test(r)) return `${q ? 'Kwalifikacje ' : ''}ME${k} ${y}`.trim();
  if (/olympic/i.test(r)) return `Igrzyska olimpijskie ${y}`.trim();
  return r;
}

function polishPlace(raw: string): string {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s, i, all) => !(i === all.length - 1 && i > 0 && Object.values(KRAJE_EN_FULL).includes(s)))
    .map((s) => MIASTA[s] ?? s)
    .join(', ');
}

const KRAJE_EN_FULL: Record<string, string> = {
  POL: 'Poland', GER: 'Germany', FRA: 'France', ESP: 'Spain', ITA: 'Italy', IRL: 'Ireland', NED: 'Netherlands',
  ENG: 'England', SCO: 'Scotland', WAL: 'Wales', CRO: 'Croatia', CZE: 'Czech Republic', SVK: 'Slovakia',
  HUN: 'Hungary', AUT: 'Austria', SUI: 'Switzerland', BEL: 'Belgium', POR: 'Portugal', SWE: 'Sweden',
  NOR: 'Norway', DEN: 'Denmark', FIN: 'Finland', ROU: 'Romania', SRB: 'Serbia', UKR: 'Ukraine', TUR: 'Turkey',
  GRE: 'Greece', SLO: 'Slovenia', LTU: 'Lithuania', LAT: 'Latvia', EST: 'Estonia', ISL: 'Iceland',
};

export function countryName(code: string): string {
  return KRAJE[code] ?? code;
}

// ---------------------------------------------------------------------------
// Narzędzia wikitekstu
// ---------------------------------------------------------------------------

const MIESIACE: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8,
  september: 9, october: 10, november: 11, december: 12,
};

/** Dzieli tekst po znaku `sep`, pomijając go wewnątrz {{…}} i [[…]]. */
export function splitTopLevel(s: string, sep: string): string[] {
  const out: string[] = [];
  let depthT = 0;
  let depthL = 0;
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2);
    if (two === '{{') { depthT++; cur += two; i++; continue; }
    if (two === '}}' && depthT > 0) { depthT--; cur += two; i++; continue; }
    if (two === '[[') { depthL++; cur += two; i++; continue; }
    if (two === ']]' && depthL > 0) { depthL--; cur += two; i++; continue; }
    if (depthT === 0 && depthL === 0 && s.startsWith(sep, i)) {
      out.push(cur);
      cur = '';
      i += sep.length - 1;
      continue;
    }
    cur += s[i];
  }
  out.push(cur);
  return out;
}

/** Zamienia wikitekst na zwykły tekst (linki → etykiety, szablony flag → nic). */
export function plain(s: string): string {
  let t = s
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?(small|sub|sup|span|div|b|i)[^>]*>/gi, '');
  // Szablony z treścią do zachowania.
  for (let i = 0; i < 4; i++) {
    t = t
      .replace(/\{\{\s*(?:nowrap|small|nobr)\s*\|([^{}]*)\}\}/gi, '$1')
      .replace(/\{\{\s*abbr\s*\|([^|{}]*)\|[^{}]*\}\}/gi, '$1')
      .replace(/\{\{[^{}]*\}\}/g, '');
  }
  t = t
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\[https?:\/\/\S+\s*([^\]]*)\]/g, '$1')
    .replace(/'''?/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t;
}

interface Ymd {
  y: number | null;
  m: number;
  d: number;
}

/** „26 November 2026”, „November 26, 2026”, „1 December”, {{Start date|2026|11|26}}. */
export function parseDate(raw: string): Ymd | null {
  const sd = raw.match(/\{\{\s*start date[^|]*\|\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})/i);
  if (sd) return { y: +sd[1], m: +sd[2], d: +sd[3] };
  const t = plain(raw);
  const a = t.match(/(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?/);
  if (a && MIESIACE[a[2].toLowerCase()]) return { y: a[3] ? +a[3] : null, m: MIESIACE[a[2].toLowerCase()], d: +a[1] };
  const b = t.match(/([A-Za-z]+)\s+(\d{1,2}),?(?:\s+(\d{4}))?/);
  if (b && MIESIACE[b[1].toLowerCase()]) return { y: b[3] ? +b[3] : null, m: MIESIACE[b[1].toLowerCase()], d: +b[2] };
  return null;
}

/** Dzień bez roku: bierzemy rok, w którym data wypada najbliżej „teraz” (w przód do 11 miesięcy). */
function resolveYear(d: Ymd, now: Date): number {
  if (d.y) return d.y;
  const y = now.getFullYear();
  const candidate = Date.UTC(y, d.m - 1, d.d);
  return candidate < now.getTime() - 30 * 86400000 ? y + 1 : y;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Ostatnia niedziela miesiąca (UTC) — do wyliczenia czasu letniego w Europie. */
function lastSunday(y: number, m: number): number {
  const last = new Date(Date.UTC(y, m, 0));
  return last.getUTCDate() - last.getUTCDay();
}

/** Przesunięcie czasu polskiego (CET/CEST) w danym dniu, w godzinach. */
export function warsawOffset(y: number, m: number, d: number): number {
  if (m < 3 || m > 10) return 1;
  if (m > 3 && m < 10) return 2;
  if (m === 3) return d >= lastSunday(y, 3) ? 2 : 1;
  return d >= lastSunday(y, 10) ? 1 : 2;
}

/** Godzina z pola `time` (np. „21:45 CEST (UTC+2)”) → UTC. Bez strefy zakładamy `fallbackOffset`. */
export function toUtc(date: Ymd & { y: number }, rawTime: string, fallbackOffset: number | null): Date | null {
  const tm = plain(rawTime).match(/(\d{1,2})[:.](\d{2})/);
  if (!tm) return null;
  const off = rawTime.match(/UTC\s*([+−–-])\s*(\d{1,2})(?::?(\d{2}))?/);
  let offset: number;
  if (off) {
    const sign = off[1] === '+' ? 1 : -1;
    offset = sign * (+off[2] + (off[3] ? +off[3] / 60 : 0));
  } else if (/\bUTC\b|\bGMT\b/.test(rawTime)) {
    offset = 0;
  } else {
    offset = fallbackOffset ?? warsawOffset(date.y, date.m, date.d);
  }
  return new Date(Date.UTC(date.y, date.m - 1, date.d, +tm[1], +tm[2]) - offset * 3600000);
}

/** Wyszukuje kolejne szablony `{{nazwa …}}` (z poprawnym liczeniem nawiasów). */
export function findTemplates(text: string, namePattern: RegExp): { body: string; index: number }[] {
  const out: { body: string; index: number }[] = [];
  const re = /\{\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const start = m.index;
    const head = text.slice(start + 2, start + 60);
    if (!namePattern.test(head)) continue;
    let depth = 0;
    let i = start;
    for (; i < text.length - 1; i++) {
      if (text[i] === '{' && text[i + 1] === '{') { depth++; i++; }
      else if (text[i] === '}' && text[i + 1] === '}') { depth--; i++; if (depth === 0) break; }
    }
    out.push({ body: text.slice(start + 2, i - 1), index: start });
    re.lastIndex = i;
  }
  return out;
}

export function templateParams(body: string): Record<string, string> {
  const parts = splitTopLevel(body, '|');
  const params: Record<string, string> = {};
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=');
    if (eq < 0) continue;
    params[p.slice(0, eq).trim().toLowerCase()] = p.slice(eq + 1).trim();
  }
  return params;
}

/** Kod kraju z {{fb|POL}}, {{bkw-rt|POL}}, {{flagdeco|POL}} Poland, {{flagicon|POL}} … */
export function teamCode(raw: string): string | null {
  const m = raw.match(/\{\{\s*[a-z]+(?:-rt)?\s*\|\s*([A-Z]{3})\b/i);
  if (m) return m[1].toUpperCase();
  const t = plain(raw);
  const byName = Object.entries(KRAJE_EN).find(([, name]) => t === name || t.endsWith(' ' + name));
  return byName ? byName[0] : null;
}

const KRAJE_EN: Record<string, string> = { POL: 'Poland' };

/** Ostatnia wzmianka „UTC+1” przed miejscem w tekście (np. „All times are local (UTC+1)”). */
function pageOffsetBefore(text: string, index: number): number | null {
  const before = text.slice(Math.max(0, index - 20000), index);
  const all = [...before.matchAll(/[Aa]ll times (?:are )?(?:local|listed)[^\n]{0,80}?UTC\s*([+−–-])\s*(\d{1,2})/g)];
  const last = all[all.length - 1];
  if (!last) return null;
  return (last[1] === '+' ? 1 : -1) * +last[2];
}

// ---------------------------------------------------------------------------
// Mecze reprezentacji (football box, basketballbox, handballbox)
// ---------------------------------------------------------------------------

export interface MatchSource {
  sport: SportKey;
  /** Nazwa rozgrywek po polsku, gdy pole „round” nic nie mówi. */
  competition: string;
  minutes: number;
}

const PREFIKS: Partial<Record<SportKey, string>> = {
  pilka_m: 'Piłka nożna',
  pilka_k: 'Piłka nożna kobiet',
  kosz_m: 'Koszykówka',
  kosz_k: 'Koszykówka kobiet',
  reczna_m: 'Piłka ręczna',
  reczna_k: 'Piłka ręczna kobiet',
};

export function parseMatches(text: string, src: MatchSource, now: Date, team = 'POL'): SportEvent[] {
  const boxes = findTemplates(text, /^\s*(football ?box|basketballbox|handballbox|volleyballbox)/i);
  const out: SportEvent[] = [];
  for (const { body, index } of boxes) {
    const p = templateParams(body);
    const t1 = p.team1 ?? p.teama ?? p.home ?? '';
    const t2 = p.team2 ?? p.teamb ?? p.away ?? '';
    const c1 = teamCode(t1);
    const c2 = teamCode(t2);
    if (c1 !== team && c2 !== team) continue;
    const ymd = parseDate(p.date ?? '');
    if (!ymd) continue;
    const date = { ...ymd, y: resolveYear(ymd, now) };
    const start = toUtc(date, p.time ?? '', pageOffsetBefore(text, index));
    const dayIso = `${date.y}-${pad(date.m)}-${pad(date.d)}`;
    const teams = `${c1 ? countryName(c1) : plain(t1)} – ${c2 ? countryName(c2) : plain(t2)}`;
    const title = PREFIKS[src.sport] ? `${PREFIKS[src.sport]}: ${teams}` : teams;
    const round = translateRound(plain(p.round ?? ''));
    const place = polishPlace(plain([p.stadium ?? p.arena ?? '', p.location ?? ''].filter(Boolean).join(', ')));
    out.push({
      id: `${src.sport}:${dayIso}:${c1}-${c2}`,
      sports: [src.sport],
      title,
      start: start ? start.toISOString() : dayIso,
      allDay: !start,
      minutes: src.minutes,
      place: place || undefined,
      competition: round || src.competition,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tabele kalendarza (skoki, biatlon)
// ---------------------------------------------------------------------------

export interface TableRow {
  h2: string;
  h3: string;
  /** Wiersz-nagłówek wewnątrz tabeli, np. „Mixed team”. */
  group: string;
  cells: string[];
}

/** Wszystkie wiersze tabel w artykule, z nagłówkami sekcji, w których leżą. */
export function tableRows(text: string): TableRow[] {
  const rows: TableRow[] = [];
  let h2 = '';
  let h3 = '';
  let inTable = 0;
  let group = '';
  let cells: string[] | null = null;
  const flush = () => {
    if (cells && cells.length) rows.push({ h2, h3, group, cells });
    cells = null;
  };
  for (const line of text.split('\n')) {
    const h = line.match(/^(={2,4})\s*(.*?)\s*\1\s*$/);
    if (h && !inTable) {
      if (h[1].length === 2) { h2 = plain(h[2]); h3 = ''; } else if (h[1].length === 3) h3 = plain(h[2]);
      continue;
    }
    if (line.startsWith('{|')) { inTable++; group = ''; cells = null; continue; }
    if (!inTable) continue;
    if (line.startsWith('|}')) { flush(); inTable--; continue; }
    if (line.startsWith('|-')) { flush(); cells = []; continue; }
    if (line.startsWith('|+')) continue;
    if (line.startsWith('!')) {
      // Nagłówek z colspan wewnątrz tabeli = podział na grupy („Mixed team”).
      if (/colspan/i.test(line)) {
        const parts = splitTopLevel(line.slice(1), '|');
        group = plain(parts[parts.length - 1]);
      }
      continue;
    }
    if (line.startsWith('|') && cells) {
      for (const part of splitTopLevel(line.slice(1), '||')) {
        const seg = splitTopLevel(part, '|');
        // „align="right" |treść” — część przed pierwszą kreską to atrybuty komórki.
        const content = seg.length > 1 && /=\s*["']?|rowspan|colspan|style|align/i.test(seg[0]) ? seg.slice(1).join('|') : part;
        cells.push(content.trim());
      }
    } else if (cells && cells.length) {
      // Kontynuacja wieloliniowej komórki.
      cells[cells.length - 1] += '\n' + line;
    }
  }
  return rows;
}

const BIATLON: Record<string, string> = {
  IND: 'bieg indywidualny',
  SIND: 'skrócony bieg indywidualny',
  SPR: 'sprint',
  PUR: 'bieg pościgowy',
  MSS: 'bieg ze startu wspólnego',
  MS: 'bieg ze startu wspólnego',
};

function placeFromCell(cell: string): string | null {
  if (!/\{\{\s*flag(icon|deco)/i.test(cell)) return null;
  const hill = cell.match(/<small>\s*\(([\s\S]*?)\)\s*<\/small>/i);
  const name = plain(cell.replace(/<small>[\s\S]*?<\/small>/gi, ''));
  const hillName = hill ? plain(hill[1]) : '';
  return hillName ? `${name} (${hillName})` : name;
}

function dateFromCells(cells: string[]): Ymd | null {
  for (const c of cells) {
    if (/\d{1,2}\s*[–-]\s*\d{1,2}/.test(plain(c))) continue; // przedziały dat w tabeli zbiorczej
    const d = parseDate(c);
    if (d && d.y) return d;
  }
  return null;
}

/** Puchar Świata w skokach: sekcje „Men's Individual”, „Women's Individual”, „Team events”. */
export function parseSkiJumping(text: string): SportEvent[] {
  const out: SportEvent[] = [];
  const places = new Map<string, string>();
  for (const row of tableRows(text)) {
    if (!/calendar/i.test(row.h3)) continue;
    const key = `${row.h2}|${row.group}`;
    const place = row.cells.map(placeFromCell).find(Boolean);
    if (place) places.set(key, place);
    const ymd = dateFromCells(row.cells);
    if (!ymd || !ymd.y) continue;
    const size = row.cells.map((c) => plain(c)).find((c) => /^[LFN]\s*\d*$/.test(c));
    const hillType = size?.startsWith('F') ? 'skocznia mamucia' : size?.startsWith('N') ? 'skocznia normalna' : '';

    let sports: SportKey[];
    let kind: string;
    const h2 = row.h2.toLowerCase();
    const g = row.group.toLowerCase();
    if (h2.includes('women')) { sports = ['skoki_k']; kind = 'konkurs indywidualny kobiet'; }
    else if (h2.includes('men') && !h2.includes('team')) { sports = ['skoki_m']; kind = 'konkurs indywidualny mężczyzn'; }
    else if (g.includes('mixed')) { sports = ['skoki_m', 'skoki_k']; kind = 'konkurs drużyn mieszanych'; }
    else if (g.includes('women')) { sports = ['skoki_k']; kind = g.includes('super') ? 'superdrużyny kobiet' : 'konkurs drużynowy kobiet'; }
    else { sports = ['skoki_m']; kind = g.includes('super') ? 'superdrużyny mężczyzn' : 'konkurs drużynowy mężczyzn'; }

    const dayIso = `${ymd.y}-${pad(ymd.m)}-${pad(ymd.d)}`;
    const where = places.get(key) ?? '';
    out.push({
      id: `skoki:${dayIso}:${kind}`,
      sports,
      title: `Skoki – PŚ: ${where.split(' (')[0] || 'konkurs'} (${kind})`,
      start: dayIso,
      allDay: true,
      minutes: 0,
      place: [where, hillType].filter(Boolean).join(', ') || undefined,
      competition: 'Puchar Świata w skokach narciarskich',
    });
  }
  return out;
}

/** Puchar Świata w biatlonie: sekcje „Men”, „Women” (kalendarz i sztafety) oraz „Mixed Relay”. */
export function parseBiathlon(text: string): SportEvent[] {
  const out: SportEvent[] = [];
  const places = new Map<string, string>();
  for (const row of tableRows(text)) {
    const h2 = row.h2.toLowerCase();
    const h3 = row.h3.toLowerCase();
    const isMixed = h2.startsWith('mixed');
    const relay = h3.startsWith('relay') || isMixed;
    if (!(h3 === 'calendar' || h3.startsWith('relay') || (isMixed && !/standing|leader/.test(h3)))) continue;
    if (!isMixed && !/^(men|women)$/.test(h2)) continue;
    const key = `${row.h2}|${row.h3}`;
    const place = row.cells.map(placeFromCell).find(Boolean);
    if (place) places.set(key, place.replace(/\s*\(\d+\)\s*$/, ''));
    const ymd = dateFromCells(row.cells);
    if (!ymd || !ymd.y) continue;

    const women = h2 === 'women';
    const sports: SportKey[] = isMixed ? ['biatlon_m', 'biatlon_k'] : [women ? 'biatlon_k' : 'biatlon_m'];
    let kind: string;
    if (relay) {
      const single = row.cells.some((c) => /single/i.test(c)) || /single/i.test(row.group);
      kind = isMixed ? (single ? 'pojedyncza sztafeta mieszana' : 'sztafeta mieszana') : women ? 'sztafeta kobiet' : 'sztafeta mężczyzn';
    } else {
      const disc = row.cells.map((c) => plain(c)).find((c) => /\b(IND|SIND|SPR|PUR|MSS|MS)\b/.test(c)) ?? '';
      const code = disc.match(/\b(SIND|IND|SPR|PUR|MSS|MS)\b/)?.[1] ?? '';
      const dist = disc.match(/[\d.,]+\s*km/)?.[0] ?? '';
      kind = `${BIATLON[code] ?? 'bieg'}${dist ? ' ' + dist.replace('.', ',') : ''} ${women ? 'kobiet' : 'mężczyzn'}`;
    }
    const dayIso = `${ymd.y}-${pad(ymd.m)}-${pad(ymd.d)}`;
    const where = places.get(key) ?? '';
    out.push({
      id: `biatlon:${dayIso}:${kind}`,
      sports,
      title: `Biatlon – PŚ: ${kind}${where ? `, ${where}` : ''}`,
      start: dayIso,
      allDay: true,
      minutes: 0,
      place: where || undefined,
      competition: 'Puchar Świata w biatlonie',
    });
  }
  return out;
}

/** Grand Prix na żużlu: szablon {{SGP Calendar/r|rok|kraj|runda|dzień|stadion|miasto…}}. */
export function parseSpeedwayGP(text: string): SportEvent[] {
  const out: SportEvent[] = [];
  for (const { body } of findTemplates(text, /^\s*SGP Calendar\/r\s*\|/i)) {
    const p = splitTopLevel(body, '|').map((s) => s.trim());
    const year = +p[1];
    const ymd = parseDate(`${p[4]} ${year}`);
    if (!ymd || !ymd.y) continue;
    const dayIso = `${ymd.y}-${pad(ymd.m)}-${pad(ymd.d)}`;
    const city = MIASTA[plain(p[6] ?? '')] ?? plain(p[6] ?? '');
    const stadium = plain(p[5] ?? '');
    out.push({
      id: `zuzel:sgp:${dayIso}`,
      sports: ['zuzel'],
      title: `Żużel – Grand Prix: ${city || countryName(p[2])}${city ? ` (${countryName(p[2])})` : ''}, runda ${p[3]}`,
      start: dayIso,
      allDay: true,
      minutes: 0,
      place: [stadium, city].filter(Boolean).join(', ') || undefined,
      competition: 'Indywidualne mistrzostwa świata na żużlu – Grand Prix',
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Formuła 1 (jolpica-f1, następca Ergasta)
// ---------------------------------------------------------------------------

interface JolpicaSession {
  date: string;
  time?: string;
}

interface JolpicaRace extends JolpicaSession {
  round: string;
  raceName: string;
  Circuit?: { circuitName?: string; Location?: { locality?: string; country?: string } };
  Qualifying?: JolpicaSession;
  Sprint?: JolpicaSession;
  SprintQualifying?: JolpicaSession;
}

const GP: Record<string, string> = {
  Australian: 'Australii', Chinese: 'Chin', Japanese: 'Japonii', Bahrain: 'Bahrajnu', 'Saudi Arabian': 'Arabii Saudyjskiej',
  Miami: 'Miami', 'Emilia Romagna': 'Emilii-Romanii', Monaco: 'Monako', Spanish: 'Hiszpanii', Canadian: 'Kanady',
  Austrian: 'Austrii', British: 'Wielkiej Brytanii', Belgian: 'Belgii', Hungarian: 'Węgier', Dutch: 'Holandii',
  Italian: 'Włoch', Azerbaijan: 'Azerbejdżanu', Singapore: 'Singapuru', 'United States': 'USA', 'Mexico City': 'Meksyku',
  'São Paulo': 'São Paulo', 'Las Vegas': 'Las Vegas', Qatar: 'Kataru', 'Abu Dhabi': 'Abu Zabi', Madrid: 'Madrytu',
  Barcelona: 'Barcelony', 'Barcelona-Catalunya': 'Barcelony', Portuguese: 'Portugalii', Turkish: 'Turcji',
};

function gpName(raceName: string): string {
  const base = raceName.replace(/\s*Grand Prix$/i, '');
  return `Grand Prix ${GP[base] ?? base}`;
}

export function parseF1(json: unknown): SportEvent[] {
  const races: JolpicaRace[] =
    (json as { MRData?: { RaceTable?: { Races?: JolpicaRace[] } } })?.MRData?.RaceTable?.Races ?? [];
  const out: SportEvent[] = [];
  for (const r of races) {
    const name = gpName(r.raceName);
    const place = [r.Circuit?.circuitName, r.Circuit?.Location?.locality].filter(Boolean).join(', ') || undefined;
    const sessions: [string, JolpicaSession | undefined, number][] = [
      ['wyścig', r, 120],
      ['kwalifikacje', r.Qualifying, 60],
      ['sprint', r.Sprint, 45],
    ];
    for (const [label, s, minutes] of sessions) {
      if (!s?.date) continue;
      const allDay = !s.time;
      out.push({
        id: `f1:${r.date}:${label}`,
        sports: ['f1'],
        title: `F1 – ${name}: ${label}`,
        start: allDay ? s.date : new Date(`${s.date}T${s.time}`).toISOString(),
        allDay,
        minutes,
        place,
        competition: `Formuła 1 – runda ${r.round}`,
      });
    }
  }
  return out;
}
