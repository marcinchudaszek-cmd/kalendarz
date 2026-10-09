package com.marcin.kalendarz;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Północ, restart telefonu, aktualizacja aplikacji albo zmiana daty — odświeża ikonę dnia. */
public class IkonaDniaReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        IkonaDnia.odswiez(context);
    }
}
