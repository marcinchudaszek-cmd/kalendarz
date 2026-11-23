import { parseBiathlon, parseF1, parseMatches, parseSkiJumping, parseSpeedwayGP } from './parsers.ts';
import type { SportEvent, SportKey } from './parsers.ts';

/**
 * Skąd bierzemy terminarze. Tytuły artykułów Wikipedii budujemy z roku, więc lista sama
 * „przesuwa się” z sezonem — nie trzeba wydawać nowej wersji aplikacji co rok.
 */

export interface PageSpec {
  title: string;
  sports: SportKey[];
  parse: (text: string, now: Date) => SportEvent[];
}

const match = (sport: SportKey, competition: string, minutes: number) => (text: string, now: Date) =>
  parseMatches(text, { sport, competition, minutes }, now);

export function wikipediaPages(now: Date): PageSpec[] {
  const y = now.getFullYear();
  const years = [y - 1, y, y + 1, y + 2];
  // Sezon zimowy „2026–27” trwa od listopada do marca.
  const winter = now.getMonth() >= 6 ? [y, y + 1] : [y - 1, y];
  const season = (a: number) => `${a}–${String(a + 1).slice(2)}`;
  const pages: PageSpec[] = [];

  // Piłka nożna — strony reprezentacji mają terminarz wszystkich meczów (z godzinami).
  pages.push(
    { title: 'Poland national football team results (2020–present)', sports: ['pilka_m'], parse: match('pilka_m', 'Mecz reprezentacji', 105) },
    { title: 'Poland national football team', sports: ['pilka_m'], parse: match('pilka_m', 'Mecz reprezentacji', 105) },
    { title: "Poland women's national football team", sports: ['pilka_k'], parse: match('pilka_k', 'Mecz reprezentacji kobiet', 105) },
    { title: "Poland women's national football team results", sports: ['pilka_k'], parse: match('pilka_k', 'Mecz reprezentacji kobiet', 105) },
  );

  for (const a of years) {
    // Koszykówka
    pages.push(
      { title: `${a} FIBA Basketball World Cup qualification (Europe)`, sports: ['kosz_m'], parse: match('kosz_m', `Kwalifikacje MŚ ${a} w koszykówce`, 120) },
      { title: `${a} FIBA Basketball World Cup`, sports: ['kosz_m'], parse: match('kosz_m', `MŚ ${a} w koszykówce`, 120) },
      { title: `EuroBasket ${a} qualification`, sports: ['kosz_m'], parse: match('kosz_m', `Kwalifikacje EuroBasket ${a}`, 120) },
      { title: `EuroBasket ${a}`, sports: ['kosz_m'], parse: match('kosz_m', `EuroBasket ${a}`, 120) },
      { title: `EuroBasket Women ${a} qualification`, sports: ['kosz_k'], parse: match('kosz_k', `Kwalifikacje EuroBasket kobiet ${a}`, 120) },
      { title: `EuroBasket Women ${a}`, sports: ['kosz_k'], parse: match('kosz_k', `EuroBasket kobiet ${a}`, 120) },
      { title: `${a} FIBA Women's Basketball World Cup`, sports: ['kosz_k'], parse: match('kosz_k', `MŚ kobiet ${a} w koszykówce`, 120) },
      { title: `${a} FIBA Women's Basketball World Cup qualification`, sports: ['kosz_k'], parse: match('kosz_k', `Kwalifikacje MŚ kobiet ${a}`, 120) },
    );
    // Piłka ręczna
    pages.push(
      { title: `${a} World Men's Handball Championship`, sports: ['reczna_m'], parse: match('reczna_m', `MŚ ${a} w piłce ręcznej`, 90) },
      { title: `${a} World Men's Handball Championship – European qualification`, sports: ['reczna_m'], parse: match('reczna_m', `Kwalifikacje MŚ ${a} w piłce ręcznej`, 90) },
      { title: `${a} European Men's Handball Championship`, sports: ['reczna_m'], parse: match('reczna_m', `ME ${a} w piłce ręcznej`, 90) },
      { title: `${a} European Men's Handball Championship qualification`, sports: ['reczna_m'], parse: match('reczna_m', `Kwalifikacje ME ${a} w piłce ręcznej`, 90) },
      { title: `${a} World Women's Handball Championship`, sports: ['reczna_k'], parse: match('reczna_k', `MŚ kobiet ${a} w piłce ręcznej`, 90) },
      { title: `${a} World Women's Handball Championship – European qualification`, sports: ['reczna_k'], parse: match('reczna_k', `Kwalifikacje MŚ kobiet ${a}`, 90) },
      { title: `${a} European Women's Handball Championship`, sports: ['reczna_k'], parse: match('reczna_k', `ME kobiet ${a} w piłce ręcznej`, 90) },
      { title: `${a} European Women's Handball Championship qualification`, sports: ['reczna_k'], parse: match('reczna_k', `Kwalifikacje ME kobiet ${a}`, 90) },
    );
    // Hokej na lodzie — mistrzostwa świata we wszystkich dywizjach (Polska bywa w elicie i w Dywizji I).
    for (const [div, nazwa] of [['', 'MŚ'], [' Division I', 'MŚ Dywizji I'], [' Division II', 'MŚ Dywizji II']] as const) {
      pages.push(
        { title: `${a} IIHF World Championship${div}`, sports: ['hokej_m'], parse: match('hokej_m', `${nazwa} ${a} w hokeju`, 150) },
        { title: `${a} IIHF Women's World Championship${div}`, sports: ['hokej_k'], parse: match('hokej_k', `${nazwa} kobiet ${a} w hokeju`, 150) },
      );
    }
    pages.push(
      { title: `Ice hockey at the ${a} Winter Olympics – Men's qualification`, sports: ['hokej_m'], parse: match('hokej_m', `Kwalifikacje olimpijskie ${a} w hokeju`, 150) },
      { title: `Ice hockey at the ${a} Winter Olympics – Men's tournament`, sports: ['hokej_m'], parse: match('hokej_m', `Igrzyska ${a} – hokej`, 150) },
      { title: `Ice hockey at the ${a} Winter Olympics – Women's qualification`, sports: ['hokej_k'], parse: match('hokej_k', `Kwalifikacje olimpijskie kobiet ${a} w hokeju`, 150) },
      { title: `Ice hockey at the ${a} Winter Olympics – Women's tournament`, sports: ['hokej_k'], parse: match('hokej_k', `Igrzyska ${a} – hokej kobiet`, 150) },
    );
    // Żużel
    pages.push({ title: `${a} Speedway Grand Prix`, sports: ['zuzel'], parse: (t) => parseSpeedwayGP(t) });
  }

  for (const a of winter) {
    pages.push(
      { title: `${season(a)} FIS Ski Jumping World Cup`, sports: ['skoki_m', 'skoki_k'], parse: (t) => parseSkiJumping(t) },
      { title: `${season(a)} Biathlon World Cup`, sports: ['biatlon_m', 'biatlon_k'], parse: (t) => parseBiathlon(t) },
    );
  }
  return pages;
}

export const F1_URL = (year: number) => `https://api.jolpi.ca/ergast/f1/${year}.json`;
export { parseF1 };
