package com.marcin.kalendarz;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Północ, restart telefonu, aktualizacja aplikacji albo zmiana daty — odświeża ikonę dnia i widżet. */
public class IkonaDniaReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        IkonaDnia.odswiez(context);
        // Nowy dzień: widżet przesuwa nagłówek i odrzuca wczorajsze wydarzenia.
        WidzetKalendarza.odswiezWszystkie(context);
    }
}
