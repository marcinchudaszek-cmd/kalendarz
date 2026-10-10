package com.beagleappsstudio.kalendarz;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.util.Log;

import java.util.Calendar;

/**
 * Ikona w launcherze pokazuje dzisiejszy dzień tygodnia.
 *
 * Android nie pozwala podmienić ikony w locie, więc w manifeście jest siedem aliasów
 * MainActivity — każdy z inną ikoną — i włączony jest zawsze tylko alias bieżącego dnia.
 * Przełączamy przy każdym otwarciu aplikacji i alarmem tuż po północy.
 */
public final class IkonaDnia {

    private static final String TAG = "IkonaDnia";

    /** Indeks = Calendar.DAY_OF_WEEK - 1, czyli od niedzieli. */
    private static final String[] ALIASY = {
        ".IkonaNd", ".IkonaPn", ".IkonaWt", ".IkonaSr", ".IkonaCz", ".IkonaPt", ".IkonaSo",
    };

    private IkonaDnia() {}

    /** Włącza alias dzisiejszego dnia, wyłącza pozostałe i planuje zmianę o północy. */
    public static synchronized void odswiez(Context context) {
        Context app = context.getApplicationContext();
        try {
            ustawAlias(app, Calendar.getInstance().get(Calendar.DAY_OF_WEEK) - 1);
        } catch (RuntimeException e) {
            // Ikona to dodatek — nie może wywrócić aplikacji.
            Log.w(TAG, "Nie udało się zmienić ikony", e);
        }
        zaplanujNaPolnoc(app);
    }

    private static void ustawAlias(Context context, int dzien) {
        PackageManager pm = context.getPackageManager();
        String pakiet = context.getPackageName();

        // Najpierw włączamy nowy alias, dopiero potem gasimy stare — launcher ani przez
        // moment nie widzi aplikacji bez ikony, więc nie usuwa jej ze strony głównej.
        ustaw(pm, new ComponentName(pakiet, pakiet + ALIASY[dzien]), true);
        for (int i = 0; i < ALIASY.length; i++) {
            if (i != dzien) ustaw(pm, new ComponentName(pakiet, pakiet + ALIASY[i]), false);
        }
    }

    private static void ustaw(PackageManager pm, ComponentName alias, boolean wlaczony) {
        int stan = pm.getComponentEnabledSetting(alias);
        boolean terazWlaczony = stan == PackageManager.COMPONENT_ENABLED_STATE_ENABLED
            || (stan == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT && domyslnieWlaczony(alias));
        if (terazWlaczony == wlaczony) return;

        pm.setComponentEnabledSetting(
            alias,
            wlaczony
                ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                : PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP
        );
    }

    /** W manifeście domyślnie włączony jest tylko poniedziałek. */
    private static boolean domyslnieWlaczony(ComponentName alias) {
        return alias.getClassName().endsWith(".IkonaPn");
    }

    private static void zaplanujNaPolnoc(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        Calendar polnoc = Calendar.getInstance();
        polnoc.add(Calendar.DAY_OF_YEAR, 1);
        polnoc.set(Calendar.HOUR_OF_DAY, 0);
        polnoc.set(Calendar.MINUTE, 0);
        polnoc.set(Calendar.SECOND, 30);
        polnoc.set(Calendar.MILLISECOND, 0);

        PendingIntent pi = PendingIntent.getBroadcast(
            context,
            0,
            new Intent(context, IkonaDniaReceiver.class),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        // Alarm niedokładny — nie wymaga zgody na dokładne alarmy. W głębokim uśpieniu
        // system może go chwilę opóźnić; wtedy ikona zmieni się najpóźniej przy otwarciu.
        am.setAndAllowWhileIdle(AlarmManager.RTC, polnoc.getTimeInMillis(), pi);
    }
}
