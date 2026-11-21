/**
 * Test terminarzy sportowych na prawdziwych danych:  node narzedzia/sport-test.ts
 * Pobiera te same strony co aplikacja i wypisuje nadchodzące wydarzenia każdej dyscypliny.
 */
import { fetchSportEvents } from '../src/sport/fetchSport.ts';

const now = new Date();
const { events, errors } = await fetchSportEvents(
  ['pilka_m', 'pilka_k', 'kosz_m', 'kosz_k', 'reczna_m', 'reczna_k', 'skoki_m', 'skoki_k', 'biatlon_m', 'biatlon_k', 'zuzel', 'f1'],
  now,
);
const bySport = new Map<string, typeof events>();
for (const e of events) for (const s of e.sports) bySport.set(s, [...(bySport.get(s) ?? []), e]);
for (const [s, list] of bySport) {
  console.log(`\n=== ${s}: ${list.length}`);
  for (const e of list.slice(0, 6)) console.log(`  ${e.start}  ${e.title}  [${e.competition ?? ''}]  ${e.place ?? ''}`);
}
console.log('\nbłędy:', errors);
