package com.beagleappsstudio.kalendarz;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;

/**
 * Ustawienia systemowe związane z przypomnieniami.
 *
 * Od Androida 8 dźwięk powiadomienia należy do kanału i nie da się go zmienić po utworzeniu kanału.
 * Wtyczka powiadomień Capacitora umie podać tylko dźwięk z res/raw, więc kanał z dźwiękiem wybranym
 * przez użytkownika tworzymy tutaj: plik zapisujemy w katalogu aplikacji, udostępniamy go systemowi
 * przez FileProvider i zakładamy nowy kanał (z nowym identyfikatorem przy każdej zmianie pliku).
 */
@CapacitorPlugin(name = "KalendarzSystem")
public class SystemPlugin extends Plugin {

    private static final String PREFIKS_KANALU = "przypomnienia-wlasny-";
    private static final String KATALOG = "dzwieki";

    @PluginMethod
    public void otworzUstawieniaDzwieku(PluginCall call) {
        String pakiet = getContext().getPackageName();
        Intent intent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            intent = new Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS)
                .putExtra(Settings.EXTRA_APP_PACKAGE, pakiet)
                .putExtra(Settings.EXTRA_CHANNEL_ID, call.getString("kanal", "przypomnienia"));
        } else {
            intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                .setData(Uri.parse("package:" + pakiet));
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Nie udało się otworzyć ustawień powiadomień", e);
        }
    }

    /**
     * Zapisuje dźwięk (WAV w base64) i tworzy dla niego kanał przypomnień.
     * Zwraca identyfikator kanału, którym aplikacja ma planować powiadomienia.
     */
    @PluginMethod
    public void ustawWlasnyDzwiek(PluginCall call) {
        String dane = call.getString("dane");
        if (dane == null || dane.isEmpty()) {
            call.reject("Brak danych dźwięku");
            return;
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            // Bez kanałów nie da się podać własnego pliku — zostaje wbudowany dźwięk.
            call.reject("Android starszy niż 8 nie obsługuje własnych dźwięków powiadomień");
            return;
        }
        Context ctx = getContext();
        try {
            byte[] bajty = Base64.decode(dane, Base64.DEFAULT);
            String znacznik = String.valueOf(System.currentTimeMillis());
            File katalog = new File(ctx.getFilesDir(), KATALOG);
            if (!katalog.exists() && !katalog.mkdirs()) throw new Exception("Nie można utworzyć katalogu");
            File plik = new File(katalog, "przypomnienie-" + znacznik + ".wav");
            try (FileOutputStream out = new FileOutputStream(plik)) {
                out.write(bajty);
            }

            Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", plik);
            // Dźwięk odtwarza interfejs systemu, nie nasza aplikacja — musi mieć prawo odczytu.
            ctx.grantUriPermission("com.android.systemui", uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            ctx.grantUriPermission("android", uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);

            String id = PREFIKS_KANALU + znacznik;
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel kanal = new NotificationChannel(
                id, "Przypomnienia o wydarzeniach", NotificationManager.IMPORTANCE_HIGH);
            kanal.setDescription("Powiadomienia o zbliżających się wydarzeniach — dźwięk: " +
                call.getString("nazwa", "własny plik"));
            kanal.enableVibration(true);
            kanal.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            kanal.setSound(uri, new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build());
            nm.createNotificationChannel(kanal);

            usunStareKanaly(nm, id);
            usunStarePliki(katalog, plik);

            JSObject wynik = new JSObject();
            wynik.put("kanal", id);
            call.resolve(wynik);
        } catch (Exception e) {
            call.reject("Nie udało się ustawić dźwięku przypomnień", e);
        }
    }

    /** Powrót do wbudowanego dźwięku — sprzątamy własny kanał i plik. */
    @PluginMethod
    public void usunWlasnyDzwiek(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            usunStareKanaly(nm, null);
        }
        usunStarePliki(new File(getContext().getFilesDir(), KATALOG), null);
        call.resolve();
    }

    private void usunStareKanaly(NotificationManager nm, String zostaw) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        for (NotificationChannel k : nm.getNotificationChannels()) {
            String id = k.getId();
            if (id.startsWith(PREFIKS_KANALU) && !id.equals(zostaw)) nm.deleteNotificationChannel(id);
        }
    }

    private void usunStarePliki(File katalog, File zostaw) {
        File[] pliki = katalog.listFiles();
        if (pliki == null) return;
        for (File f : pliki) {
            if (zostaw == null || !f.equals(zostaw)) //noinspection ResultOfMethodCallIgnored
                f.delete();
        }
    }
}
