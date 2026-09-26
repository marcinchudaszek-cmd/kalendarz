import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.marcin.kalendarz',
  appName: 'Kalendarz',
  webDir: 'dist',
  // Tło WebView przed wczytaniem strony (jasny motyw domyślny)
  backgroundColor: '#ffffff',
  android: {
    // Aplikacja jest w całości lokalna, więc nie potrzebujemy ruchu po HTTP.
    allowMixedContent: false,
  },
};

export default config;
