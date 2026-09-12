# Wydanie Kalendarza w Sklepie Play — lista kroków

## 1. Klucz podpisujący (robisz raz, w Android Studio)

1. **File → Open** → wskaż katalog
   `C:\Users\marci\Desktop\Projekty\google-calendar-style-interface\android`
   (otwierasz sam katalog `android`, nie cały projekt).
2. **Build → Generate Signed App Bundle / APK…** → wybierz **Android App Bundle** → **Next**.
3. Przy „Key store path" kliknij **Create new…** i wypełnij:

   | Pole | Wartość |
   |---|---|
   | Key store path | `…\google-calendar-style-interface\android\release.keystore` |
   | Password / Confirm | Twoje hasło magazynu |
   | Alias | `kalendarz` |
   | Password / Confirm (klucza) | Twoje hasło klucza |
   | Validity (years) | zostaw 25 lub więcej |
   | First and Last Name / Organization / Country Code | cokolwiek sensownego, np. kraj `PL` |

4. **OK** → **Next** → zaznacz wariant **release** → **Create**.

Kreator zapisze klucz i od razu zbuduje podpisany pakiet.

## 2. Podpięcie klucza do budowania z konsoli

Żeby kolejne wydania szły jednym poleceniem, bez klikania w kreatorze:

1. Skopiuj `android/keystore.properties.przyklad` jako `android/keystore.properties`.
2. Wpisz w nim cztery wartości podane w kreatorze (`storeFile=release.keystore`,
   `storePassword`, `keyAlias=kalendarz`, `keyPassword`).

Oba pliki są w `.gitignore`, więc nie trafią do repozytorium.

Od tej pory podpisany pakiet powstaje poleceniem:

```
npm run build:android
cd android
.\gradlew.bat bundleRelease
```

Wynik: `android/app/build/outputs/bundle/release/app-release.aab`

## 3. Kopia zapasowa klucza

Skopiuj `release.keystore` i hasła w bezpieczne miejsce **poza tym dyskiem**
(menedżer haseł, zaszyfrowany dysk, pendrive w szufladzie).

Jeśli w Play Console włączysz podpisywanie aplikacji przez Google (domyślne),
utrata tego klucza jest odwracalna — Google pozwala zarejestrować nowy klucz
przesyłania. Bez tej opcji utrata oznacza brak możliwości aktualizacji aplikacji.

## 4. Play Console — nowa aplikacja

| Pole | Wartość |
|---|---|
| Nazwa aplikacji | Kalendarz: plany i alerty |
| Język domyślny | polski (Polska) |
| Typ | Aplikacja |
| Płatna czy bezpłatna | Bezpłatna |

## 5. Karta aplikacji („Główna strona sklepu")

Wszystko gotowe w katalogu `sklep-play/`:

- **Krótki opis** i **pełny opis** → `opis-sklepowy.md`
- **Ikona 512×512** → `ikona-512.png`
- **Grafika promocyjna 1024×500** → `grafika-promocyjna-1024x500.png`
- **Zrzuty telefonu** (min. 2, są 4) → `zrzuty/`
- **Kategoria** → Produktywność

## 6. Zasady i deklaracje

| Sekcja | Co wpisać |
|---|---|
| Polityka prywatności | publiczny adres pliku `polityka-prywatnosci.html` (patrz `bezpieczenstwo-danych.md`) |
| Bezpieczeństwo danych | odpowiedzi w `bezpieczenstwo-danych.md` — kluczowa: **nie zbieramy danych** |
| Reklamy | Aplikacja nie zawiera reklam |
| Ocena treści | kwestionariusz IARC — brak treści wrażliwych |
| Grupa odbiorców | 13+ |
| **Alarmy i przypomnienia** | deklaracja dla `SCHEDULE_EXACT_ALARM` — uzasadnienie w `opis-sklepowy.md` |

## 7. Wersja testowa przed produkcją

Zanim pójdzie do wszystkich, warto wypuścić na **ścieżkę testów wewnętrznych**:
dodajesz swój adres e-mail jako testera, instalujesz z linku ze Sklepu Play
i sprawdzasz, czy podpisana wersja zachowuje się tak samo jak APK z dysku.

## 8. Kolejne wydania

Przy każdej aktualizacji podnieś w `android/app/build.gradle`:

```
versionCode 2        // liczba całkowita, zawsze większa niż poprzednio
versionName "1.0.1"  // wersja pokazywana użytkownikom
```

`versionCode` musi rosnąć, inaczej Play odrzuci pakiet.
