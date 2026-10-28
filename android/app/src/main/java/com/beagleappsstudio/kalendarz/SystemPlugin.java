package com.beagleappsstudio.kalendarz;

import android.content.Intent;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Skróty do ustawień systemowych, których aplikacja nie może zmienić sama.
 *
 * Dźwięk powiadomień przy zamkniętej aplikacji należy od Androida 8 do kanału powiadomień —
 * użytkownik wybiera go w systemie spośród dzwonków i muzyki z telefonu.
 */
@CapacitorPlugin(name = "KalendarzSystem")
public class SystemPlugin extends Plugin {

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
                .setData(android.net.Uri.parse("package:" + pakiet));
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Nie udało się otworzyć ustawień powiadomień", e);
        }
    }
}
