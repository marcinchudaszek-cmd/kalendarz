package com.marcin.kalendarz;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onResume() {
        super.onResume();
        // Po otwarciu ikona ma pokazywać dzisiejszy dzień, nawet jeśli alarm o północy się spóźnił.
        new Thread(() -> IkonaDnia.odswiez(this)).start();
    }
}
