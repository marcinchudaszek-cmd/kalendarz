package com.marcin.kalendarz;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Widżet na ekran główny: dzisiejsza data i lista najbliższych wydarzeń.
 *
 * Wydarzenia przysyła aplikacja (WidzetPlugin) — widżet nie ma dostępu do danych WebView.
 * Listę buduje WidzetSerwis, tutaj tylko nagłówek i podpięcie kliknięć.
 */
public class WidzetKalendarza extends AppWidgetProvider {

    /** Klucz w Intent z akcją dla aplikacji: "dzis", "nowe" albo "dzien". */
    public static final String EXTRA_AKCJA = "kalendarz_akcja";
    /** Dzień do otwarcia (yyyy-MM-dd) przy akcji "dzien". */
    public static final String EXTRA_DZIEN = "kalendarz_dzien";

    private static final Locale PL = new Locale("pl", "PL");

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            manager.updateAppWidget(id, zbudujWidok(context, id));
        }
        manager.notifyAppWidgetViewDataChanged(ids, R.id.widzet_lista);
    }

    /** Wywoływane po zmianie danych w aplikacji i o północy. */
    public static void odswiezWszystkie(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, WidzetKalendarza.class));
        if (ids.length == 0) return;
        for (int id : ids) {
            manager.updateAppWidget(id, zbudujWidok(context, id));
        }
        manager.notifyAppWidgetViewDataChanged(ids, R.id.widzet_lista);
    }

    private static RemoteViews zbudujWidok(Context context, int widgetId) {
        RemoteViews widok = new RemoteViews(context.getPackageName(), R.layout.widzet_kalendarza);

        Date teraz = new Date();
        widok.setTextViewText(R.id.widzet_dzien_liczba, new SimpleDateFormat("d", PL).format(teraz));
        String dzienTygodnia = new SimpleDateFormat("EEEE", PL).format(teraz);
        widok.setTextViewText(R.id.widzet_dzien_tygodnia, wielka(dzienTygodnia));
        widok.setTextViewText(R.id.widzet_miesiac, new SimpleDateFormat("LLLL yyyy", PL).format(teraz));

        // Lista — dane dostarcza WidzetSerwis. Unikalny URI, żeby system nie pomylił fabryk różnych widżetów.
        Intent serwis = new Intent(context, WidzetSerwis.class);
        serwis.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        serwis.setData(Uri.parse(serwis.toUri(Intent.URI_INTENT_SCHEME)));
        widok.setRemoteAdapter(R.id.widzet_lista, serwis);
        widok.setEmptyView(R.id.widzet_lista, R.id.widzet_pusto);

        widok.setOnClickPendingIntent(R.id.widzet_naglowek, otworz(context, "dzis", 1));
        widok.setOnClickPendingIntent(R.id.widzet_pusto, otworz(context, "dzis", 2));
        widok.setOnClickPendingIntent(R.id.widzet_dodaj, otworz(context, "nowe", 3));

        // Szablon dla wierszy listy — każdy wiersz dokłada swój dzień (fillInIntent).
        Intent szablon = new Intent(context, MainActivity.class)
            .setAction("com.marcin.kalendarz.WIDZET_DZIEN")
            .putExtra(EXTRA_AKCJA, "dzien")
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        widok.setPendingIntentTemplate(
            R.id.widzet_lista,
            PendingIntent.getActivity(
                context,
                4,
                szablon,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
            )
        );
        return widok;
    }

    private static PendingIntent otworz(Context context, String akcja, int requestCode) {
        Intent intent = new Intent(context, MainActivity.class)
            // Różne akcje — inaczej system uzna intencje za identyczne i podmieni dodatki.
            .setAction("com.marcin.kalendarz.WIDZET_" + akcja)
            .putExtra(EXTRA_AKCJA, akcja)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    static String wielka(String s) {
        return s.isEmpty() ? s : s.substring(0, 1).toUpperCase(PL) + s.substring(1);
    }
}
