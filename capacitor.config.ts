
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
    },
    Filesystem: {
      android: {
        permissions: [
            {
                alias: 'publicStorage',
                name: 'android.permission.WRITE_EXTERNAL_STORAGE'
            }
        ]
      }
    }
  }
};

export default config;
