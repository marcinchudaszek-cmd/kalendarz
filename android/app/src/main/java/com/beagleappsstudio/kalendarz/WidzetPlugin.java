package com.beagleappsstudio.kalendarz;

import android.content.Context;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Most między aplikacją (WebView) a widżetem: aplikacja przysyła listę wydarzeń,
 * a kliknięcia w widżecie trafiają z powrotem do aplikacji jako zdarzenie „akcja”.
 */
@CapacitorPlugin(name = "KalendarzWidzet")
public class WidzetPlugin extends Plugin {

    @PluginMethod
    public void zapiszWydarzenia(PluginCall call) {
        String json = call.getString("json", "[]");
        Context context = getContext();
        context.getSharedPreferences(WidzetSerwis.PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(WidzetSerwis.KLUCZ_WYDARZENIA, json)
            .apply();
        WidzetKalendarza.odswiezWszystkie(context);
        call.resolve();
    }

    /**
     * Przekazuje aplikacji kliknięcie z widżetu. Zdarzenie czeka, aż JS doda słuchacza —
     * przy zimnym starcie aplikacja nie jest jeszcze gotowa w chwili kliknięcia.
     */
    void przekazAkcje(String akcja, String dzien) {
        JSObject dane = new JSObject();
        dane.put("akcja", akcja);
        if (dzien != null) dane.put("dzien", dzien);
        notifyListeners("akcja", dane, true);
    }
}
