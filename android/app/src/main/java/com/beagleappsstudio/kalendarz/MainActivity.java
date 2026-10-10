package com.beagleappsstudio.kalendarz;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Własne wtyczki rejestrujemy przed startem mostu Capacitora.
        registerPlugin(WidzetPlugin.class);
        super.onCreate(savedInstanceState);
        obsluzWidzet(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        obsluzWidzet(intent);
    }

    @Override
    public void onResume() {
        super.onResume();
        // Po otwarciu ikona ma pokazywać dzisiejszy dzień, nawet jeśli alarm o północy się spóźnił.
        new Thread(() -> IkonaDnia.odswiez(this)).start();
    }

    /** Kliknięcie w widżet: przekazujemy aplikacji, co ma pokazać. */
    private void obsluzWidzet(Intent intent) {
        if (intent == null || bridge == null) return;
        String akcja = intent.getStringExtra(WidzetKalendarza.EXTRA_AKCJA);
        if (akcja == null) return;
        String dzien = intent.getStringExtra(WidzetKalendarza.EXTRA_DZIEN);
        // Jednorazowo — obrót ekranu nie może powtórzyć akcji.
        intent.removeExtra(WidzetKalendarza.EXTRA_AKCJA);

        PluginHandle uchwyt = bridge.getPlugin("KalendarzWidzet");
        if (uchwyt != null && uchwyt.getInstance() instanceof WidzetPlugin) {
            ((WidzetPlugin) uchwyt.getInstance()).przekazAkcje(akcja, dzien);
        }
    }
}
