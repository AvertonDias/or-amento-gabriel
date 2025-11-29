
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.meuorcamento.app',
  appName: 'Meu Orçamento',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Contacts: {
      useLegacyIntent: false
    }
  },
  android: {
    permissions: [
      {
        alias: 'contacts',
        name: 'android.permission.READ_CONTACTS'
      }
    ]
  }
};

export default config;
