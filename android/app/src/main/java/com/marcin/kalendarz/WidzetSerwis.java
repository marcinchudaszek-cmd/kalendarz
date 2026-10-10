package com.marcin.kalendarz;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/** Dostarcza wiersze listy w widżecie: nagłówki dni i wydarzenia. */
public class WidzetSerwis extends RemoteViewsService {

    static final String PREFS = "widzet_kalendarza";
    static final String KLUCZ_WYDARZENIA = "wydarzenia";

    /** Ile dni naprzód pokazujemy i ile wierszy najwyżej — widżet ma być czytelny, nie kompletny. */
    private static final int DNI = 7;
    private static final int MAX_WIERSZY = 40;

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new Fabryka(getApplicationContext());
    }

    private static final class Wiersz {
        final boolean naglowek;
        final String tekst;
        final String czas;
        final int kolor;
        final String dzien;

        Wiersz(boolean naglowek, String tekst, String czas, int kolor, String dzien) {
            this.naglowek = naglowek;
            this.tekst = tekst;
            this.czas = czas;
            this.kolor = kolor;
            this.dzien = dzien;
        }
    }

    private static final class Fabryka implements RemoteViewsFactory {
        private static final Locale PL = new Locale("pl", "PL");

        private final Context context;
        private final List<Wiersz> wiersze = new ArrayList<>();

        Fabryka(Context context) {
            this.context = context;
        }

        @Override
        public void onCreate() {}

        @Override
        public void onDataSetChanged() {
            wiersze.clear();
            SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            String json = prefs.getString(KLUCZ_WYDARZENIA, "[]");

            long teraz = System.currentTimeMillis();
            Calendar dzisiaj = poczatekDnia(teraz);
            Calendar koniec = (Calendar) dzisiaj.clone();
            koniec.add(Calendar.DAY_OF_YEAR, DNI);

            SimpleDateFormat godzina = new SimpleDateFormat("HH:mm", PL);
            SimpleDateFormat klucz = new SimpleDateFormat("yyyy-MM-dd", PL);
            String ostatniDzien = null;

            try {
                JSONArray lista = new JSONArray(json);
                for (int i = 0; i < lista.length() && wiersze.size() < MAX_WIERSZY; i++) {
                    JSONObject w = lista.getJSONObject(i);
                    long start = w.getLong("s");
                    long kon = w.getLong("e");
                    boolean caly = w.optBoolean("a", false);

                    // Zakończone pomijamy; wydarzenie trwające od wczoraj należy do dzisiaj.
                    if (kon <= teraz && !(caly && kon >= dzisiaj.getTimeInMillis())) continue;
                    if (start >= koniec.getTimeInMillis()) continue;

                    long dzienWydarzenia = Math.max(start, dzisiaj.getTimeInMillis());
                    String kluczDnia = klucz.format(new Date(dzienWydarzenia));
                    if (!kluczDnia.equals(ostatniDzien)) {
                        wiersze.add(new Wiersz(true, etykietaDnia(dzienWydarzenia, dzisiaj), null, 0, kluczDnia));
                        ostatniDzien = kluczDnia;
                    }

                    String czas;
                    if (caly) {
                        czas = "Cały dzień";
                    } else if (start < dzisiaj.getTimeInMillis()) {
                        czas = "do " + godzina.format(new Date(kon));
                    } else {
                        czas = godzina.format(new Date(start));
                    }
                    wiersze.add(new Wiersz(false, w.optString("t", ""), czas, kolor(w.optString("c")), kluczDnia));
                }
            } catch (Exception e) {
                // Uszkodzone dane — pokażemy pusty widżet zamiast błędu.
                wiersze.clear();
            }
        }

        private String etykietaDnia(long czas, Calendar dzisiaj) {
            Calendar dzien = poczatekDnia(czas);
            long roznica = (dzien.getTimeInMillis() - dzisiaj.getTimeInMillis()) / 86_400_000L;
            String data = new SimpleDateFormat("EEEE, d MMMM", PL).format(new Date(czas));
            if (roznica == 0) return "Dziś · " + data;
            if (roznica == 1) return "Jutro · " + data;
            return WidzetKalendarza.wielka(data);
        }

        private static Calendar poczatekDnia(long czas) {
            Calendar c = Calendar.getInstance();
            c.setTimeInMillis(czas);
            c.set(Calendar.HOUR_OF_DAY, 0);
            c.set(Calendar.MINUTE, 0);
            c.set(Calendar.SECOND, 0);
            c.set(Calendar.MILLISECOND, 0);
            return c;
        }

        private static int kolor(String hex) {
            try {
                return Color.parseColor(hex);
            } catch (Exception e) {
                return Color.parseColor("#3B82F6");
            }
        }

        @Override
        public RemoteViews getViewAt(int position) {
            if (position >= wiersze.size()) return null;
            Wiersz w = wiersze.get(position);

            RemoteViews widok;
            if (w.naglowek) {
                widok = new RemoteViews(context.getPackageName(), R.layout.widzet_naglowek_dnia);
                widok.setTextViewText(R.id.widzet_naglowek_tekst, w.tekst);
                widok.setOnClickFillInIntent(R.id.widzet_naglowek_tekst, wypelnienie(w.dzien));
            } else {
                widok = new RemoteViews(context.getPackageName(), R.layout.widzet_wydarzenie);
                widok.setTextViewText(R.id.widzet_wydarzenie_tytul, w.tekst);
                widok.setTextViewText(R.id.widzet_wydarzenie_czas, w.czas);
                widok.setInt(R.id.widzet_wydarzenie_kolor, "setColorFilter", w.kolor);
                widok.setOnClickFillInIntent(R.id.widzet_wydarzenie, wypelnienie(w.dzien));
            }
            return widok;
        }

        private static Intent wypelnienie(String dzien) {
            return new Intent().putExtra(WidzetKalendarza.EXTRA_DZIEN, dzien);
        }

        @Override
        public int getCount() {
            return wiersze.size();
        }

        @Override
        public int getViewTypeCount() {
            return 2;
        }

        @Override
        public RemoteViews getLoadingView() {
            return null;
        }

        @Override
        public long getItemId(int position) {
            return position;
        }

        @Override
        public boolean hasStableIds() {
            return false;
        }

        @Override
        public void onDestroy() {
            wiersze.clear();
        }
    }
}
