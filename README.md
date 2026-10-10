# Kalendarz

Kalendarz z przypomnieniami — bez konta, bez reklam, bez wysyłania czegokolwiek do internetu.
Wszystkie dane zostają w przeglądarce albo na telefonie.

Wersja webowa: **https://beagleapps.pl/apps/kalendarz/**
APK: **https://beagleapps.pl/apk/kalendarz.apk**

## Co potrafi

| | |
|---|---|
| **Pięć widoków** | rok (z mapą zajętości), miesiąc, tydzień, dzień i agenda najbliższych 30 dni |
| **Widżet na ekran główny** | dzisiejsza data, wydarzenia z najbliższego tygodnia, „+” dodaje wydarzenie, wiersz otwiera jego dzień |
| **Ikona dnia tygodnia** | ikona w launcherze pokazuje dzisiejszy dzień (PN–ND) i dopasowuje się do motywu ikon Androida 13+ |
| **Przypomnienia** | od 5 minut do doby przed wydarzeniem, pięć dźwięków, drzemka o 5 minut |
| **Wydarzenia cykliczne** | dziennie / tygodniowo / miesięcznie / rocznie, z odstępem i datą końca |
| **Własne kategorie** | nazwy i kolory z palety dwunastu barw, ukrywanie jednym kliknięciem |
| **Obsługa myszą i palcem** | przeciąganie wydarzeń, zmiana czasu trwania krawędzią, cofanie zmian |
| **Podsumowanie czasu** | ile godzin w tygodniu czy miesiącu zajmuje dana kategoria |
| **Import i eksport** | pliki `.ics` razem z regułami powtarzania i przypomnieniami |
| **Motywy** | jasny, ciemny albo zgodny z systemem |

## Uruchomienie

```bash
npm install
npm run dev
npm run build          # dist/ — wersja webowa (z Service Workerem)
npm run build:android  # dist/ — wersja do APK (BEZ Service Workera) + cap sync
```

> **Oba polecenia piszą do tego samego `dist/`.** Po `build:android` katalog zawiera
> wersję bez Service Workera. Jeśli kopiujesz pliki na stronę, rób to zaraz po
> `npm run build`, a nie po buildzie androidowym.

## Ścieżki względne

Aplikacja jest hostowana w podkatalogu (`/apps/kalendarz/`), więc wszystkie odwołania —
rejestracja Service Workera, `APP_SHELL`, fallback offline, ikony powiadomień oraz
`start_url` i `scope` manifestu — są **względne**. Przy ścieżkach bezwzględnych Service
Worker próbowałby zapisać w cache stronę spod `/`, a `manifest.webmanifest` i `icon.svg`
dawałyby 404, przez co instalacja workera w ogóle by się nie kończyła.

## Android

Capacitor, `applicationId` **com.marcin.kalendarz** — identyfikator sprzed konwencji
`com.beagleappsstudio.*`; po publikacji nie da się go zmienić, więc zostaje.

W trybie androidowym Service Worker jest wyłączany przez `VITE_ANDROID=true`
(`.env.android`): w APK wszystkie pliki są lokalne, a worker tylko cachowałby
nieaktualną wersję po podmianie APK. Powiadomienia planuje wtedy system Androida
przez `@capacitor/local-notifications`, nie worker.

```bash
npm run build:android
cd android && ./gradlew.bat assembleDebug --no-daemon
```

## Klucz podpisujący

`android/release.keystore` i `android/keystore.properties` **nie są w repozytorium** —
istnieją wyłącznie na dysku autora. Wzór pliku z konfiguracją: `android/keystore.properties.przyklad`.

Utrata klucza oznacza brak możliwości wydania aktualizacji aplikacji opublikowanej
w Sklepie Play.

## Materiały do Sklepu Play

W `sklep-play/` leżą gotowe teksty (`opis-sklepowy.md`), polityka prywatności,
deklaracja bezpieczeństwa danych, ikona 512, grafika promocyjna i zrzuty ekranu.

## Ikona z dniem tygodnia (Android)

W manifeście jest siedem aliasów `MainActivity` (`.IkonaPn` … `.IkonaNd`), każdy z własną ikoną
adaptacyjną z warstwą monochromatyczną. `IkonaDnia.java` włącza alias bieżącego dnia przy każdym
otwarciu aplikacji i alarmem tuż po północy (`IkonaDniaReceiver` — też po restarcie, aktualizacji
i zmianie daty). Wektory ikon generuje `narzedzia/ikony-dni.py` — nie edytuj ich ręcznie.

## Widżet (Android)

`WidzetKalendarza` (AppWidgetProvider) + `WidzetSerwis` (lista). Widżet nie widzi danych WebView —
aplikacja po każdej zmianie wysyła mu rozpisane wydarzenia na 14 dni (`src/utils/widget.ts` →
`WidzetPlugin.zapiszWydarzenia`, SharedPreferences `widzet_kalendarza`). Kliknięcia wracają do aplikacji
zdarzeniem `akcja` (`dzis` / `nowe` / `dzien`). Odświeżanie: co 30 min i o północy (`IkonaDniaReceiver`).
