# Formularz „Bezpieczeństwo danych" w Play Console — gotowe odpowiedzi

Google wymaga wypełnienia tej sekcji przed publikacją. Poniżej odpowiedzi zgodne
ze stanem faktycznym aplikacji (wszystko zostaje na urządzeniu, brak sieci).

## Zbieranie i udostępnianie danych

| Pytanie | Odpowiedź |
|---|---|
| Czy aplikacja zbiera lub udostępnia wymagane typy danych użytkownika? | **Nie** |
| Czy wszystkie dane użytkownika są szyfrowane podczas przesyłania? | Nie dotyczy — aplikacja nie przesyła danych |
| Czy udostępniasz użytkownikom sposób na usunięcie danych? | **Tak** — dane usuwa odinstalowanie aplikacji lub wyczyszczenie danych w ustawieniach systemu |

Skoro na pierwsze pytanie odpowiadasz „Nie", Play Console nie zapyta o kolejne
kategorie danych (lokalizacja, kontakty, pliki itd.).

## Uzasadnienie, gdyby recenzent dopytywał

- Aplikacja nie wykonuje **żadnych** zapytań sieciowych. Cała warstwa webowa jest wbudowana
  w pakiet i ładowana z `https://localhost` przez Capacitora.
- Wydarzenia, kategorie i ustawienia zapisywane są w `localStorage` WebView, czyli
  w prywatnym katalogu aplikacji.
- Import i eksport `.ics` działa wyłącznie na plikach wskazanych przez użytkownika.
- Brak SDK reklamowych, analitycznych i crash-reportingu.

## Pozostałe deklaracje w Play Console

| Sekcja | Odpowiedź |
|---|---|
| Reklamy | Aplikacja nie zawiera reklam |
| Treści dla dzieci | Aplikacja nie jest kierowana do dzieci |
| Kategoria treści | Ocena wiekowa: dla wszystkich (kwestionariusz IARC bez treści wrażliwych) |
| Uprawnienia wrażliwe | Brak (bez lokalizacji, kontaktów, SMS-ów, aparatu) |
| Polityka prywatności | Wymagany publiczny adres URL — patrz niżej |

## Publikacja polityki prywatności

Plik `polityka-prywatnosci.html` musi być dostępny pod publicznym adresem.
Najprostsze darmowe opcje:

1. **GitHub Pages** — wrzuć plik do repozytorium jako `index.html` w gałęzi `gh-pages`
   albo w katalogu `/docs`, włącz Pages w ustawieniach repozytorium.
   Adres wyjdzie w formie `https://<nazwa-uzytkownika>.github.io/<repozytorium>/`.
2. **Dowolny hosting statyczny** (Netlify, Cloudflare Pages) — przeciągnij plik i gotowe.

Ten adres wklejasz w Play Console w sekcji „Polityka prywatności".
